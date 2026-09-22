import type { FFmpeg } from '@ffmpeg/ffmpeg';
import {
  ConversionError,
  extensionOf,
  mapFiles,
  numberOption,
  withExtension,
  type ConvertInput,
  type OutputFile,
} from './shared';

/**
 * Audio/video via ffmpeg.wasm (single-thread core — no SharedArrayBuffer or
 * cross-origin isolation needed). Class, worker and core are served from
 * public/vendor (see scripts/copy-assets.mjs) and loaded at runtime, outside
 * the bundler, so only visitors who run a media conversion download the 32 MB core.
 */

const VENDOR = '/vendor/ffmpeg';

let loading: Promise<FFmpeg> | null = null;

function getFFmpeg(): Promise<FFmpeg> {
  loading ??= (async () => {
    const moduleUrl = `${window.location.origin}${VENDOR}/esm/index.js`;
    const { FFmpeg: FFmpegClass } = (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ moduleUrl
    )) as typeof import('@ffmpeg/ffmpeg');
    const ffmpeg = new FFmpegClass();
    await ffmpeg.load({
      coreURL: `${window.location.origin}${VENDOR}/core/ffmpeg-core.js`,
      wasmURL: `${window.location.origin}${VENDOR}/core/ffmpeg-core.wasm`,
    });
    return ffmpeg;
  })().catch((err) => {
    loading = null;
    throw new ConversionError(
      `The audio/video engine couldn’t load${err instanceof Error ? ` (${err.message})` : ''}. Check your connection and try again.`,
    );
  });
  return loading;
}

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav']);

type ArgsBuilder = (inputName: string, outputName: string) => string[];

type StreamCodecs = { video?: string; audio?: string };

/** A lossless stream copy, tried first when the source's codecs allow it. */
type Remux = { accepts: (codecs: StreamCodecs) => boolean; args: ArgsBuilder };

/** First video and audio codec names, or {} if the file can't be probed. */
async function probeCodecs(ffmpeg: FFmpeg, inputName: string): Promise<StreamCodecs> {
  const reportName = `${inputName}.probe.txt`;
  try {
    // ffmpeg.wasm's ffprobe returns -1 even on success, so the report file is the only signal.
    await ffmpeg.ffprobe([
      '-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'csv=p=0', inputName, '-o', reportName,
    ]);
    const report = await ffmpeg.readFile(reportName, 'utf8');
    const codecs: StreamCodecs = {};
    for (const line of String(report).split('\n')) {
      const fields = line.trim().split(',');
      const codec = fields.find((field) => field !== 'video' && field !== 'audio');
      if (!codec) continue;
      if (fields.includes('video')) codecs.video ??= codec;
      if (fields.includes('audio')) codecs.audio ??= codec;
    }
    return codecs;
  } catch {
    return {};
  } finally {
    await ffmpeg.deleteFile(reportName).catch(() => undefined);
  }
}

async function transcode(
  file: File,
  outputExtension: string,
  mimeType: string,
  report: (ratio: number) => void,
  attempts: ArgsBuilder[],
  remux?: Remux,
): Promise<OutputFile> {
  // Loading the engine is roughly the first 10% of a first run.
  report(0.02);
  const ffmpeg = await getFFmpeg();
  report(0.1);

  const id = crypto.randomUUID();
  const inputName = `in-${id}.${extensionOf(file.name) || 'bin'}`;
  const outputName = `out-${id}.${outputExtension}`;
  // Multi-pass filters (e.g. the GIF palette) restart ffmpeg's progress; never report going backwards.
  let reported = 0;
  const onProgress = ({ progress }: { progress: number }) => {
    if (!Number.isFinite(progress)) return;
    reported = Math.max(reported, Math.min(Math.max(progress, 0), 1));
    report(0.1 + reported * 0.9);
  };

  ffmpeg.on('progress', onProgress);
  try {
    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
    if (remux?.accepts(await probeCodecs(ffmpeg, inputName))) attempts = [remux.args, ...attempts];
    let exitCode = -1;
    for (const buildArgs of attempts) {
      // A failed attempt can leave a partial output, which would block the next one.
      await ffmpeg.deleteFile(outputName).catch(() => undefined);
      exitCode = await ffmpeg.exec(buildArgs(inputName, outputName));
      if (exitCode === 0) break;
    }
    if (exitCode !== 0) {
      throw new ConversionError(
        `“${file.name}” couldn’t be converted. It may be corrupted or use an unsupported codec.`,
      );
    }
    const data = await ffmpeg.readFile(outputName);
    if (typeof data === 'string' || data.length === 0) {
      throw new ConversionError(`“${file.name}” produced an empty file — it may have no ${AUDIO_EXTENSIONS.has(outputExtension) ? 'audio' : 'video'} track.`);
    }
    return {
      name: withExtension(file.name, outputExtension),
      blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeType }),
    };
  } finally {
    ffmpeg.off('progress', onProgress);
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
  }
}

export function toMp3(input: ConvertInput): Promise<OutputFile[]> {
  const bitrate = numberOption(input.options, 'bitrate', 192);
  return mapFiles(input, async (file, report) => [
    await transcode(file, 'mp3', 'audio/mpeg', report, [
      (i, o) => ['-i', i, '-vn', '-map', '0:a:0', '-c:a', 'libmp3lame', '-b:a', `${bitrate}k`, o],
    ]),
  ]);
}

export function toWav(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file, report) => [
    await transcode(file, 'wav', 'audio/wav', report, [
      (i, o) => ['-i', i, '-vn', '-map', '0:a:0', '-c:a', 'pcm_s16le', o],
    ]),
  ]);
}

export function toMp4(input: ConvertInput): Promise<OutputFile[]> {
  const crf = numberOption(input.options, 'crf', 23);
  return mapFiles(input, async (file, report) => [
    await transcode(
      file,
      'mp4',
      'video/mp4',
      report,
      [
        (i, o) => [
          '-i', i,
          '-map', '0:v:0', '-map', '0:a:0?',
          // H.264 in yuv420p needs even dimensions; GIFs and some recordings have odd ones.
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '160k',
          '-movflags', '+faststart',
          o,
        ],
      ],
      // Fast path: H.264 with AAC/MP3 (most iPhone MOVs and many MKVs) is repackaged losslessly.
      // Other codecs (VP9, HEVC, Opus…) are re-encoded so the MP4 plays on every device.
      {
        accepts: ({ video, audio }) => video === 'h264' && (!audio || audio === 'aac' || audio === 'mp3'),
        args: (i, o) => ['-i', i, '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', o],
      },
    ),
  ]);
}

export function toGif(input: ConvertInput): Promise<OutputFile[]> {
  const fps = numberOption(input.options, 'fps', 12);
  const width = numberOption(input.options, 'width', 480);
  const duration = numberOption(input.options, 'duration', 10);
  return mapFiles(input, async (file, report) => [
    await transcode(file, 'gif', 'image/gif', report, [
      (i, o) => [
        '-t', String(duration),
        '-i', i,
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`,
        '-loop', '0',
        o,
      ],
    ]),
  ]);
}
