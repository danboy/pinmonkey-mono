# New Dungeon Actor

Scaffold a new dungeon entity for: $ARGUMENTS

## File location

`app/src/pages/games/pinmonkey/actors/$ARGUMENTS.js`

## Minimal actor scaffold

```js
import { useEffect, useRef } from 'react'
import { useCollision } from '../hooks/use-collision'
import { usePosition } from '../hooks/use-position'
import { useWorld } from '../hooks/use-world'
import { GRID_SIZE } from '../config/constants'

export const $ARGUMENTS = ({
  x = 40,
  y = 40,
  width = GRID_SIZE,
  height = GRID_SIZE,
  config = {},
  ...rest
}) => {
  const cfg = {
    solid: true,
    ...config,
    entityType: '$ARGUMENTS_lowercase'
  }

  const [position, update] = usePosition(x, y, width, height, cfg)
  const posRef = useRef(position)
  useEffect(() => { posRef.current = position }, [position])

  const { frame, spritesRef, addSprite, removeSprite } = useWorld()
  const { isColliding, doObjectsCollide } = useCollision()

  useEffect(() => {
    // per-frame logic here
    const pos = posRef.current
    const player = spritesRef.current?.player?.position
  }, [frame])

  return null  // canvas renders actors — no DOM output
}
```

## Wire into a dungeon map

In `map.js` (or wherever actors are spawned), import and render:

```jsx
import { $ARGUMENTS } from './actors/$ARGUMENTS'

// In the level config or entity list:
<$ARGUMENTS key={entity.id} {...entity} />
```

## Key hooks

| Hook | Purpose |
|------|---------|
| `usePosition(x, y, w, h, cfg)` | Registers sprite in `spritesRef`, returns `[position, update(x, y)]` |
| `useWorld()` | Access `frame`, `spritesRef`, `addSprite`, `removeSprite`, `takeDamage`, `dealDamage`, etc. |
| `useCollision()` | `isColliding(pos)` → sprite or false; `doObjectsCollide(a, b)` → bool |
| `usePathfinding()` | `findPath(from, to, w, h)` → waypoint array for A* navigation |

## Spatial grid — must set `solid` correctly

`isColliding` uses a spatial grid keyed by solid sprites. Set `solid: false` on non-blocking actors (triggers, pickups, decorations). `solid: true` (default) registers the sprite in the grid and blocks movement.

## Motion patterns

```js
// Slide-fallback (NPC/monster style)
import { tryMoveTo } from '../lib/behaviours'
tryMoveTo(tx, ty, pos, cfg.stride, isColliding, update)

// Perpendicular gap-snap (player style)
import { snapToGap } from '../lib/behaviours'
const snapped = snapToGap(nextPos, isColliding, SNAP_THRESHOLD)

// Direct step toward target
import { moveToTarget } from '../lib/behaviours'
const next = moveToTarget(tx, ty, pos, stride)
```

## entityType conventions

| entityType | Meaning |
|-----------|---------|
| `monster` | Deals damage on contact; player checks for this |
| `npc` | Triggers dialog on player bump |
| `ladder` | Triggers level transition |
| `exit` | Triggers `onExit` callback |
| `treasure` / `item` | Player picks up on overlap |

## Config flags on `cfg`

- `solid: false` — passable (triggers, pickups)
- `stationary: true` — skip movement logic (NPC variant)
- `damage: N` — damage dealt per contact (monster)
- `entityType` — must always be set in the actor's merged cfg
