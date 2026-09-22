import { canvasToBlob, loadImage } from './image';
import { ConversionError, mapFiles, withExtension, type ConvertInput, type OutputFile } from './shared';

const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function renderSquare(source: CanvasImageSource, width: number, height: number, size: number) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d');
  if (!context) throw new ConversionError('Your browser blocked image processing.');
  // Contain: keep aspect ratio, centered on a transparent square.
  const scale = Math.min(size / width, size / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);
  return new Uint8Array(await (await canvasToBlob(canvas, 'image/png')).arrayBuffer());
}

/** ICO container with PNG-compressed entries (supported by all modern Windows and browsers). */
function packIco(images: { size: number; data: Uint8Array }[]): Uint8Array {
  const headerSize = 6 + images.length * 16;
  const total = headerSize + images.reduce((sum, image) => sum + image.data.length, 0);
  const buffer = new Uint8Array(total);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);

  let offset = headerSize;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    view.setUint8(entry, image.size >= 256 ? 0 : image.size); // 0 means 256
    view.setUint8(entry + 1, image.size >= 256 ? 0 : image.size);
    view.setUint8(entry + 2, 0); // palette colors
    view.setUint8(entry + 3, 0); // reserved
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, image.data.length, true);
    view.setUint32(entry + 12, offset, true);
    buffer.set(image.data, offset);
    offset += image.data.length;
  });
  return buffer;
}

export function imagesToIco(input: ConvertInput): Promise<OutputFile[]> {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new ConversionError('Your browser can’t create icons. Try the latest Chrome, Edge, Firefox or Safari.');
  }
  return mapFiles(input, async (file) => {
    const image = await loadImage(file);
    try {
      const entries = [];
      for (const size of ICON_SIZES) {
        entries.push({ size, data: await renderSquare(image.source, image.width, image.height, size) });
      }
      const ico = packIco(entries);
      return [{ name: withExtension(file.name, 'ico'), blob: new Blob([ico as Uint8Array<ArrayBuffer>], { type: 'image/x-icon' }) }];
    } finally {
      image.release();
    }
  });
}
