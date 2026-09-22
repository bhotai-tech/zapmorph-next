#!/usr/bin/env node
// Edit .env.local without hand-editing or commenting/uncommenting lines.
//
//   npm run env:set -- PADDLE_ENV=sandbox
//   npm run env:set -- NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co SUPABASE_SERVICE_ROLE_KEY=ey...
//   npm run env:set -- --off PADDLE_API_KEY     # comment the line out (keeps the value)
//   npm run env:set -- --on  PADDLE_API_KEY     # uncomment it again
//   npm run env:set -- --list                   # show which keys are set/empty/commented
//
// Creates .env.local from .env.example on first run, updates keys in place
// (so comments and ordering survive), and never prints secret values.
// ENV_FILE=... overrides the target file, for testing.

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : path.join(ROOT, '.env.local');
const EXAMPLE = path.join(ROOT, '.env.example');
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Project-relative path, or absolute when ENV_FILE points outside the project. */
const shown = (file) => {
  const relative = path.relative(ROOT, file);
  return relative.startsWith('..') ? file : relative;
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(`Usage:
  npm run env:set -- KEY=value [KEY2=value2 ...]
  npm run env:set -- --off KEY     comment the line out
  npm run env:set -- --on  KEY     uncomment the line
  npm run env:set -- --list        show current keys (values are never printed)`);
  process.exit(1);
}

if (!existsSync(FILE)) {
  if (existsSync(EXAMPLE)) {
    copyFileSync(EXAMPLE, FILE);
    console.log(`created ${shown(FILE)} from .env.example`);
  } else {
    writeFileSync(FILE, '');
    console.log(`created ${shown(FILE)}`);
  }
}

let lines = readFileSync(FILE, 'utf8').split('\n');

/** Matches `KEY=`, `#KEY=` and `  # KEY=` alike. */
const matcher = (key) => new RegExp(`^(\\s*#\\s*)?${key}=`);
const indexOfKey = (key) => lines.findIndex((line) => matcher(key).test(line));
const isCommented = (line) => /^\s*#/.test(line);

/** Quote only when the value would otherwise break parsing. */
function render(key, value) {
  const needsQuotes = /[\s#"']/.test(value) && !/^".*"$/.test(value);
  return `${key}=${needsQuotes ? JSON.stringify(value) : value}`;
}

function setKey(key, value) {
  const index = indexOfKey(key);
  if (index === -1) {
    // Keep a single trailing blank line at the end of the file.
    while (lines.length > 0 && lines.at(-1) === '') lines.pop();
    lines.push(render(key, value), '');
    console.log(`added ${key} (${value.length} chars)`);
    return;
  }
  const wasCommented = isCommented(lines[index]);
  lines[index] = render(key, value);
  console.log(`set ${key} (${value.length} chars)${wasCommented ? ' — and uncommented it' : ''}`);
}

function toggleKey(key, on) {
  const index = indexOfKey(key);
  if (index === -1) {
    console.error(`✖ ${key} is not in ${shown(FILE)}`);
    process.exitCode = 1;
    return;
  }
  const line = lines[index];
  if (on && isCommented(line)) {
    lines[index] = line.replace(/^\s*#\s*/, '');
    console.log(`${key} is now active`);
  } else if (!on && !isCommented(line)) {
    lines[index] = `# ${line}`;
    console.log(`${key} is now commented out`);
  } else {
    console.log(`${key} was already ${on ? 'active' : 'commented out'}`);
  }
}

function list() {
  for (const line of lines) {
    const match = line.match(/^(\s*#\s*)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, comment, key, value] = match;
    const state = comment ? 'commented' : value.trim() === '' ? 'EMPTY' : `set (${value.trim().length} chars)`;
    console.log(`  ${key.padEnd(34)} ${state}`);
  }
}

let changed = false;
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--list') {
    list();
    continue;
  }
  if (arg === '--on' || arg === '--off') {
    const key = args[i + 1];
    i += 1;
    if (!key || !KEY.test(key)) {
      console.error(`✖ ${arg} needs a key name, e.g. ${arg} PADDLE_API_KEY`);
      process.exit(1);
    }
    toggleKey(key, arg === '--on');
    changed = true;
    continue;
  }
  const separator = arg.indexOf('=');
  const key = separator === -1 ? arg : arg.slice(0, separator);
  if (separator === -1 || !KEY.test(key)) {
    console.error(`✖ "${arg}" is not KEY=value`);
    process.exit(1);
  }
  setKey(key, arg.slice(separator + 1));
  changed = true;
}

if (changed) {
  writeFileSync(FILE, lines.join('\n'));
  console.log(`\n${shown(FILE)} updated — restart \`npm run dev\` to pick it up.`);
}
