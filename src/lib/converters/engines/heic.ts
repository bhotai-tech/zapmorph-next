import {
  ConversionError,
  mapFiles,
  numberOption,
  withExtension,
  withTimeout,
  type ConvertInput,
  type OutputFile,
} from './shared';

/** Per-file ceiling; decoding a 48 MP iPhone photo takes a few seconds. */
const DECODE_TIMEOUT_MS = 90_000;

/**
 * HEIC/HEIF → JPG/PNG via libheif compiled to WebAssembly. Uses heic-to's CSP
 * build: the default build (and heic2any) generate code with `new Function`,
 * which our Content-Security-Policy blocks, leaving the conversion hanging.
 */
export async function convertHeic(
  input: ConvertInput,
  type: 'image/jpeg' | 'image/png',
): Promise<OutputFile[]> {
  const { heicTo } = await import('heic-to/csp');
  const extension = type === 'image/jpeg' ? 'jpg' : 'png';
  const quality = numberOption(input.options, 'quality', 0.92);

  return mapFiles(input, async (file) => {
    let blob: Blob;
    try {
      blob = await withTimeout(
        heicTo({ blob: file, type, quality: type === 'image/jpeg' ? quality : undefined }),
        DECODE_TIMEOUT_MS,
        `“${file.name}” took too long to decode. Try a smaller photo.`,
      );
    } catch (err) {
      if (err instanceof ConversionError) throw err;
      throw new ConversionError(`“${file.name}” couldn’t be read as a HEIC photo.`);
    }
    return [{ name: withExtension(file.name, extension), blob }];
  });
}
