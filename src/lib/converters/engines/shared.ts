/** Helpers shared by every conversion engine. Browser-only code paths. */

export type OptionValues = Record<string, string>;

export type ConvertInput = {
  files: File[];
  options: OptionValues;
  /** 0…1 across the whole run. */
  onProgress: (ratio: number) => void;
};

export type OutputFile = { name: string; blob: Blob };

/** An error whose message is safe and useful to show the user. */
export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}

export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return (dot > 0 ? fileName.slice(0, dot) : fileName) || 'file';
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

export function withExtension(fileName: string, extension: string): string {
  return `${baseName(fileName)}.${extension}`;
}

export function numberOption(options: OptionValues, key: string, fallback: number): number {
  const value = Number(options[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function bytesToBlob(bytes: Uint8Array | ArrayBuffer, type: string): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
}

export function textBlob(text: string, type: string): Blob {
  return new Blob([text], { type: `${type};charset=utf-8` });
}

/** Converts each file independently, reporting combined progress. */
export async function mapFiles(
  input: ConvertInput,
  convert: (file: File, report: (ratio: number) => void) => Promise<OutputFile[]>,
): Promise<OutputFile[]> {
  const outputs: OutputFile[] = [];
  const total = input.files.length;
  for (const [index, file] of input.files.entries()) {
    input.onProgress(index / total);
    const results = await convert(file, (ratio) =>
      input.onProgress((index + Math.min(Math.max(ratio, 0), 1)) / total),
    );
    outputs.push(...results);
  }
  input.onProgress(1);
  return outputs;
}

/**
 * Rejects if a third-party engine never settles (some swallow internal errors
 * and leave their promise pending), so the UI can't hang forever.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ConversionError(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Wraps a parse error with the file name so batch failures are traceable. */
export function parseError(file: File, format: string, cause: unknown): ConversionError {
  const detail = cause instanceof Error ? cause.message.split('\n')[0] : '';
  return new ConversionError(
    `“${file.name}” isn’t valid ${format}${detail ? `: ${detail}` : '.'}`,
  );
}
