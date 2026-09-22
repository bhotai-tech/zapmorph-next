import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PDFDocument, PDFImage } from 'pdf-lib';
import { canvasToBlob, loadImage, renderImage } from './image';
import {
  ConversionError,
  baseName,
  bytesToBlob,
  mapFiles,
  numberOption,
  textBlob,
  withExtension,
  type ConvertInput,
  type OutputFile,
} from './shared';

const PDFJS_ASSETS = '/vendor/pdfjs';
const MAX_RENDER_PIXELS = 8000 * 8000;

// ── pdf.js (reading/rendering) ───────────────────────────────────────────────

/** Opens a PDF; `close` frees the worker-side document (call it in `finally`). */
async function openWithPdfJs(file: File): Promise<{ doc: PDFDocumentProxy; close: () => Promise<void> }> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_ASSETS}/pdf.worker.min.mjs`;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${PDFJS_ASSETS}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ASSETS}/standard_fonts/`,
    wasmUrl: `${PDFJS_ASSETS}/wasm/`,
  });
  try {
    return { doc: await task.promise, close: () => task.destroy() };
  } catch (err) {
    await task.destroy().catch(() => undefined);
    if ((err as { name?: string } | null)?.name === 'PasswordException') {
      throw new ConversionError(`“${file.name}” is password-protected. Remove the password and try again.`);
    }
    throw new ConversionError(`“${file.name}” isn’t a valid PDF file.`);
  }
}

export function pdfToImages(input: ConvertInput, type: 'image/jpeg' | 'image/png'): Promise<OutputFile[]> {
  const requestedScale = numberOption(input.options, 'scale', 2);
  const quality = numberOption(input.options, 'quality', 0.92);
  const extension = type === 'image/jpeg' ? 'jpg' : 'png';

  return mapFiles(input, async (file, report) => {
    const { doc, close } = await openWithPdfJs(file);
    const outputs: OutputFile[] = [];
    try {
      const digits = String(doc.numPages).length;
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        // Oversized pages (posters, CAD sheets) are scaled down to what a canvas can hold.
        const maxScale = Math.sqrt(MAX_RENDER_PIXELS / (base.width * base.height));
        const viewport = page.getViewport({ scale: Math.min(requestedScale, maxScale) });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, viewport, background: '#ffffff' }).promise;

        outputs.push({
          name: `${baseName(file.name)}-page-${String(pageNumber).padStart(digits, '0')}.${extension}`,
          blob: await canvasToBlob(canvas, type, type === 'image/jpeg' ? quality : undefined),
        });
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
        report(pageNumber / doc.numPages);
      }
    } finally {
      await close();
    }
    return outputs;
  });
}

export function pdfToText(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file, report) => {
    const { doc, close } = await openWithPdfJs(file);
    const pages: string[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const content = await page.getTextContent();
        let text = '';
        for (const item of content.items) {
          if ('str' in item) {
            text += item.str;
            if (item.hasEOL) text += '\n';
          }
        }
        pages.push(text.trim());
        page.cleanup();
        report(pageNumber / doc.numPages);
      }
    } finally {
      await close();
    }
    if (pages.every((page) => page.length === 0)) {
      throw new ConversionError(
        `No selectable text found in “${file.name}”. It may be a scanned document, which needs OCR.`,
      );
    }
    return [{ name: withExtension(file.name, 'txt'), blob: textBlob(pages.join('\n\n'), 'text/plain') }];
  });
}

// ── pdf-lib (creating/editing) ───────────────────────────────────────────────

const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

const MARGINS: Record<string, number> = { none: 0, small: 18, large: 36 };

async function loadWithPdfLib(file: File): Promise<PDFDocument> {
  const { PDFDocument } = await import('pdf-lib');
  try {
    return await PDFDocument.load(await file.arrayBuffer());
  } catch (err) {
    if (err instanceof Error && /encrypt/i.test(err.message)) {
      throw new ConversionError(`“${file.name}” is password-protected. Remove the password and try again.`);
    }
    throw new ConversionError(`“${file.name}” isn’t a valid PDF file.`);
  }
}

function sniffImageType(bytes: Uint8Array): 'jpeg' | 'png' | 'other' {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  return 'other';
}

