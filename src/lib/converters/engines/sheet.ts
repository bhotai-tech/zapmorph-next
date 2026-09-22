import type { CellValue, Workbook, Worksheet } from 'exceljs';
import { jsonToTable } from './tabular';
import {
  ConversionError,
  baseName,
  bytesToBlob,
  mapFiles,
  parseError,
  textBlob,
  withExtension,
  type ConvertInput,
  type OutputFile,
} from './shared';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function newWorkbook(): Promise<Workbook> {
  const mod = await import('exceljs');
  // The browser build is UMD: the namespace may sit on `default`.
  const lib = ('default' in mod && mod.default ? mod.default : mod) as typeof import('exceljs');
  return new lib.Workbook();
}

function cellToPlain(value: CellValue): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('formula' in value || 'sharedFormula' in value) {
      const result = (value as { result?: unknown }).result;
      if (result instanceof Date) return result.toISOString();
      return typeof result === 'object' && result !== null ? null : ((result as string | number | boolean) ?? null);
    }
    if ('hyperlink' in value) return (value as { text?: string }).text ?? value.hyperlink;
    if ('error' in value) return String(value.error);
  }
  return String(value);
}

function sheetRows(sheet: Worksheet): (string | number | boolean | null)[][] {
  const columnCount = sheet.actualColumnCount || sheet.columnCount;
  const rows: (string | number | boolean | null)[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells = [];
    for (let column = 1; column <= columnCount; column += 1) {
      cells.push(cellToPlain(row.getCell(column).value));
    }
    rows[rowNumber - 1] = cells;
  });
  return Array.from(rows, (row) => row ?? []);
}

async function readWorkbook(file: File): Promise<Workbook> {
  const workbook = await newWorkbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch (err) {
    throw parseError(file, 'Excel (.xlsx)', err);
  }
  if (workbook.worksheets.length === 0) {
    throw new ConversionError(`“${file.name}” has no worksheets.`);
  }
  return workbook;
}

async function writeWorkbook(columns: string[] | null, rows: unknown[][]): Promise<Blob> {
  const workbook = await newWorkbook();
  const sheet = workbook.addWorksheet('Sheet1');
  if (columns) sheet.addRow(columns);
  sheet.addRows(rows);
  if (rows.length > 0 || columns) sheet.getRow(1).font = { bold: true };

  // Approximate auto-fit from the widest value in each column.
  const allRows = columns ? [columns, ...rows] : rows;
  const widths: number[] = [];
  for (const row of allRows.slice(0, 1000)) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 8, Math.min(String(cell ?? '').length + 2, 60));
    });
  }
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  return bytesToBlob(await workbook.xlsx.writeBuffer(), XLSX_MIME);
}

export function csvToExcel(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const { default: Papa } = await import('papaparse');
    const parsed = Papa.parse<unknown[]>(await file.text(), {
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
    });
    if (parsed.data.length === 0) throw new ConversionError(`“${file.name}” is empty.`);
    return [{ name: withExtension(file.name, 'xlsx'), blob: await writeWorkbook(null, parsed.data) }];
  });
}

export function jsonToExcel(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    let value: unknown;
    try {
      value = JSON.parse(await file.text());
    } catch (err) {
      throw parseError(file, 'JSON', err);
    }
    const { columns, rows } = jsonToTable(value);
    return [{ name: withExtension(file.name, 'xlsx'), blob: await writeWorkbook(columns, rows) }];
  });
}

export function excelToCsv(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const [{ default: Papa }, workbook] = await Promise.all([import('papaparse'), readWorkbook(file)]);
    const sheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
    if (sheets.length === 0) throw new ConversionError(`“${file.name}” has no data.`);
    return sheets.map((sheet) => ({
      name:
        sheets.length === 1
          ? withExtension(file.name, 'csv')
          : `${baseName(file.name)}-${sheet.name.replace(/[\\/:*?"<>|]+/g, '_')}.csv`,
      blob: textBlob(Papa.unparse(sheetRows(sheet)), 'text/csv'),
    }));
  });
}

export function excelToJson(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const workbook = await readWorkbook(file);
    const sheets = workbook.worksheets.filter((sheet) => sheet.actualRowCount > 0);
    if (sheets.length === 0) throw new ConversionError(`“${file.name}” has no data.`);

    const toObjects = (sheet: Worksheet) => {
      const [header = [], ...body] = sheetRows(sheet);
      const keys = header.map((cell, index) =>
        cell === null || cell === '' ? `column_${index + 1}` : String(cell),
      );
      return body
        .filter((row) => row.some((cell) => cell !== null && cell !== ''))
        .map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? null])));
    };

    const result =
      sheets.length === 1
        ? toObjects(sheets[0])
        : Object.fromEntries(sheets.map((sheet) => [sheet.name, toObjects(sheet)]));
    return [
      {
        name: withExtension(file.name, 'json'),
        blob: textBlob(JSON.stringify(result, null, 2), 'application/json'),
      },
    ];
  });
}
