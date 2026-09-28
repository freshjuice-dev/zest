import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import ZestFull from '../src/index.js';
import ZestHeadless from '../src/headless.js';
import * as HeadlessExports from '../src/headless.js';

const here = dirname(fileURLToPath(import.meta.url));

// Extracts member names from the `declare const Zest: { ... }` block.
// Fail-closed: a missing anchor or a suspiciously low member count fails.
function parseZestMembers(rel) {
  const src = readFileSync(resolve(here, rel), 'utf8');
  const anchor = src.indexOf('declare const Zest: {');
  expect(anchor, `${rel}: Zest block not found — parser or format drifted`).toBeGreaterThan(-1);
  const open = src.indexOf('{', anchor);
  let depth = 0;
  let close = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { close = i; break; }
  }
  const body = src.slice(open + 1, close);
  const members = [...body.matchAll(/^ {2}(?:readonly )?([A-Za-z_$][\w$]*)\s*[:(]/gm)].map(m => m[1]);
  expect(members.length, `${rel}: parsed ${members.length} members — parser broken, fix before trusting green`).toBeGreaterThan(10);
  return members;
}

function diffMembers(runtime, documented, label) {
  const missing = Object.keys(runtime).filter(k => !documented.includes(k));
  const phantom = documented.filter(k => !(k in runtime));
  expect(missing, `${label}: on runtime, missing from d.ts: ${missing.join(', ')}`).toEqual([]);
  expect(phantom, `${label}: documented but not on runtime: ${phantom.join(', ')}`).toEqual([]);
}

describe('d.ts contract', () => {
  it('headless runtime matches zest.headless.d.ts', () => {
    diffMembers(ZestHeadless, parseZestMembers('../src/types/zest.headless.d.ts'), 'headless');
  });

  it('full runtime matches zest.d.ts', () => {
    diffMembers(ZestFull, parseZestMembers('../src/types/zest.d.ts'), 'full');
  });

  it('headless named exports reference real members', () => {
    const src = readFileSync(resolve(here, '../src/types/zest.headless.d.ts'), 'utf8');
    const members = parseZestMembers('../src/types/zest.headless.d.ts');
    for (const [, name, ref] of src.matchAll(/export const (\w+): typeof Zest\.(\w+);/g)) {
      expect(members, `typeof Zest.${ref} does not exist`).toContain(ref);
      expect(name).toBe(ref);
      expect(HeadlessExports[name]).toBe(ZestHeadless[ref]);
    }
  });

  it('full config types nest embed labels under labels', () => {
    const src = readFileSync(resolve(here, '../src/types/zest.d.ts'), 'utf8');
    const initOptions = src.slice(src.indexOf('export interface InitOptions'), src.indexOf('/** Event names'));
    expect(initOptions).toMatch(/^  labels\?: \{/m);
    expect(initOptions).toMatch(/^    embed\?: \{/m);
    expect(initOptions).not.toMatch(/^  embed\?: \{/m);
  });
});
