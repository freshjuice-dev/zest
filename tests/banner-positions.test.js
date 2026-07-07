import { describe, it, expect } from 'vitest';
import { generateStyles } from '../src/ui/styles.js';

describe('banner positions', () => {
  const css = generateStyles({ accentColor: '#0071e3' });

  describe('existing positions', () => {
    it('bottom: centered at bottom', () => {
      expect(css).toContain('.zest-banner--bottom {');
      expect(css).toMatch(/\.zest-banner--bottom\s*\{[^}]*bottom:\s*20px/);
      expect(css).toMatch(/\.zest-banner--bottom\s*\{[^}]*transform:\s*translateX\(-50%\)/);
    });

    it('bottom-left: pinned to bottom-left', () => {
      expect(css).toContain('.zest-banner--bottom-left {');
      expect(css).toMatch(/\.zest-banner--bottom-left\s*\{[^}]*bottom:\s*20px/);
      expect(css).toMatch(/\.zest-banner--bottom-left\s*\{[^}]*left:\s*20px/);
    });

    it('bottom-right: pinned to bottom-right', () => {
      expect(css).toContain('.zest-banner--bottom-right {');
      expect(css).toMatch(/\.zest-banner--bottom-right\s*\{[^}]*bottom:\s*20px/);
      expect(css).toMatch(/\.zest-banner--bottom-right\s*\{[^}]*right:\s*20px/);
    });

    it('top: centered at top', () => {
      expect(css).toContain('.zest-banner--top {');
      expect(css).toMatch(/\.zest-banner--top\s*\{[^}]*top:\s*20px/);
      expect(css).toMatch(/\.zest-banner--top\s*\{[^}]*transform:\s*translateX\(-50%\)/);
    });
  });

  describe('new positions', () => {
    it('top-left: pinned to top-left', () => {
      expect(css).toContain('.zest-banner--top-left {');
      expect(css).toMatch(/\.zest-banner--top-left\s*\{[^}]*top:\s*20px/);
      expect(css).toMatch(/\.zest-banner--top-left\s*\{[^}]*left:\s*20px/);
    });

    it('top-right: pinned to top-right', () => {
      expect(css).toContain('.zest-banner--top-right {');
      expect(css).toMatch(/\.zest-banner--top-right\s*\{[^}]*top:\s*20px/);
      expect(css).toMatch(/\.zest-banner--top-right\s*\{[^}]*right:\s*20px/);
    });

    it('center: dead-center of viewport', () => {
      expect(css).toContain('.zest-banner--center {');
      expect(css).toMatch(/\.zest-banner--center\s*\{[^}]*top:\s*50%/);
      expect(css).toMatch(/\.zest-banner--center\s*\{[^}]*left:\s*50%/);
      expect(css).toMatch(/\.zest-banner--center\s*\{[^}]*transform:\s*translate\(-50%,\s*-50%\)/);
    });
  });

  describe('animations', () => {
    it('top uses slide-in-top animation', () => {
      expect(css).toContain('@keyframes zest-slide-in-top');
      expect(css).toMatch(/\.zest-banner--top\s*\{[^}]*animation-name:\s*zest-slide-in-top/);
    });

    it('top-left uses slide-in-top-left animation', () => {
      expect(css).toContain('@keyframes zest-slide-in-top-left');
      expect(css).toMatch(/\.zest-banner--top-left\s*\{[^}]*animation-name:\s*zest-slide-in-top-left/);
    });

    it('top-right uses slide-in-top-right animation', () => {
      expect(css).toContain('@keyframes zest-slide-in-top-right');
      expect(css).toMatch(/\.zest-banner--top-right\s*\{[^}]*animation-name:\s*zest-slide-in-top-right/);
    });

    it('center uses fade-in-center animation', () => {
      expect(css).toContain('@keyframes zest-fade-in-center');
      expect(css).toMatch(/\.zest-banner--center\s*\{[^}]*animation-name:\s*zest-fade-in-center/);
    });

    it('center animation preserves translate(-50%, -50%) in keyframes', () => {
      expect(css).toMatch(/zest-fade-in-center[^}]*translate\(-50%,\s*-50%\)/s);
    });
  });

  describe('mobile (max-width: 480px)', () => {
    it('center stays centered on mobile', () => {
      expect(css).toMatch(/@media\s*\(max-width:\s*480px\)[^@]*\.zest-banner--center\s*\{[^}]*top:\s*50%/s);
      expect(css).toMatch(/@media\s*\(max-width:\s*480px\)[^@]*\.zest-banner--center\s*\{[^}]*transform:\s*translate\(-50%,\s*-50%\)/s);
    });

    it('top-left and top-right get top: 10px on mobile', () => {
      expect(css).toMatch(/\.zest-banner--top-left,\s*\.zest-banner--top-right\s*\{[^}]*top:\s*10px/);
    });
  });
});