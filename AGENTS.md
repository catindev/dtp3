# Stacksy Agent Notes

Stacksy is a React + TypeScript + PixiJS + Zustand prototype for a tabletop card board. Keep future changes small and layer-aware.

## Commands

- `npm run build`: TypeScript and production build.
- `npm run lint`: oxlint.
- `npm run dev`: local Vite server.

## Architecture

- `src/components/IsometricDesk.tsx` is only the React mount point for the Pixi scene.
- `src/components/AbstractBackground.tsx`, `src/components/GameTicker.tsx`, and `src/components/DebugOverlay.tsx` mount runtime controllers; keep timers, canvas loops, and rAF loops in engine modules.
- `src/components/GameClock.tsx` owns the React clock HUD.
- `src/store/gameStore.ts` owns mutable game state through Zustand.
- `src/engine/model/*` owns board data types, constants, initial state, and placement rules.
- `src/engine/model/cardPresentation.ts` and `src/engine/model/cardDetails.ts` own card display derivation. Do not duplicate those labels in React.
- `src/engine/time/*` owns fixed runtime tick controllers.
- `src/engine/performance/*` owns debug/performance measurement controllers.
- `src/engine/layout/*` owns board-space to screen-space projection and slot geometry.
- `src/engine/render/*` owns Pixi drawing, canvas background drawing, and scene lifecycle.
- `src/engine/interaction/*` owns hit testing and drop validation.
- `src/engine/animation/*` owns GSAP and per-frame card motion.
- `src/styles/motion.css` owns reusable React HUD spring/pop animation primitives.

Do not put game rules in Pixi render code. Do not put Pixi objects in the Zustand store. Do not put layout math, canvas drawing, or runtime loops in React components.

## Optimization Notes

Read `docs/optimization-notes.md` before render, animation, timing, background, or game-loop work.

When making any performance-related change, update `docs/optimization-notes.md` with:

- what was optimized;
- why it needed optimization;
- what changed;
- measured result or remaining risk;
- advice for future changes.

## Board Model

Cards live in typed slots: `SlotId = "${ColumnId}:${rowIndex}"`. A column shows `cardsInColumn + 1` slots, so an empty column has one slot and every occupied last slot creates the next empty slot.

Use `moveCardToColumn` or `moveCardToSlot` from `placementRules.ts` instead of mutating placements by hand.

## Visual Rules

Canonical sizes and colors live in `src/engine/model/gameConstants.ts`. Change card size, slot gaps, board perspective, and design tokens there first.

Idle cards are drawn in board perspective. Held cards are drawn as screen-space rectangular cards and must remain above all other cards.

The card inspector is a Pixi modal transformed from the card shell. React HUD components such as the clock and debug overlay should not affect desk width/depth or Pixi layout.

Use shared motion classes from `src/styles/motion.css` for game-like HUD entrance/pop effects before adding component-local keyframes.

## Before Finishing

Run `npm run build` and `npm run lint`. For visual changes, smoke-test the local app in a browser and verify drag, drop, rejected drop, and zoom.
