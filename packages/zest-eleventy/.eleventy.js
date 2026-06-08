/**
 * ESM entry — for projects using `import zestPlugin from '@freshjuice/zest-eleventy'`.
 *
 * Delegates to the CommonJS implementation so behaviour stays identical
 * across both entries. Node's interop unwraps `module.exports` (a
 * function) into the default import.
 */
import core from './src/core.cjs';

export default core;
export const register = core.register;
export const safeStringify = core.safeStringify;
export const loadZestBundle = core.loadZestBundle;
export const buildScriptTag = core.buildScriptTag;
