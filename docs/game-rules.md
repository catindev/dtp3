# Game Rules

This document describes the current board rules. Keep it updated before adding more game mechanics.

## Columns

The board has three columns:

- `backlog`
- `in-progress`
- `done`

## Cards

Card ids are numeric and start at `100`. The current game card model is:

```ts
type BoardCard = {
  id: number
  title: string
  category: 'feature' | 'bug' | 'incident' | 'performance' | 'compliance'
  deadline: number
  domain: 'PAY' | 'AUTH' | 'ADM' | 'SRCH' | 'REP' | 'NTF'
  stats: {
    pressure: number
    complexity: number
    value: number
    clarity: number
    quality: number
    qa: number
    bugs: number
    impact: number
  }
  subtasks: Array<{
    id: number
    title: string
    completed: boolean
    type: 'backend' | 'frontend' | 'SRE' | 'QA'
  }>
}
```

Keep values in the `0..100` range unless a future rule explicitly changes the scale. Presentation labels, colors, card codes, and risk summaries live in `src/engine/model/cardPresentation.ts`. The Pixi inspector consumes `src/engine/model/cardDetails.ts` instead of deriving display text ad hoc.

Each column shows exactly one playable empty slot after its last card.

Examples:

- empty column: 1 slot;
- column with 1 card: the card slot plus 1 empty slot;
- column with 4 cards: 4 occupied slots plus 1 empty slot.

## Slots

Cards are placed in slots. A slot id has the format:

```ts
type SlotId = `${ColumnId}:${number}`
```

Examples:

- `backlog:0`
- `in-progress:2`
- `done:4`

Rows are zero-based.

## Growth

`getColumnSlotCount(state, columnId)` returns `cardsInColumn + 1`.

The desk height is driven by the tallest column. Individual columns may have different visual heights.

When a card moves into a target column, it lands in that column's single empty slot. After landing, a new empty slot appears below it. If this makes the target column taller than the current desk, the desk and column grow with spring motion.

Row-count changes are planned in `src/engine/effects/boardRowEffects.ts`. Runtime execution lives in `src/engine/render/sceneRowMotion.ts`: removed slots collapse first, then any delayed board/column shrink starts.

Slot visuals are not separate playable objects. They mirror card geometry and only represent legal placement space for the current column state.

## Movement

Current drag rules:

- A card can be dropped only into an adjacent column.
- Dropping into the same column or non-adjacent column rejects the drop.
- Accepted drops move the card into the target column's empty slot.
- Rejected drops keep the original slot and animate the card back.
- While a card is being dragged, its source slot stays occupied.
- The source column compacts only after an accepted drop starts the landing animation into another column.
- Cards below the removed card hop upward into their new compact slots after that accepted drop.
- Removed empty slots collapse with a short cartoon spring animation.

Use `moveCardToColumn` or `moveCardToSlot` for moves. Do not mutate `state.placements` outside placement rules or store actions.

## Game Time

The game clock lives in `src/engine/model/gameClock.ts`.

- One real-time tick runs every `1000ms`.
- Each tick advances the game clock by one in-game minute.
- A day starts at `08:00` and ends at `18:00`.
- Advancing past `18:00` starts the next day at `08:00`.

React mounts the fixed interval through `GameTicker.tsx`, `src/engine/time/gameTicker.ts` owns the runtime ticker, and `GameClock.tsx` renders the HUD using SVG digit assets. Pixi scene synchronization ignores clock-only store changes.

## Future Rule Hooks

Likely next additions:

- deadline and pressure changes on game ticks;
- drop into a specific slot, not only first free slot;
- blocked slots;
- card type constraints;
- column capacity;
- card stat changes after actions;
- subtask completion effects;
- turn/action state;
- undo/redo command log.
