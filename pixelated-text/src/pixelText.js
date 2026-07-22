/**
 * PixelText — replaces the contents of a DOM element (looked up by id) with
 * a pixel-art rendering of its text, one 16x16 sprite per character.
 *
 * Usage (browser, no bundler):
 *   <script src="font.js"></script>
 *   <script src="pixelText.js"></script>
 *   <script>PixelText.replace('my-heading', { scale: 3 });</script>
 *
 *   // fly the sprites in from offscreen (or from the previous animated
 *   // element's sprite positions) as the element scrolls into view:
 *   <script>PixelText.animateIn('my-heading', { scale: 3 });</script>
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

  const ANIMATE_DEFAULTS = Object.assign({}, DEFAULTS, {
    from: 'auto', // 'auto' | 'offscreen' | 'previous'
    duration: 700, // ms for a single sprite's flight
    stagger: 25, // ms added per character index, so sprites arrive in sequence
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.2, // IntersectionObserver threshold
    rootMargin: '0px',
    once: true, // stop watching after the first reveal
  });

  // The most recently revealed (or currently animating) element's sprites —
  // used as the flight origin for the next element when `from` is
  // 'previous' or 'auto', so pixels appear to flow from one element into
  // the next as the page scrolls.
  let lastAnimated = null;

  /**
   * Picks a point well outside the current viewport, in one of the four
   * directions, and returns the (dx, dy) translation from `rect` needed to
   * reach it.
   */
  function computeOffscreenDelta(rect) {
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 1024;
    const vh = (typeof window !== 'undefined' && window.innerHeight) || 768;
    const margin = 120;
    const edge = Math.floor(Math.random() * 4);

    switch (edge) {
      case 0: // fly in from above
        return { dx: (Math.random() - 0.5) * vw, dy: -(rect.bottom + margin + Math.random() * vh * 0.5) };
      case 1: // fly in from the right
        return { dx: vw - rect.left + margin + Math.random() * vw * 0.5, dy: (Math.random() - 0.5) * vh };
      case 2: // fly in from below
        return { dx: (Math.random() - 0.5) * vw, dy: vh - rect.top + margin + Math.random() * vh * 0.5 };
      default: // fly in from the left
        return { dx: -(rect.right + margin + Math.random() * vw * 0.5), dy: (Math.random() - 0.5) * vh };
    }
  }

  /**
   * Immediately hides `sprites` and moves them (via CSS transform, so
   * layout is untouched) to an offscreen starting point, before any
   * animation begins. Called synchronously right after the sprites are
   * inserted, so nothing flashes onscreen ahead of the scroll-triggered
   * reveal. Returns the sprites' resting-position rects, captured before
   * the offscreen transform was applied.
   */
  function prepareFlight(sprites) {
    return sprites.map((sprite) => {
      const finalRect = sprite.getBoundingClientRect();
      const delta = computeOffscreenDelta(finalRect);
      sprite.style.transition = 'none';
      sprite.style.opacity = '0';
      sprite.style.transform = `translate(${delta.dx}px, ${delta.dy}px)`;
      return finalRect;
    });
  }

  /**
   * Animates `sprites` from their current (offscreen, or teleported-to-
   * previous-element) position into their natural resting position,
   * staggered per character.
   */
  function revealFlight(sprites, finalRects, opts) {
    const usePrevious = (opts.from === 'previous' || opts.from === 'auto') && lastAnimated && lastAnimated.sprites.length;

    if (usePrevious) {
      sprites.forEach((sprite, i) => {
        const previousSprite = lastAnimated.sprites[i];
        if (!previousSprite) return; // no matching previous sprite — keep the offscreen start
        const prevRect = previousSprite.getBoundingClientRect();
        const finalRect = finalRects[i];
        sprite.style.transition = 'none';
        sprite.style.transform = `translate(${prevRect.left - finalRect.left}px, ${prevRect.top - finalRect.top}px)`;
      });
    }

    // Force layout so the browser registers the (possibly just-changed)
    // start position before the transition below is applied.
    if (sprites[0]) void sprites[0].offsetHeight;

    requestAnimationFrame(() => {
      sprites.forEach((sprite, i) => {
        sprite.style.transition = `transform ${opts.duration}ms ${opts.easing}, opacity ${Math.min(opts.duration, 400)}ms ease-out`;
        sprite.style.transitionDelay = `${i * opts.stagger}ms`;
        sprite.style.transform = 'translate(0px, 0px)';
        sprite.style.opacity = '1';
      });
    });

    lastAnimated = { sprites };
  }

  /**
   * Like `replace`, but the sprites start outside the page and fly into
   * place — from offscreen, or from the previous `animateIn` element's
   * sprite positions — as `id`'s element scrolls into view.
   *
   * Returns `{ container, disconnect }` (call `disconnect()` to stop
   * watching before the element has scrolled into view), or null if no
   * element with that id was found.
   */
  function animateIn(id, options) {
    const opts = Object.assign({}, ANIMATE_DEFAULTS, options);
    const el = document.getElementById(id);
    if (!el) return null;

    const text = opts.text != null ? opts.text : el.textContent;
    const container = renderFragment(text, opts, document);
    el.textContent = '';
    el.appendChild(container);

    const sprites = Array.from(container.querySelectorAll('canvas.pixel-text-char'));
    const finalRects = prepareFlight(sprites);

    let observer = null;
    const reveal = () => revealFlight(sprites, finalRects, opts);

    if (typeof IntersectionObserver === 'undefined') {
      reveal();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              reveal();
              if (opts.once) observer.unobserve(el);
            } else if (!opts.once) {
              prepareFlight(sprites).forEach((rect, i) => {
                finalRects[i] = rect;
              });
            }
          }
        },
        { threshold: opts.threshold, rootMargin: opts.rootMargin }
      );
      observer.observe(el);
    }

    return {
      container,
      disconnect: () => observer && observer.disconnect(),
    };
  }

  /** Clears the 'previous element' chain, e.g. between test cases or SPA route changes. */
  function resetChain() {
    lastAnimated = null;
  }

  return { replace, animateIn, resetChain, renderFragment, createSprite, GLYPH_SIZE, SPRITE_SIZE };
});
