# New Dungeon NPC Placement Field

Add a new per-placement field to dungeon NPC placements: $ARGUMENTS

Placement fields live on `dungeon_npcs` (per dungeon+NPC pair, e.g. `boundary`, `interactive_tile`, `npc_position`). Per-NPC fields (dialogs, sprite, inventory) live on `npcs` instead — this recipe is for placement fields.

## API (`api/`)

1. **Migration** — `npx sequelize-cli migration:generate --name add-<field>-to-dungeon-npcs`. Note: the file lands in `api/migrations/` (no `.sequelizerc`); move it to `api/db/migrations/`. CJS format, JSONB nullable for structured fields:

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('dungeon_npcs', '<field>', {
      type: Sequelize.JSONB, allowNull: true, defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('dungeon_npcs', '<field>');
  },
};
```

2. **Model** — add the field to `src/models/dungeon_npc.js`.

3. **Admin controller** — `src/controllers/admin/dungeon_npcs.js`, TWO places:
   - `create`: add `<field> = null` to the req.body destructure AND the `DungeonNpc.create({...})` call
   - `update`: add `"<field>"` to the `allowed` array (explicit whitelist — keep it explicit, it's the security boundary)

4. **Dungeon show SQL** — `src/controllers/dungeon.js`, the `npc_placements` `json_build_object`: add `'<field>', dn.<field>,`. Without this the game never sees the field.

5. Run `npm run db:migrate` in `api/`.

## App (`app/`)

6. **Placement mapping** — `src/pages/games/pinmonkey/main.js`, `npcPlacementEntities`: add `<camelField>: p.<field>`. EntityRenderer rest-spreads entities into actor config, so no other passthrough edit is needed.

7. **Actor** — read `cfg.<camelField>` in `actors/npc.js`. Tile-coordinate fields must be scaled: `{ x: cfg.f.x * GRID_SIZE, y: cfg.f.y * GRID_SIZE }` (stored as tile coords, game runs in pixels).

## Editor (`app/src/pages/games/pinmonkey/editor/main.js`)

8. If the field is a **pickable tile**: add one entry to `PLACEMENT_TILE_FIELDS` (`{ field, label, hint, glyph, dashed }`). That's it — markers, sidebar picker, click-to-pick, and persistence all derive from that array via `pickingTileFor` / `renderTilePicker` / `TileMarker` / `commitPlacementPatch`.
9. Any other mutation UI: call `commitPlacementPatch(p.id, { <field>: value })` — never inline the `updateNpcPlacement` + `dungeonNpcUpdate` pair.

## Gotchas

- Field names snake_case in API/DB, camelCase in app config — conversion happens once in the `npcPlacementEntities` mapping.
- Tile-coord fields are NOT scaled by the `posScale` legacy-grid logic (only entity pixel `x`/`y` are) — store them in tile coords, they survive grid changes.
- Test flow: editor → npcs mode → expand a placement → set field → reload dungeon in game.
