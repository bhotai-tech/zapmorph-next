#!/usr/bin/env node
// Copies browser-side engine assets from node_modules into public/vendor so
// they're served same-origin (strict CSP, no third-party CDN) and never bundled:
//   • pdf.js worker, fonts, cmaps, wasm decoders
//   • ffmpeg.wasm class/worker (ESM) and the single-thread core (~32 MB wasm)
// Runs on postinstall, predev and prebuild. Safe to re-run.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const VENDOR = path.join(ROOT, 'public', 'vendor');

const COPIES = [
  { from: 'pdfjs-dist/build/pdf.worker.min.mjs', to: 'pdfjs/pdf.worker.min.mjs' },
  { from: 'pdfjs-dist/standard_fonts', to: 'pdfjs/standard_fonts' },
  { from: 'pdfjs-dist/cmaps', to: 'pdfjs/cmaps' },
  { from: 'pdfjs-dist/wasm', to: 'pdfjs/wasm' },
  { from: '@ffmpeg/ffmpeg/dist/esm', to: 'ffmpeg/esm', filter: (src) => !src.endsWith('.d.ts') && !src.endsWith('.d.mts') },
  { from: '@ffmpeg/core/dist/esm', to: 'ffmpeg/core' },
];

rmSync(VENDOR, { recursive: true, force: true });

for (const { from, to, filter } of COPIES) {
  const source = path.join(ROOT, 'node_modules', from);
  if (!existsSync(source)) {
    console.warn(`copy-assets: skipped ${from} (not installed)`);
    continue;
  }
  const target = path.join(VENDOR, to);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, filter });
}

console.log('copy-assets: public/vendor ready');
