# Add Game World State Feature

Add a new piece of game state to the dungeon world context for: $ARGUMENTS

## Where it lives

`app/src/pages/games/pinmonkey/hooks/use-world.js` is the single source of truth for all game state. The `WorldProvider` exposes everything via `WorldContext`.

## Checklist

### 1. State declaration (top of WorldProvider)

```js
const [$ARGUMENTS, set$ARGUMENTS] = useState(initialStats.$ARGUMENTS ?? defaultValue)
```

If it needs to be readable in callbacks without stale closure, add a ref:

```js
const $ARGUMENTSRef = useRef($ARGUMENTS)
useEffect(() => { $ARGUMENTSRef.current = $ARGUMENTS }, [$ARGUMENTS])
```

### 2. Mutator (useCallback)

```js
const update$ARGUMENTS = useCallback((value) => {
  set$ARGUMENTS(value)
  // call setStatusMsg if user-visible feedback needed
}, [])
```

### 3. Add to context value

The context value object is at the bottom of `WorldProvider`. Add both state and mutator:

```js
const value = useMemo(() => ({
  // ... existing ...
  $ARGUMENTS,
  update$ARGUMENTS,
}), [/* add $ARGUMENTS, update$ARGUMENTS to deps */])
```

### 4. Expose in initialStats (if persisted across sessions)

If this value should survive a save/load cycle, thread it through `initialStats` in `WorldProvider` and persist it in the `stats` payload inside `Game.persistSave()` in `main.js`:

```js
stats: {
  ...activeSave.stats,
  $ARGUMENTS: $ARGUMENTSRef.current,
  // ...
}
```

### 5. Consume in a component

```js
const { $ARGUMENTS, update$ARGUMENTS } = useWorld()
```

## Pause guard pattern

If the feature must be blocked while game is paused (dialog open, inventory open):

```js
const { paused } = useWorld()
const pausedRef = useRef(paused)
useEffect(() => { pausedRef.current = paused }, [paused])

// Inside event handler or rAF callback:
if (pausedRef.current) return
```

## Status toast

To show a transient UI message:

```js
const { setStatusMsg } = useWorld()
setStatusMsg('Item collected!')  // auto-clears after 2 s
```

## Context shape reference

Key values already in context:

| Key | Type | Purpose |
|-----|------|---------|
| `health` / `maxHealth` | number | Player HP |
| `score` / `xp` / `wallet` | number | Player stats |
| `inventory` | array | Carried items |
| `currentLevel` | number | Active level index |
| `dialog` | array | Active NPC dialog lines (non-empty = paused) |
| `showInventory` | bool | Inventory overlay open |
| `paused` | bool | Derived: `dialog.length > 0 \|\| showInventory` |
| `statusMsg` | string\|null | Current toast message |
| `chatMessages` | array | Incoming chat log |
| `droppedItems` | array | World-dropped items |
| `questProgress` | object | `{ [questId]: { status, completedSteps } }` |
| `frame` | number | rAF frame counter (triggers actor effects) |
| `spritesRef` | ref | Live sprite registry (id → position) |
| `solidGridRef` | ref | Spatial grid for collision |
