import { jsonToTable } from './tabular';
import {
  ConversionError,
  baseName,
  mapFiles,
  parseError,
  textBlob,
  withExtension,
  type ConvertInput,
  type OutputFile,
} from './shared';

async function readJson(file: File): Promise<unknown> {
  try {
    return JSON.parse(await file.text());
  } catch (err) {
    throw parseError(file, 'JSON', err);
  }
}

function jsonOutput(file: File, value: unknown): OutputFile[] {
  return [
    {
      name: withExtension(file.name, 'json'),
      blob: textBlob(JSON.stringify(value, null, 2), 'application/json'),
    },
  ];
}

export function csvToJson(input: ConvertInput): Promise<OutputFile[]> {
  const header = input.options.header !== 'no';
  return mapFiles(input, async (file) => {
    const { default: Papa } = await import('papaparse');
    const parsed = Papa.parse<unknown>(await file.text(), {
      header,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      transformHeader: (name) => name.trim(),
    });
    if (parsed.data.length === 0) {
      throw new ConversionError(`“${file.name}” has no rows.`);
    }
    return jsonOutput(file, parsed.data);
  });
}

export function jsonToCsv(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const [{ default: Papa }, value] = await Promise.all([import('papaparse'), readJson(file)]);
    const { columns, rows } = jsonToTable(value);
    return [
      {
        name: withExtension(file.name, 'csv'),
        blob: textBlob(Papa.unparse({ fields: columns, data: rows }), 'text/csv'),
      },
    ];
  });
}

export function jsonToYaml(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const [{ dump }, value] = await Promise.all([import('js-yaml'), readJson(file)]);
    return [{ name: withExtension(file.name, 'yaml'), blob: textBlob(dump(value, { noRefs: true }), 'application/yaml') }];
  });
}

export function yamlToJson(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const { loadAll } = await import('js-yaml');
    let documents: unknown[];
    try {
      documents = loadAll(await file.text());
    } catch (err) {
      throw parseError(file, 'YAML', err);
    }
    const nonEmpty = documents.filter((doc) => doc !== undefined);
    return jsonOutput(file, nonEmpty.length === 1 ? nonEmpty[0] : nonEmpty);
  });
}

async function readXml(file: File, attributeNamePrefix: string): Promise<unknown> {
  const { XMLParser, XMLValidator } = await import('fast-xml-parser');
  const text = await file.text();
  const validation = XMLValidator.validate(text);
  if (validation !== true) {
    throw new ConversionError(
      `“${file.name}” isn’t valid XML: ${validation.err.msg} (line ${validation.err.line}).`,
    );
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix,
    parseAttributeValue: true,
    trimValues: true,
  });
  return parser.parse(text);
}

export function xmlToJson(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => jsonOutput(file, await readXml(file, '@_')));
}

/**
 * The records in a parsed XML document: the largest array of repeated
 * elements (e.g. every <item> in <rss><channel>), searched a few levels deep.
 */
function xmlRecords(value: unknown, depth = 0): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'object' || value === null || depth > 6) return null;
  let best: unknown[] | null = null;
  for (const child of Object.values(value)) {
    const found = xmlRecords(child, depth + 1);
    if (found && found.length > (best?.length ?? 0)) best = found;
  }
  return best;
}

export function xmlToCsv(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const [{ default: Papa }, value] = await Promise.all([import('papaparse'), readXml(file, '@')]);
    // No repeated element: descend through single-child wrappers to one record.
    let record = value;
    while (typeof record === 'object' && record !== null && Object.keys(record).length === 1) {
      const [child] = Object.values(record);
      if (typeof child !== 'object' || child === null) break;
      record = child;
    }
    const { columns, rows } = jsonToTable(xmlRecords(value) ?? [record]);
    return [
      {
        name: withExtension(file.name, 'csv'),
        blob: textBlob(Papa.unparse({ fields: columns, data: rows }), 'text/csv'),
      },
    ];
  });
}

/** XML element names can't contain spaces or start with a digit — fix keys so output always parses. */
function sanitizeForXml(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForXml);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (key.startsWith('@_') || key === '#text') return [key, sanitizeForXml(child)];
      let name = key.replace(/[^A-Za-z0-9_.-]/g, '_');
      if (!/^[A-Za-z_]/.test(name)) name = `_${name}`;
      return [name, sanitizeForXml(child)];
    }),
  );
}

export function jsonToXml(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const [{ XMLBuilder }, raw] = await Promise.all([import('fast-xml-parser'), readJson(file)]);
    const value = sanitizeForXml(raw);
    // XML needs exactly one root element.
    const isSingleRoot =
      typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 1;
    const document = isSingleRoot ? value : { root: Array.isArray(value) ? { item: value } : value };
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(document)}`;
    return [{ name: withExtension(file.name, 'xml'), blob: textBlob(xml, 'application/xml') }];
  });
}

export function csvToXml(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const [{ default: Papa }, { XMLBuilder }] = await Promise.all([import('papaparse'), import('fast-xml-parser')]);
    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (name, index) => name.trim() || `column_${index + 1}`,
    });
    if (parsed.data.length === 0) throw new ConversionError(`“${file.name}” has no rows.`);
    const builder = new XMLBuilder({ format: true, indentBy: '  ', suppressEmptyNode: true });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(sanitizeForXml({ rows: { row: parsed.data } }))}`;
    return [{ name: withExtension(file.name, 'xml'), blob: textBlob(xml, 'application/xml') }];
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function markdownToHtml(input: ConvertInput): Promise<OutputFile[]> {
  const fullDocument = input.options.output !== 'fragment';
  return mapFiles(input, async (file) => {
    const { marked } = await import('marked');
    const markdown = await file.text();
    const body = await marked.parse(markdown, { gfm: true });
    const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? baseName(file.name);
    const html = fullDocument
      ? `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)}</title>
<style>
  body { margin: 0; font: 16px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2328; }
  main { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
  h1, h2, h3 { line-height: 1.25; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 8px; overflow-x: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
  :not(pre) > code { background: #f6f8fa; padding: 0.15em 0.35em; border-radius: 4px; }
  table { border-collapse: collapse; } th, td { border: 1px solid #d0d7de; padding: 6px 12px; }
  blockquote { margin: 0; padding-left: 16px; border-left: 4px solid #d0d7de; color: #57606a; }
  img { max-width: 100%; }
</style>
</head>
<body>
<main>
${body}</main>
</body>
</html>
`
      : body;
    return [{ name: withExtension(file.name, 'html'), blob: textBlob(html, 'text/html') }];
  });
}

export function htmlToMarkdown(input: ConvertInput): Promise<OutputFile[]> {
  return mapFiles(input, async (file) => {
    const { default: TurndownService } = await import('turndown');
    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
    service.remove(['script', 'style', 'noscript', 'iframe']);
    const markdown = service.turndown(await file.text());
    return [{ name: withExtension(file.name, 'md'), blob: textBlob(markdown, 'text/markdown') }];
  });
}
