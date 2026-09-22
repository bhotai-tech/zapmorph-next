import {
  ConversionError,
  mapFiles,
  numberOption,
  withExtension,
  type ConvertInput,
  type OutputFile,
} from './shared';

export type RasterType = 'image/png' | 'image/jpeg' | 'image/webp';

const EXTENSION: Record<RasterType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Browsers refuse canvases beyond roughly this many pixels. */
const MAX_CANVAS_PIXELS = 16384 * 16384;

type Canvas = OffscreenCanvas | HTMLCanvasElement;

export type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

function createCanvas(width: number, height: number): Canvas {
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new ConversionError('This image is too large for your browser to process.');
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function loadWithElement(blob: Blob): Promise<LoadedImage> {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new ConversionError('This image couldn’t be read. It may be corrupted or in an unsupported format.');
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

/** Decodes any image format the browser supports (PNG, JPG, WebP, AVIF, GIF, BMP). */
export async function loadImage(blob: Blob): Promise<LoadedImage> {
  try {
    const bitmap = await createImageBitmap(blob);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    return loadWithElement(blob);
  }
}

export async function canvasToBlob(canvas: Canvas, type: RasterType, quality?: number): Promise<Blob> {
  const blob =
    'convertToBlob' in canvas
      ? await canvas.convertToBlob({ type, quality })
      : await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) => (result ? resolve(result) : reject(new ConversionError('Image encoding failed.'))),
            type,
            quality,
          ),
        );
  // Browsers silently fall back to PNG for formats they can't encode.
  if (blob.type !== type) {
    throw new ConversionError(
      `Your browser can’t create ${EXTENSION[type].toUpperCase()} files. Try the latest Chrome, Edge or Firefox.`,
    );
  }
  return blob;
}

export async function renderImage(
  image: LoadedImage,
  type: RasterType,
  options: { quality?: number; width?: number; height?: number } = {},
): Promise<Blob> {
  const width = Math.max(1, Math.round(options.width ?? image.width));
  const height = Math.max(1, Math.round(options.height ?? image.height));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) throw new ConversionError('Your browser blocked image processing.');
  if (type === 'image/jpeg') {
    // JPG has no transparency: fill with white instead of the default black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(image.source, 0, 0, width, height);
  return canvasToBlob(canvas, type, options.quality);
}

export function convertImages(input: ConvertInput, type: RasterType): Promise<OutputFile[]> {
  const quality = numberOption(input.options, 'quality', 0.92);
  return mapFiles(input, async (file) => {
    const image = await loadImage(file);
    try {
      const blob = await renderImage(image, type, { quality });
      return [{ name: withExtension(file.name, EXTENSION[type]), blob }];
    } finally {
      image.release();
    }
  });
}

/** Reads intrinsic size from width/height or viewBox; SVGs without either default to 512 px. */
function svgSize(root: Element): { width: number; height: number } {
  const parse = (value: string | null) => {
    if (!value || value.trim().endsWith('%')) return null;
    const number = parseFloat(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const viewBox = root.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  const vbWidth = viewBox?.length === 4 && viewBox[2] > 0 ? viewBox[2] : null;
  const vbHeight = viewBox?.length === 4 && viewBox[3] > 0 ? viewBox[3] : null;
  let width = parse(root.getAttribute('width'));
  let height = parse(root.getAttribute('height'));
  if (!width && !height) {
    width = vbWidth ?? 512;
    height = vbHeight ?? 512;
  } else if (!width) {
    width = vbWidth && vbHeight ? (height! * vbWidth) / vbHeight : height!;
  } else if (!height) {
    height = vbWidth && vbHeight ? (width * vbHeight) / vbWidth : width;
  }
  return { width: width!, height: height! };
}

export function svgToImage(input: ConvertInput, type: 'image/png' | 'image/jpeg'): Promise<OutputFile[]> {
  const scale = numberOption(input.options, 'scale', 2);
  const quality = numberOption(input.options, 'quality', 0.92);
  return mapFiles(input, async (file) => {
    const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
    const root = doc.documentElement;
    if (root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
      throw new ConversionError(`“${file.name}” isn’t a valid SVG file.`);
    }
    const { width, height } = svgSize(root);
    // Explicit pixel size so every browser rasterizes at the intended resolution.
    root.setAttribute('width', String(width));
    root.setAttribute('height', String(height));
    const svgBlob = new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' });
    const image = await loadWithElement(svgBlob);
    try {
      const blob = await renderImage(image, type, { quality, width: width * scale, height: height * scale });
      return [{ name: withExtension(file.name, EXTENSION[type]), blob }];
    } finally {
      image.release();
    }
  });
}
