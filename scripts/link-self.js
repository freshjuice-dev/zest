/**
 * After `npm install`, symlink the workspace root into its own
 * `node_modules/@freshjuice/zest` so workspace packages
 * (zest-astro, zest-eleventy) can resolve `@freshjuice/zest` like any
 * other consumer would. npm workspaces do not auto-link the root
 * package — only declared workspace members under `packages/*` — so
 * we do it here.
 *
 * Safe to run repeatedly: relinks if the target is missing or already
 * points elsewhere.
 */

import { existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const scope = join(root, 'node_modules', '@freshjuice');
const link = join(scope, 'zest');

mkdirSync(scope, { recursive: true });

const desired = relative(scope, root); // typically '../..'

let needsLink = true;
if (existsSync(link) || lstatSync(link, { throwIfNoEntry: false })) {
  try {
    const current = readlinkSync(link);
    if (current === desired) needsLink = false;
    else rmSync(link, { recursive: true, force: true });
  } catch {
    rmSync(link, { recursive: true, force: true });
  }
}

if (needsLink) {
  symlinkSync(desired, link, 'dir');
  console.log(`[zest] linked workspace root → ${link}`);
}
