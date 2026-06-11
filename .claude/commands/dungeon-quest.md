# New Dungeon Quest

Scaffold a complete dungeon quest for: $ARGUMENTS

## 1. DB migration

```bash
cd api && npx sequelize-cli migration:generate --name add-quest-$ARGUMENTS
```

Quests live on the `dungeons` table as JSONB or in a separate `quests` table — check the current schema.

## 2. API response shape

`GET /dungeons/:slug` returns quests under `data.dungeon.quests[]`. Each quest must match:

```js
{
  id: 'string',            // stable unique key
  name: 'string',
  description: 'string',
  giver_npc_placement_id: 'uuid', // NPC that gives + accepts quest
  steps: [
    { id: 'step-id', description: '...', type: 'kill'|'collect'|'talk' }
  ],
  award: { gold: N, xp: N, item: null },
  dialog: {
    offer:    ['line1', 'line2'],
    accepted: ['line after player accepts'],
    progress: ['line while in progress'],
    complete: ['line when all steps done'],
    reward:   ['line after reward given'],
  }
}
```

## 3. NPC placement

The quest giver NPC must be a row in `npc_placements` with `placement_id` matching `giver_npc_placement_id`. Configure in the dungeon editor or via DB seed.

## 4. Game engine (Pinmonkey/main.js)

The quest is normalized in `Pinmonkey`:

```js
const quests = (data?.dungeon?.quests ?? []).map((q) => ({
  id: q.id,
  name: q.name,
  description: q.description,
  steps: q.steps ?? [],
  award: q.award ?? null,
  dialog: q.dialog ?? {},
  giverNpcPlacementId: q.giverNpcPlacementId ?? q.giver_npc_placement_id ?? null,
}));
```

Server-side progress merged at `questProgress`:
```js
const serverProgress = (data?.dungeon?.quest_progress ?? []).reduce((acc, p) => {
  acc[p.quest_id] = { status: p.status, completedSteps: p.completed_steps ?? [] };
  return acc;
}, {});
```

## 5. use-world hook

Quest state lives in `use-world.js`. Key functions exposed in context:

| Function | Purpose |
|----------|---------|
| `startQuest(questId)` | Mark quest `in_progress` |
| `advanceQuestStep(questId, stepId)` | Complete one step |
| `completeQuest(questId)` | Mark done, grant award |
| `questProgressRef` | Ref for reading progress without re-render (persisted to save) |

## 6. NPC dialog wiring

The `Terminal` component reads `dialog` from `useWorld()`. The quest NPC's dialog tree should use the `giverNpcPlacementId` and return dialog lines from `dialog.offer` / `dialog.progress` / `dialog.complete` based on `questProgress[questId].status`.

Quest dialog branching happens inside `NPC.js` → check `questProgressRef.current[questId]?.status` before pushing dialog lines.

## 7. Quest HUD

`QuestHUD` (`quests/quest-hud.js`) reads `questProgress` from context and renders active quests + step checklist. No changes needed unless adding a new quest step type.

## 8. Step types

| type | Completed by |
|------|-------------|
| `kill` | `recordMonsterKill` → `advanceQuestStep` |
| `collect` | `handleCollectTreasure` → `advanceQuestStep` |
| `talk` | NPC dialog reaching the `complete` branch |

## 9. API: save quest progress

Quest progress is persisted inside `dungeon_save.stats.questProgress` on each autosave (30 s) and on level change. Server also stores rows in `quest_progress` table (`POST /dungeons/:slug/quests/:id/progress`).
