import type { AstroIntegration } from 'astro';
import type { InitOptions } from '@freshjuice/zest';

export type ZestLanguage =
  | 'all'
  | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt'
  | 'nl' | 'pl' | 'uk' | 'ru' | 'ja' | 'zh';

export interface ZestAstroOptions {
  /** Set to false to disable the integration entirely. @default true */
  enabled?: boolean;

  /** Also inject the bundle during `astro dev`. @default true */
  devMode?: boolean;

  /**
   * Which Zest bundle to inline. `'all'` ships the full multilingual
   * bundle (~16KB gzipped); a language code ships only that language
   * (~9KB gzipped). @default 'all'
   */
  language?: ZestLanguage;

  /**
   * Zest runtime configuration. Serialised to `window.ZestConfig` and
   * read by Zest on script eval. See the `InitOptions` type from
   * `@freshjuice/zest` for the full schema.
   */
  config?: InitOptions;
}

declare function zestAstro(options?: ZestAstroOptions): AstroIntegration;
export default zestAstro;

export function safeStringify(value: unknown): string;
export function loadZestBundle(
  language?: ZestLanguage,
  options?: { resolveFrom?: string | URL }
): string;
export function buildInlineScript(args: {
  config?: InitOptions;
  bundle: string;
}): string;
