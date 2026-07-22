import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import PixelText from '../src/pixelText.js';

// jsdom has no real canvas or IntersectionObserver, so stub both:
// - getContext('2d') recording nothing (we only care about positioning here)
// - a controllable IntersectionObserver whose `.trigger()` we call by hand
//   to simulate scroll-into/out-of-view instead of waiting on a real scroll.
class FakeContext2D {
  clearRect() {}
  fillRect() {}
}

class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.observed = new Set();
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el) {
    this.observed.add(el);
  }
  unobserve(el) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  trigger(el, isIntersecting) {
    this.callback([{ target: el, isIntersecting }]);
  }
}
FakeIntersectionObserver.instances = [];

const FIXED_RECT = { left: 0, top: 0, right: 16, bottom: 16, width: 16, height: 16 };

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

beforeEach(() => {
  window.HTMLCanvasElement.prototype.getContext = () => new FakeContext2D();
  window.HTMLElement.prototype.getBoundingClientRect = () => FIXED_RECT;
  FakeIntersectionObserver.instances = [];
  window.IntersectionObserver = FakeIntersectionObserver;
  document.body.innerHTML = '';
  PixelText.resetChain();
});

afterEach(() => {
  delete window.IntersectionObserver;
});

describe('PixelText.animateIn', () => {
  it('returns null when the id does not exist', () => {
    expect(PixelText.animateIn('missing')).toBeNull();
  });

  it('renders the sprites immediately, hidden and offset, before any intersection fires', () => {
    document.body.innerHTML = '<h1 id="title">Hi</h1>';
    const result = PixelText.animateIn('title');
    const sprites = [...document.querySelectorAll('#title canvas.pixel-text-char')];

    expect(sprites.length).toBe(2);
    sprites.forEach((sprite) => {
      expect(sprite.style.opacity).toBe('0');
      expect(sprite.style.transform).toMatch(/^translate\(-?\d+(\.\d+)?px, -?\d+(\.\d+)?px\)$/);
      expect(sprite.style.transform).not.toBe('translate(0px, 0px)');
    });

    result.disconnect();
  });

  it('animates sprites into place, staggered per character, once the element intersects', async () => {
    document.body.innerHTML = '<h1 id="title">Hi</h1>';
    PixelText.animateIn('title', { stagger: 30, duration: 500 });

    const el = document.getElementById('title');
    const observer = FakeIntersectionObserver.instances[0];
    observer.trigger(el, true);
    await nextFrame();

    const sprites = [...document.querySelectorAll('#title canvas.pixel-text-char')];
    sprites.forEach((sprite, i) => {
      expect(sprite.style.opacity).toBe('1');
      expect(sprite.style.transform).toBe('translate(0px, 0px)');
      expect(sprite.style.transitionDelay).toBe(`${i * 30}ms`);
      expect(sprite.style.transition).toContain('500ms');
    });
  });

  it('unobserves after the first reveal by default (once: true)', () => {
    document.body.innerHTML = '<h1 id="title">Hi</h1>';
    PixelText.animateIn('title');
    const el = document.getElementById('title');
    const observer = FakeIntersectionObserver.instances[0];

    observer.trigger(el, true);
    expect(observer.observed.has(el)).toBe(false);
  });

  it('flies subsequent elements in from the previous element when from is "previous" (or "auto")', async () => {
    document.body.innerHTML = '<h1 id="first">A</h1><h1 id="second">B</h1>';

    PixelText.animateIn('first');
    const firstEl = document.getElementById('first');
    FakeIntersectionObserver.instances[0].trigger(firstEl, true);
    await nextFrame();

    PixelText.animateIn('second'); // default from: 'auto' chains off "first"
    const secondEl = document.getElementById('second');
    const secondSprite = document.querySelector('#second canvas.pixel-text-char');

    // Before the reveal, the sprite sits at its offscreen prepare position.
    expect(secondSprite.style.transform).not.toBe('translate(0px, 0px)');

    FakeIntersectionObserver.instances[1].trigger(secondEl, true);
    // Synchronously (pre-rAF), a "previous" reveal teleports the sprite to
    // align with the previous element's sprite position (both mocked to
    // the same rect here, so the delta collapses to zero) with transitions
    // disabled, before the animated transition to rest is scheduled.
    expect(secondSprite.style.transform).toBe('translate(0px, 0px)');
    expect(secondSprite.style.transition).toBe('none');

    await nextFrame();
    expect(secondSprite.style.opacity).toBe('1');
    expect(secondSprite.style.transition).not.toBe('none');
  });

  it('falls back to an offscreen start when from is "previous" but nothing has animated yet', () => {
    document.body.innerHTML = '<h1 id="title">Hi</h1>';
    PixelText.animateIn('title', { from: 'previous' });
    const el = document.getElementById('title');
    FakeIntersectionObserver.instances[0].trigger(el, true);

    const sprite = document.querySelector('#title canvas.pixel-text-char');
    expect(sprite.style.transform).not.toBe('translate(0px, 0px)');
  });

  it('re-hides sprites on exit and re-reveals on re-entry when once is false', async () => {
    document.body.innerHTML = '<h1 id="title">Hi</h1>';
    PixelText.animateIn('title', { once: false });
    const el = document.getElementById('title');
    const observer = FakeIntersectionObserver.instances[0];
    const sprite = document.querySelector('#title canvas.pixel-text-char');

    observer.trigger(el, true);
    await nextFrame();
    expect(sprite.style.opacity).toBe('1');

    observer.trigger(el, false);
    expect(sprite.style.opacity).toBe('0');
    expect(observer.observed.has(el)).toBe(true);

    observer.trigger(el, true);
    await nextFrame();
    expect(sprite.style.opacity).toBe('1');
  });
});
