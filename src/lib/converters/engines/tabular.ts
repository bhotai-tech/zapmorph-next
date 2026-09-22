/** Turns arbitrary JSON into rows and columns for CSV/Excel output. Pure functions. */

type Row = Record<string, unknown>;

function isPlainObject(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** { a: { b: 1 }, tags: ['x'] } → { 'a.b': 1, tags: '["x"]' } */
function flatten(value: Row, prefix = '', out: Row = {}): Row {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(child) && Object.keys(child).length > 0) {
      flatten(child, path, out);
    } else if (Array.isArray(child) || isPlainObject(child)) {
      out[path] = JSON.stringify(child);
    } else {
      out[path] = child;
    }
  }
  return out;
}

/**
 * Accepts an array of objects, an object wrapping one array (e.g. { data: [...] }),
 * a single object, or an array of primitives.
 */
export function jsonToTable(value: unknown): { columns: string[]; rows: unknown[][] } {
  let items: unknown[];
  if (Array.isArray(value)) {
    items = value;
  } else if (isPlainObject(value)) {
    const arrays = Object.values(value).filter(Array.isArray);
    items = arrays.length === 1 && Object.keys(value).length === 1 ? arrays[0] : [value];
  } else {
    items = [value];
  }

  const flatRows = items.map((item) => (isPlainObject(item) ? flatten(item) : { value: item }));
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  const rows = flatRows.map((row) =>
    columns.map((column) => {
      const cell = row[column];
      return cell === undefined || cell === null ? '' : cell;
    }),
  );
  return { columns, rows };
}
