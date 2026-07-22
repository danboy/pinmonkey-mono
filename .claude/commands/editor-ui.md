# Dungeon Editor UI Component

Build a new UI component for the dungeon editor: $ARGUMENTS

## Design tokens

The editor derives all colors from the dark theme via `useTheme()`. Always use these — never hardcode colors.

```js
import styled, { useTheme } from 'styled-components'

// Inside the component:
const { colors } = useTheme()

// Or in styled-components:
border: 1px solid ${({ theme: { colors } }) => colors('highlight', 0.3)};
```

| Token | Value | Use |
|-------|-------|-----|
| `colors('background')` | `rgb(17,18,24)` — near-black | panel/canvas bg |
| `colors('chrome')` | `rgb(47,48,64)` — dark navy | button bg, inputs |
| `colors('highlight')` | `rgb(220,193,40)` — gold | text, active state, accents |
| `colors('highlight', 0.55)` | dim gold | muted labels, placeholders |
| `colors('highlight', 0.3)` | dim border | default borders |
| `colors('highlight', 0.2)` | very dim | hover bg, inner borders |
| `colors('danger')` | red | destructive actions |

## Typography

Font is always `'Silkscreen', monospace` (all pinmonkey game/editor text — loaded in `public/index.ejs`). Labels are `text-transform: uppercase`, small sizes (`0.6rem`–`0.75rem`).

## Shared primitives — import, don't redefine

`app/src/pages/games/pinmonkey/editor/ui.js` exports the editor's styled primitives:

```js
import { ModeButton, SidebarLabel } from './ui'
// ModeButton: takes $active prop — chrome bg, gold text/border when active
// SidebarLabel: dim gold uppercase 0.6rem label
```

`editor/paint-controls.js` exports:
- `TEXTURES` — the texture list (name/label) for `public/Sprites/Textures/`
- `<PaintControls>` — shared tiles/decoration/overlay paint sidebar. Sections render only when their props are passed (`onSolidChange` → solid checkbox, `onEraseChange` → erase, `onOpacityChange` → opacity row). Call sites in `main.js` spread a shared `brush` object for the 8 common props.

Only define a new styled component when nothing in `ui.js` fits — and if it's reusable, add it to `ui.js`.

## Editor state patterns (main.js)

- `commitPlacementPatch(placementId, patch)` — updates NPC placement local state AND persists via `dungeonNpcUpdate` when the dungeon is saved. Use this for any placement mutation; never inline the update+persist pair.
- `PLACEMENT_TILE_FIELDS` — config array (`field`, `label`, `hint`, `glyph`, `dashed`) driving both map tile markers (`<TileMarker>`) and sidebar pickers (`renderTilePicker`). To add a new pickable tile field on placements: add an entry here + add the field to the API (see the npc-placement-field skill). No new state or handlers needed.
- `pickingTileFor` — single pick-mode state `{ id, field }`. Click handler writes `{ [field]: { x: col, y: row } }`. Don't add parallel picking states.

```js
const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid ${({ theme: { colors } }) => colors('highlight', 0.2)};
  color: ${({ theme: { colors } }) => colors('highlight', 0.55)};
  cursor: pointer;
  border-radius: 2px;
  &:hover {
    background: ${({ theme: { colors } }) => colors('highlight', 0.08)};
    color: ${({ theme: { colors } }) => colors('highlight')};
    border-color: ${({ theme: { colors } }) => colors('highlight', 0.4)};
  }
`
```

## Canvas-based interactive widgets

Use canvas for any interactive visual widget (color pickers, mini-maps, graph editors). Pattern:

```js
const MyCanvas = styled.canvas`
  border: 1px solid ${({ theme: { colors } }) => colors('highlight', 0.25)};
  cursor: crosshair;
  display: block;
`

export const MyWidget = ({ value, onChange }) => {
  const canvasRef = useRef()
  const draggingRef = useRef(false)

  // Draw on value change
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    // draw here
  }, [value])

  const pick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    // Scale mouse coords to canvas pixel space:
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width)
    const y = (e.clientY - rect.top)  * (CANVAS_H / rect.height)
    // compute new value, call onChange
  }, [onChange])

  // Drag tracking via window listeners (not canvas), so drag outside still works
  useEffect(() => {
    const onMove = (e) => { if (draggingRef.current) pick(e) }
    const onUp   = () => { draggingRef.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [pick])

  return (
    <MyCanvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onMouseDown={(e) => { draggingRef.current = true; pick(e) }}
    />
  )
}
```

**Key canvas rules:**
- Always scale mouse coords by `canvasSize / rect.size` — canvas pixel space ≠ CSS size
- Attach `mousemove`/`mouseup` to `window`, not the canvas, so drag works outside bounds
- Draw with `ImageData` (not per-pixel `fillRect`) for anything that covers >100 pixels

## Eyedropper API

Available in Chrome/Edge 95+. Gate on feature detection:

```js
const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

const pickWithEyeDropper = async () => {
  try {
    const result = await new window.EyeDropper().open()
    onChange(result.sRGBHex)  // returns a 6-digit hex string
  } catch { /* user cancelled — no-op */ }
}

{hasEyeDropper && (
  <IconButton type="button" onClick={pickWithEyeDropper} title="Pick from screen">
    <EyeDropperSVGIcon />
  </IconButton>
)}
```

## Inline SVG icons

Use inline SVG for icons — no icon library installed. Keep `fill="currentColor"` so they inherit button color.

```jsx
const EyeDropperIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.41-1.42-1.42 1.42 1.41 1.41-6.6 6.6A2 2 0 0 0 5 16v3h3a2 2 0 0 0 1.42-.59l6.6-6.6 1.41 1.42 1.42-1.42-1.42-1.41 3.12-3.12a1 1 0 0 0 .16-1.65z" />
  </svg>
)
```

## Color math utilities

`palette.js` already exports these — import if needed elsewhere:

```js
// These live in palette.js but are not exported — copy if reusing:
const hsvToRgb = (h, s, v) => { /* ... */ }
const rgbToHex = (r, g, b) => '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('')
const hexToHsv = (hex) => { /* ... */ }
```
