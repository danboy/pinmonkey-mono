/**
 * PixelText — replaces the contents of a DOM element (looked up by id) with
 * a pixel-art rendering of its text, one 16x16 sprite per character.
 *
 * Usage (browser, no bundler):
 *   <script src="font.js"></script>
 *   <script src="pixelText.js"></script>
 *   <script>PixelText.replace('my-heading', { scale: 3 });</script>
 *
 * Usage (Node/bundler):
 *   const PixelText = require('./pixelText.js');
 *   PixelText.replace('my-heading', { scale: 3 });
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./font.js'));
  } else {
    root.PixelText = factory(root.PixelTextFont);
  }
})(typeof self !== 'undefined' ? self : this, function (Font) {
  'use strict';

  const GLYPH_SIZE = Font.GLYPH_SIZE; // 8 — source bitmap resolution
  const SPRITE_SIZE = 16; // rendered resolution per character (2x the bitmap)
  const SCALE_FACTOR = SPRITE_SIZE / GLYPH_SIZE;

  const DEFAULTS = {
    text: null, // override text instead of reading the element's current content
    pixelColor: '#000000',
    backgroundColor: 'transparent',
    scale: 2, // CSS display scale applied on top of the 16x16 sprite
    gap: 2, // px gap between character sprites
  };

  /**
   * Draws one character's glyph onto a 16x16 canvas, scaling each 8x8 font
   * cell up into a 2x2 block of real canvas pixels.
   */
  function drawGlyph(canvas, char, options) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return; // no 2d canvas support in this environment — leave the element blank

    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    if (options.backgroundColor && options.backgroundColor !== 'transparent') {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }

    const glyph = Font.getGlyph(char);
    ctx.fillStyle = options.pixelColor;
    for (let row = 0; row < GLYPH_SIZE; row++) {
      const rowBits = glyph[row];
      for (let col = 0; col < GLYPH_SIZE; col++) {
        if (rowBits[col] === '#') {
          ctx.fillRect(col * SCALE_FACTOR, row * SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        }
      }
    }
  }

  /**
   * Builds one 16x16 canvas element (a "sprite") representing a single
   * character, styled to render crisply when scaled up via CSS.
   */
  function createSprite(char, options, doc) {
    const canvas = doc.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    canvas.className = 'pixel-text-char';
    canvas.setAttribute('data-char', char);
    canvas.style.width = SPRITE_SIZE * options.scale + 'px';
    canvas.style.height = SPRITE_SIZE * options.scale + 'px';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'inline-block';
    canvas.style.verticalAlign = 'middle';
    drawGlyph(canvas, char, options);
    return canvas;
  }

  /**
   * Builds a container holding one sprite per character of `text`.
   */
  function renderFragment(text, options, doc) {
    const container = doc.createElement('span');
    container.className = 'pixel-text';
    container.style.display = 'inline-flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = options.gap + 'px';
    container.setAttribute('aria-label', text);
    container.setAttribute('role', 'img');

    for (const char of text) {
      container.appendChild(createSprite(char, options, doc));
    }
    return container;
  }

  /**
   * Replaces the contents of the element with id `id` with a pixel-art
   * rendering of its text (or `options.text`, if given).
   *
   * Returns the container element that was inserted, or null if no element
   * with that id was found.
   */
  function replace(id, options) {
    const opts = Object.assign({}, DEFAULTS, options);
    const el = document.getElementById(id);
    if (!el) return null;

    const text = opts.text != null ? opts.text : el.textContent;
    const fragment = renderFragment(text, opts, document);

    el.textContent = '';
    el.appendChild(fragment);
    return fragment;
  }

  return { replace, renderFragment, createSprite, GLYPH_SIZE, SPRITE_SIZE };
});
