# Stacksy Agent Notes

Stacksy is a React + TypeScript + PixiJS + Zustand prototype for a tabletop card board. Keep future changes small and layer-aware.

## Commands

- `npm run build`: TypeScript and production build.
- `npm run lint`: oxlint.
- `npm run dev`: local Vite server.

## Architecture

- `src/components/IsometricDesk.tsx` is only the React mount point for the Pixi scene and screen-space overlays.
- `src/components/card-inspector/*` owns the React card detail HUD.
- `src/store/gameStore.ts` owns mutable game state through Zustand.
- `src/engine/model/*` owns board data types, constants, initial state, and placement rules.
- `src/engine/model/cardPresentation.ts` and `src/engine/model/cardDetails.ts` own card display derivation. Do not duplicate those labels in React.
- `src/engine/layout/*` owns board-space to screen-space projection and slot geometry.
- `src/engine/render/*` owns Pixi drawing and scene lifecycle.
- `src/engine/interaction/*` owns hit testing and drop validation.
- `src/engine/animation/*` owns GSAP and per-frame card motion.

Do not put game rules in Pixi render code. Do not put Pixi objects in the Zustand store. Do not put layout math in React components.

## Board Model

Cards live in typed slots: `SlotId = "${ColumnId}:${rowIndex}"`. A column shows `cardsInColumn + 1` slots, so an empty column has one slot and every occupied last slot creates the next empty slot.

Use `moveCardToColumn` or `moveCardToSlot` from `placementRules.ts` instead of mutating placements by hand.

## Visual Rules

Canonical sizes and colors live in `src/engine/model/gameConstants.ts`. Change card size, slot gaps, board perspective, and design tokens there first.

Idle cards are drawn in board perspective. Held cards are drawn as screen-space rectangular cards and must remain above all other cards.

HUD components such as the card inspector are React overlays. They should not affect desk width/depth or Pixi layout.

## Before Finishing

Run `npm run build` and `npm run lint`. For visual changes, smoke-test the local app in a browser and verify drag, drop, rejected drop, and zoom.
