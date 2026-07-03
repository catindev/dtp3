# Stacksy

Interactive React + TypeScript prototype for a game-like tabletop card board.

The board is rendered with PixiJS. React owns the app shell and screen-space HUD such as the card inspector. Zustand owns game state. GSAP drives card and board motion.

## Stack

- React
- TypeScript
- PixiJS
- Zustand
- GSAP

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Project Map

- `src/components/IsometricDesk.tsx`: mounts the Pixi desk scene and renders screen-space overlays.
- `src/components/card-inspector`: React HUD for hovered-card details.
- `src/store/gameStore.ts`: Zustand state and actions.
- `src/engine/model`: board types, initial state, card presentation data, card detail view models, placement rules.
- `src/engine/layout`: board-space projection and camera fitting.
- `src/engine/render`: Pixi lifecycle and drawing.
- `src/engine/animation`: GSAP tweens and physical card motion.
- `src/engine/effects`: renderer-agnostic effect plans for row/slot changes.

Read `docs/architecture.md` and `docs/adding-feature.md` before larger changes.
