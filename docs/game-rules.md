# Game Rules

This document describes the current board rules. Keep it updated before adding more game mechanics.

## Columns

The board has three columns:

- `backlog`
- `in-progress`
- `done`

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

Row-count changes are planned in `src/engine/effects/boardRowEffects.ts`. The Pixi scene executes that plan: removed slots collapse first, then any delayed board/column shrink starts.

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

## Future Rule Hooks

Likely next additions:

- drop into a specific slot, not only first free slot;
- blocked slots;
- card type constraints;
- column capacity;
- turn/action state;
- undo/redo command log.
