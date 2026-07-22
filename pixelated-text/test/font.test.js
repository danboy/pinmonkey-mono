import { describe, it, expect } from 'vitest';
import { FONT, GLYPH_SIZE, getGlyph } from '../src/font.js';

describe('font', () => {
  it('defines every glyph as an 8x8 bitmap of only . and #', () => {
    for (const [char, glyph] of Object.entries(FONT)) {
      expect(glyph.length, `glyph "${char}" row count`).toBe(GLYPH_SIZE);
      for (const row of glyph) {
        expect(row.length, `glyph "${char}" row width`).toBe(GLYPH_SIZE);
        expect(row, `glyph "${char}" row characters`).toMatch(/^[.#]+$/);
      }
    }
  });

  it('covers uppercase, lowercase, digits, space and common punctuation', () => {
    for (const c of 'ABCXYZabcxyz0123456789 .,!?:;-+=\'"()/ ') {
      expect(FONT[c], `missing glyph for "${c}"`).toBeDefined();
    }
  });

  it('aliases lowercase letters to their uppercase glyph', () => {
    expect(getGlyph('a')).toEqual(getGlyph('A'));
  });

  it('falls back to "?" for characters with no defined glyph', () => {
    expect(getGlyph('$')).toEqual(getGlyph('?'));
  });
});
