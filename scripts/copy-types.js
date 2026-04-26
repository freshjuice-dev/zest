#!/usr/bin/env node
/**
 * Copy hand-written TypeScript declaration files into `dist/` so the
 * published package includes types alongside the JS bundles.
 *
 * Source layout:        Published layout:
 *   src/types/zest.d.ts            -> dist/zest.d.ts
 *   src/types/zest.headless.d.ts   -> dist/zest.headless.d.ts
 *
 * Run automatically as `postbuild` after rollup finishes.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const COPIES = [
  ['src/types/zest.d.ts', 'dist/zest.d.ts'],
  ['src/types/zest.headless.d.ts', 'dist/zest.headless.d.ts']
];

for (const [from, to] of COPIES) {
  const src = join(ROOT, from);
  const dest = join(ROOT, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`  ✓ ${from} -> ${to}`);
}