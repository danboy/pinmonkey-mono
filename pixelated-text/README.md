# pixelated-text

Vanilla JS library that replaces the text content of a DOM element (looked up
by `id`) with a pixel-art rendering: one 16x16 canvas sprite per character,
scaled up from an 8x8 bitmap font.

No dependencies, no build step. Works as a pair of `<script>` tags or via
`require`/`import` in Node/bundlers.

## Usage

### Browser (script tags)

```html
<div id="headline">HELLO WORLD</div>

<script src="src/font.js"></script>
<script src="src/pixelText.js"></script>
<script>
  PixelText.replace('headline', { scale: 3 });
</script>
```

See `demo/index.html` for a full example (open it directly in a browser).

### Node / bundler

```js
const PixelText = require('./src/pixelText.js');

PixelText.replace('headline', { scale: 3 });
```

## API

### `PixelText.replace(id, options?)`

Finds the element with the given `id`, clears its contents, and inserts a
`<span class="pixel-text">` containing one `<canvas class="pixel-text-char">`
(16x16, `data-char` attribute set to the source character) per character.
Returns the inserted container, or `null` if no element with that id exists.

`options`:

| option            | default       | description                                            |
|-------------------|---------------|----------------------------------------------------------|
| `text`            | element's own `textContent` | render this string instead of the element's current text |
| `pixelColor`      | `'#000000'`   | fill color for "on" pixels                                |
| `backgroundColor` | `'transparent'` | fill color for the sprite background                    |
| `scale`           | `2`           | CSS display scale on top of the 16x16 canvas (e.g. `3` → 48x48px on screen) |
| `gap`             | `2`           | px gap between character sprites                          |

### Font coverage

Uppercase and lowercase letters (lowercase reuses the uppercase glyph),
digits `0`-`9`, space, and common punctuation: `. , ! ? : ; - + = ' " ( ) /`.
Any other character falls back to the `?` glyph.

## Tests

```bash
npm install
npm test
```
