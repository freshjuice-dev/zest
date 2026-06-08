import type { InitOptions } from '@freshjuice/zest';

export type ZestLanguage =
  | 'all'
  | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt'
  | 'nl' | 'pl' | 'uk' | 'ru' | 'ja' | 'zh';

export interface ZestEleventyOptions {
  /** Set to false to disable the plugin entirely. @default true */
  enabled?: boolean;

  /**
   * Auto-inject the bundle just before `</head>` in every `.html` output.
   * @default true
   */
  autoInject?: boolean;

  /**
   * Shortcode name for manual placement (e.g. `{% zest %}` in Nunjucks).
   * Pass `false` or an empty string to skip registering a shortcode.
   * @default 'zest'
   */
  shortcode?: string | false;

  /**
   * Which Zest bundle to inline. `'all'` ships the full multilingual
   * bundle (~16KB gzipped); a language code ships only that language
   * (~9KB gzipped). @default 'all'
   */
  language?: ZestLanguage;

  /**
   * Zest runtime configuration. Serialised to `window.ZestConfig` and
   * read by Zest on script eval.
   */
  config?: InitOptions;
}

interface EleventyConfig {
  addShortcode(name: string, fn: (...args: unknown[]) => string): unknown;
  addTransform(
    name: string,
    fn: (content: string, outputPath?: string) => string
  ): unknown;
}

declare function register(
  eleventyConfig: EleventyConfig,
  options?: ZestEleventyOptions
): void;

export default register;
export { register };
export function safeStringify(value: unknown): string;
export function loadZestBundle(language?: ZestLanguage): string;
export function buildScriptTag(args: {
  config?: InitOptions;
  bundle: string;
}): string;
