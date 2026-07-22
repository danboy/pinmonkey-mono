import { describe, it, expect, beforeEach } from 'vitest';
import PixelText from '../src/pixelText.js';
import { getGlyph, GLYPH_SIZE } from '../src/font.js';

// jsdom has no real canvas backend, so stub getContext('2d') with a fake
// that records fillRect calls — enough to assert the glyph-to-pixel mapping
// without pulling in the native `canvas` package.
class FakeContext2D {
  constructor() {
    this.fillRects = [];
    this.fillStyle = null;
  }
  clearRect() {}
  fillRect(x, y, w, h) {
    this.fillRects.push({ x, y, w, h });
  }
}

beforeEach(() => {
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (!this._fakeCtx) this._fakeCtx = new FakeContext2D();
    return this._fakeCtx;
  };
});

describe('PixelText.replace', () => {
  beforeEach(() => {
    document.body.innerHTML = '<h1 id="title">Hi!</h1><p>no id here</p>';
  });

  it('returns null when the id does not exist', () => {
    expect(PixelText.replace('missing')).toBeNull();
  });

  it('replaces the element contents with one 16x16 canvas sprite per character', () => {
    const fragment = PixelText.replace('title');
    const title = document.getElementById('title');

    expect(fragment).not.toBeNull();
    expect(title.contains(fragment)).toBe(true);

    const sprites = title.querySelectorAll('canvas.pixel-text-char');
    expect(sprites.length).toBe(3); // "H", "i", "!"
    sprites.forEach((canvas) => {
      expect(canvas.width).toBe(16);
      expect(canvas.height).toBe(16);
    });
    expect([...sprites].map((c) => c.getAttribute('data-char'))).toEqual(['H', 'i', '!']);
  });

  it('uses options.text instead of the element text when provided', () => {
    PixelText.replace('title', { text: 'OK' });
    const sprites = document.querySelectorAll('#title canvas.pixel-text-char');
    expect(sprites.length).toBe(2);
    expect([...sprites].map((c) => c.getAttribute('data-char'))).toEqual(['O', 'K']);
  });

  it('scales the rendered sprite size via CSS based on options.scale', () => {
    PixelText.replace('title', { text: 'A', scale: 4 });
    const canvas = document.querySelector('#title canvas.pixel-text-char');
    expect(canvas.style.width).toBe('64px');
    expect(canvas.style.height).toBe('64px');
  });

  it('sets an accessible label on the replacement container', () => {
    PixelText.replace('title', { text: 'Score' });
    const container = document.querySelector('#title .pixel-text');
    expect(container.getAttribute('aria-label')).toBe('Score');
    expect(container.getAttribute('role')).toBe('img');
  });

  it('draws each "on" font pixel as a scaled 2x2 block on the 16x16 canvas', () => {
    PixelText.replace('title', { text: 'A' });
    const canvas = document.querySelector('#title canvas.pixel-text-char');
    const ctx = canvas.getContext('2d');

    const glyph = getGlyph('A');
    const expectedRects = [];
    for (let row = 0; row < GLYPH_SIZE; row++) {
      for (let col = 0; col < GLYPH_SIZE; col++) {
        if (glyph[row][col] === '#') {
          expectedRects.push({ x: col * 2, y: row * 2, w: 2, h: 2 });
        }
      }
    }

    expect(ctx.fillRects).toEqual(expectedRects);
  });
});