async function embedImage(doc: PDFDocument, file: File): Promise<PDFImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImageType(bytes);
  try {
    // Embedding the original bytes keeps full quality and small output.
    if (kind === 'jpeg') return await doc.embedJpg(bytes);
    if (kind === 'png') return await doc.embedPng(bytes);
  } catch {
    // Fall through: re-encode formats pdf-lib can't parse (e.g. CMYK JPEG, 16-bit PNG).
  }
  const image = await loadImage(file);
  try {
    const png = await renderImage(image, 'image/png');
    return await doc.embedPng(new Uint8Array(await png.arrayBuffer()));
  } finally {
    image.release();
  }
}

export async function imagesToPdf(input: ConvertInput): Promise<OutputFile[]> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const pageSize = input.options.pageSize ?? 'a4';
  const margin = MARGINS[input.options.margin ?? 'small'] ?? 18;

  for (const [index, file] of input.files.entries()) {
    input.onProgress(index / input.files.length);
    const image = await embedImage(doc, file);

    if (pageSize === 'fit') {
      const page = doc.addPage([image.width + margin * 2, image.height + margin * 2]);
      page.drawImage(image, { x: margin, y: margin, width: image.width, height: image.height });
      continue;
    }

    const [shortSide, longSide] = PAGE_SIZES[pageSize] ?? PAGE_SIZES.a4;
    const landscape = image.width > image.height;
    const [pageWidth, pageHeight] = landscape ? [longSide, shortSide] : [shortSide, longSide];
    const scale = Math.min((pageWidth - margin * 2) / image.width, (pageHeight - margin * 2) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
  }

  const bytes = await doc.save();
  input.onProgress(1);
  const [first] = input.files;
  return [
    {
      name: input.files.length === 1 ? withExtension(first.name, 'pdf') : `${baseName(first.name)}-combined.pdf`,
      blob: bytesToBlob(bytes, 'application/pdf'),
    },
  ];
}

