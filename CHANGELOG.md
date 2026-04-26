# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-04-26

### Added

- **TypeScript declaration files** for both entries:
  - `dist/zest.d.ts` covers the full UI build (`@freshjuice/zest`)
  - `dist/zest.headless.d.ts` covers the headless build (`@freshjuice/zest/headless`)
- `package.json` `exports` map declares `types` for both entries; the
  legacy top-level `"types": "dist/zest.d.ts"` is also set so older
  resolvers find them.
- `scripts/copy-types.js` — postbuild step that copies hand-written
  declarations from `src/types/` into `dist/` next to the JS bundles.
- Hand-written types in `src/types/zest.d.ts` and
  `src/types/zest.headless.d.ts`. Self-contained, no shared imports —
  resilient to bundler / publish surprises.

### Changed

- `src/headless` subpath export now publishes types alongside the JS,
  so `import Zest from '@freshjuice/zest/src/headless'` resolves with
  full type information (the JS path is unchanged).

### Notes

- No runtime changes. All bundles produced by rollup are byte-identical
  to v2.0.0; the only diff is the new `.d.ts` companions in `dist/`.

## [2.0.0] - 2026-04-23

### Added

- **Headless entry** — `@freshjuice/zest/headless` ships the consent engine
  without the Shadow DOM UI for consumers who want to bring their own
  banner/modal/CSS. ~11 KB gzipped.
- `package.json` `exports` map for subpath imports
  (`@freshjuice/zest/headless`)
- `Zest.on(event, cb)` / `Zest.once(event, cb)` — event subscription helpers
  available on both entries
- New module `src/core/security.js` — centralized escaping, URL / color /
  regex validation, cookie-schema sanitization, CSS sanitization, safe
  callback invocation
- New module `src/core-lifecycle.js` — UI-agnostic init / consent-action
  pipeline shared by both entries
- Example `examples/headless.html` demonstrating bring-your-own-UI flow
- `CHANGELOG.md` — this file

### Security (high severity)

- **XSS via `innerHTML`** in banner, modal, and widget — all interpolated
  config values (labels, category names, aria-labels) now pass through
  `escapeHTML()` before rendering. The banner `position` class is
  additionally validated against an allowlist.
- **`javascript:` URL via `policyUrl`** — now validated with `safeUrl()`
  (allowlist: `http:` / `https:` / `mailto:` / `tel:` / relative). Link
  `rel` upgraded to `noopener noreferrer`.
- **Arbitrary CSS injection via `customStyles`** — sanitized by stripping
  `@import`, `@charset`, `expression()`, `-moz-binding`, external
  `url()` values, and any selectors targeting the accept/reject buttons
  (prevents clickjacking via invisible-button attacks). 20 KB hard cap.

### Security (medium severity)

- **ReDoS in user-supplied regex patterns** — `setPatterns()` now routes
  through `safeRegExp()` which rejects catastrophic-backtracking shapes
  and caps pattern length at 500 characters
- **DOM-based script-source tampering** — `replayScripts()` no longer
  re-reads `data-blocked-src` from the DOM. `scriptQueue` is the single
  source of truth, snapshotted before any DOM mutation
- **Consent cookie on HTTPS** now carries the `Secure` flag
- **Cookie JSON schema validation** — parsed cookies are sanitized via
  `sanitizeConsentPayload()` (allowlisted category keys, forced boolean
  values, prototype-pollution safe)
- **Overly broad tracker URL matching** — `matchesTrackerList()` now
  restricts matching to hostname (and path prefix for entries containing
  a slash). The old `fullUrl.includes(domain)` fallback caused false
  positives on URLs with the domain in query params.
- **CSS injection via `accentColor`** — validated with `safeColor()`
  (hex / named / `rgb()` / `rgba()` / `hsl()` / `hsla()`)

### Security (low severity)

- `window.Zest` is now defined with `writable: false, configurable: false`
  and the API object is frozen
- All user-supplied callbacks are invoked through `safeInvoke()` —
  exceptions are logged and swallowed so the consent flow stays consistent
- Cookie / localStorage / sessionStorage / script replay queues are
  size-capped (100 / 200 / 200 / 500 entries) to mitigate memory DoS
- Cookie-interceptor descriptor installed with `configurable: false` so
  a later-loaded script cannot re-override `document.cookie`
- Script self-labeling as `data-consent-category="essential"` is now
  ignored — only `functional`, `analytics`, `marketing` self-labels are
  honored, and mode-assigned categories take precedence

### Changed

- **Breaking:** the `data-blocked-src` DOM attribute is no longer written
  to blocked `<script>` tags. Consumers that read this attribute (e.g.
  for debugging UIs) should use `Zest.getConsentProof()` or listen to
  internal state instead.
- **Breaking:** `window.Zest` is now locked (`writable: false,
  configurable: false`). Code that replaced the global will fail
  silently.
- `index.js` refactored to delegate non-UI work to `core-lifecycle.js`.
  Public API and behavior unchanged.

### Fixed

- Accent-color CSS now falls back cleanly to the default when a
  non-hex form (named color, `rgb()`, etc.) is supplied that can't be
  mathematically brightness-shifted
- `examples/basic.html` updated to stop referencing the now-removed
  `data-blocked-src` attribute

### Documentation

- README rewritten to cover the headless entry, security posture, new
  API helpers, and CSS customization options

---

## [1.0.0] - 2026-01-14

Initial public release.

- Shadow DOM banner / modal / widget
- Cookie / localStorage / sessionStorage / script interception
- 12 built-in translations with auto-detection
- Google Consent Mode v2 + Microsoft UET integration
- DNT / GPC respect with configurable behavior
- Blocking modes: manual / safe / strict / doomsday
- `window.ZestConfig` + data-attribute configuration surfaces
