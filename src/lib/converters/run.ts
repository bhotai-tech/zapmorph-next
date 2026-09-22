import { ConversionError, type ConvertInput, type OutputFile } from './engines/shared';

/**
 * Slug → engine. Engines are dynamically imported, so a visitor converting
 * PNG to JPG never downloads pdf.js, ExcelJS or ffmpeg.
 */

type Runner = (input: ConvertInput) => Promise<OutputFile[]>;

const image = () => import('./engines/image');
const heic = () => import('./engines/heic');
const ico = () => import('./engines/ico');
const pdf = () => import('./engines/pdf');
const data = () => import('./engines/data');
const sheet = () => import('./engines/sheet');
const media = () => import('./engines/media');

export const RUNNERS: Record<string, Runner> = {
  'png-to-jpg': async (input) => (await image()).convertImages(input, 'image/jpeg'),
  'jpg-to-png': async (input) => (await image()).convertImages(input, 'image/png'),
  'webp-to-jpg': async (input) => (await image()).convertImages(input, 'image/jpeg'),
  'webp-to-png': async (input) => (await image()).convertImages(input, 'image/png'),
  'jpg-to-webp': async (input) => (await image()).convertImages(input, 'image/webp'),
  'png-to-webp': async (input) => (await image()).convertImages(input, 'image/webp'),
  'avif-to-jpg': async (input) => (await image()).convertImages(input, 'image/jpeg'),
  'heic-to-jpg': async (input) => (await heic()).convertHeic(input, 'image/jpeg'),
  'heic-to-png': async (input) => (await heic()).convertHeic(input, 'image/png'),
  'avif-to-png': async (input) => (await image()).convertImages(input, 'image/png'),
  'bmp-to-jpg': async (input) => (await image()).convertImages(input, 'image/jpeg'),
  'gif-to-png': async (input) => (await image()).convertImages(input, 'image/png'),
  'svg-to-png': async (input) => (await image()).svgToImage(input, 'image/png'),
  'svg-to-jpg': async (input) => (await image()).svgToImage(input, 'image/jpeg'),
  'png-to-ico': async (input) => (await ico()).imagesToIco(input),

  'jpg-to-pdf': async (input) => (await pdf()).imagesToPdf(input),
  'png-to-pdf': async (input) => (await pdf()).imagesToPdf(input),
  'heic-to-pdf': async (input) => (await pdf()).heicToPdf(input),
  'txt-to-pdf': async (input) => (await pdf()).textToPdf(input),
  'pdf-to-jpg': async (input) => (await pdf()).pdfToImages(input, 'image/jpeg'),
  'pdf-to-png': async (input) => (await pdf()).pdfToImages(input, 'image/png'),
  'pdf-to-text': async (input) => (await pdf()).pdfToText(input),
  'merge-pdf': async (input) => (await pdf()).mergePdfs(input),
  'split-pdf': async (input) => (await pdf()).splitPdf(input),

  'csv-to-json': async (input) => (await data()).csvToJson(input),
  'json-to-csv': async (input) => (await data()).jsonToCsv(input),
  'json-to-yaml': async (input) => (await data()).jsonToYaml(input),
  'yaml-to-json': async (input) => (await data()).yamlToJson(input),
  'xml-to-json': async (input) => (await data()).xmlToJson(input),
  'json-to-xml': async (input) => (await data()).jsonToXml(input),
  'xml-to-csv': async (input) => (await data()).xmlToCsv(input),
  'csv-to-xml': async (input) => (await data()).csvToXml(input),
  'markdown-to-html': async (input) => (await data()).markdownToHtml(input),
  'html-to-markdown': async (input) => (await data()).htmlToMarkdown(input),
  'csv-to-excel': async (input) => (await sheet()).csvToExcel(input),
  'json-to-excel': async (input) => (await sheet()).jsonToExcel(input),
  'excel-to-csv': async (input) => (await sheet()).excelToCsv(input),
  'excel-to-json': async (input) => (await sheet()).excelToJson(input),

  'mp4-to-mp3': async (input) => (await media()).toMp3(input),
  'wav-to-mp3': async (input) => (await media()).toMp3(input),
  'm4a-to-mp3': async (input) => (await media()).toMp3(input),
  'flac-to-mp3': async (input) => (await media()).toMp3(input),
  'ogg-to-mp3': async (input) => (await media()).toMp3(input),
  'mp3-to-wav': async (input) => (await media()).toWav(input),
  'video-to-gif': async (input) => (await media()).toGif(input),
  'mov-to-mp4': async (input) => (await media()).toMp4(input),
  'webm-to-mp4': async (input) => (await media()).toMp4(input),
  'mkv-to-mp4': async (input) => (await media()).toMp4(input),
  'avi-to-mp4': async (input) => (await media()).toMp4(input),
  'gif-to-mp4': async (input) => (await media()).toMp4(input),
};

export async function runConverter(slug: string, input: ConvertInput): Promise<OutputFile[]> {
  const runner = RUNNERS[slug];
  if (!runner) throw new ConversionError('This converter is not available.');
  return runner(input);
}

export { ConversionError };
export type { ConvertInput, OutputFile };