export async function mergePdfs(input: ConvertInput): Promise<OutputFile[]> {
  if (input.files.length < 2) throw new ConversionError('Add at least two PDF files to merge.');
  const { PDFDocument } = await import('pdf-lib');
  const merged = await PDFDocument.create();

  for (const [index, file] of input.files.entries()) {
    input.onProgress(index / input.files.length);
    const source = await loadWithPdfLib(file);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  const bytes = await merged.save();
  input.onProgress(1);
  return [{ name: 'merged.pdf', blob: bytesToBlob(bytes, 'application/pdf') }];
}

export async function splitPdf(input: ConvertInput): Promise<OutputFile[]> {
  const [file] = input.files;
  if (!file) throw new ConversionError('Choose a PDF to split.');
  const perFile = Math.max(1, Math.floor(numberOption(input.options, 'pagesPerFile', 1)));
  const { PDFDocument } = await import('pdf-lib');
  const source = await loadWithPdfLib(file);
  const pageCount = source.getPageCount();
  if (pageCount < 2) throw new ConversionError(`“${file.name}” has only one page.`);

  const outputs: OutputFile[] = [];
  const digits = String(pageCount).length;
  const pad = (n: number) => String(n).padStart(digits, '0');

  for (let start = 0; start < pageCount; start += perFile) {
    const end = Math.min(start + perFile, pageCount);
    const part = await PDFDocument.create();
    const pages = await part.copyPages(
      source,
      Array.from({ length: end - start }, (_, offset) => start + offset),
    );
    pages.forEach((page) => part.addPage(page));
    outputs.push({
      name:
        end - start === 1
          ? `${baseName(file.name)}-page-${pad(start + 1)}.pdf`
          : `${baseName(file.name)}-pages-${pad(start + 1)}-${pad(end)}.pdf`,
      blob: bytesToBlob(await part.save(), 'application/pdf'),
    });
    input.onProgress(end / pageCount);
  }
  return outputs;
}

/** HEIC photos are decoded to JPG first (pdf-lib only embeds JPG/PNG), then laid out like jpg-to-pdf. */
export async function heicToPdf(input: ConvertInput): Promise<OutputFile[]> {
  const { convertHeic } = await import('./heic');
  const jpegs = await convertHeic({ ...input, onProgress: (ratio) => input.onProgress(ratio * 0.8) }, 'image/jpeg');
  return imagesToPdf({
    ...input,
    files: jpegs.map((output) => new File([output.blob], output.name, { type: 'image/jpeg' })),
    onProgress: (ratio) => input.onProgress(0.8 + ratio * 0.2),
  });
}

const TEXT_MARGIN = 54;

/**
 * Plain text → paginated PDF using the standard PDF fonts. Those only cover
 * WinAnsi (Latin) characters; anything else is replaced with “?”, and files
 * that are mostly non-Latin are rejected rather than producing a page of “?”.
 */
export function textToPdf(input: ConvertInput): Promise<OutputFile[]> {
  const [pageWidth, pageHeight] = PAGE_SIZES[input.options.pageSize ?? 'a4'] ?? PAGE_SIZES.a4;
  const fontSize = numberOption(input.options, 'fontSize', 11);
  const lineHeight = fontSize * 1.4;
  const maxWidth = pageWidth - TEXT_MARGIN * 2;

  return mapFiles(input, async (file, report) => {
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const text = await file.text();
    if (text.trim().length === 0) throw new ConversionError(`“${file.name}” is empty.`);

    const doc = await PDFDocument.create();
    doc.setTitle(baseName(file.name));
    const fonts: Record<string, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
      sans: StandardFonts.Helvetica,
      serif: StandardFonts.TimesRoman,
      mono: StandardFonts.Courier,
    };
    const font = await doc.embedFont(fonts[input.options.font ?? 'sans'] ?? StandardFonts.Helvetica);

    const widths = new Map<string, number | null>();
    let unsupported = 0;
    let visible = 0;
    /** Width of one character, or null if the font can't encode it. */
    const charWidth = (char: string): number | null => {
      if (!widths.has(char)) {
        try {
          font.encodeText(char);
          widths.set(char, font.widthOfTextAtSize(char, fontSize));
        } catch {
          widths.set(char, null);
        }
      }
      return widths.get(char)!;
    };
    // Tabs become spaces; other control and invisible format characters (BOM, zero-width) are dropped.
    const clean = (line: string): string =>
      Array.from(line.replace(/\t/g, '    ').replace(/[\p{Cc}\p{Cf}]/gu, ''), (char) => {
        if (char.trim()) visible += 1;
        if (charWidth(char) !== null) return char;
        unsupported += 1;
        return '?';
      }).join('');
    const width = (value: string) => Array.from(value).reduce((sum, char) => sum + (charWidth(char) ?? 0), 0);

    /** Word-wraps one source line; words longer than a line are broken by character. */
    const wrap = (line: string): string[] => {
      if (width(line) <= maxWidth) return [line];
      const lines: string[] = [];
      let current = '';
      let currentWidth = 0;
      for (const token of line.match(/\S+\s*|\s+/g) ?? []) {
        const tokenWidth = width(token);
        if (currentWidth + tokenWidth <= maxWidth) {
          current += token;
          currentWidth += tokenWidth;
          continue;
        }
        if (current) lines.push(current.trimEnd());
        current = '';
        currentWidth = 0;
        for (const char of token) {
          const charW = charWidth(char) ?? 0;
          if (currentWidth + charW > maxWidth && current) {
            lines.push(current);
            current = '';
            currentWidth = 0;
          }
          current += char;
          currentWidth += charW;
        }
      }
      lines.push(current.trimEnd());
      return lines;
    };

    const lines = text.split(/\r\n|\r|\n/).flatMap((line) => wrap(clean(line)));
    if (visible > 0 && unsupported / visible > 0.5) {
      throw new ConversionError(
        `“${file.name}” is mostly in a script this converter can’t render. Only Latin-alphabet text is supported.`,
      );
    }

    let page = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - TEXT_MARGIN - fontSize;
    for (const [index, line] of lines.entries()) {
      if (y < TEXT_MARGIN) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - TEXT_MARGIN - fontSize;
      }
      if (line) page.drawText(line, { x: TEXT_MARGIN, y, size: fontSize, font });
      y -= lineHeight;
      if (index % 500 === 0) report(index / lines.length);
    }

    return [{ name: withExtension(file.name, 'pdf'), blob: bytesToBlob(await doc.save(), 'application/pdf') }];
  });
}
