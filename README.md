# Stacksy

Interactive React + TypeScript prototype for a game-like tabletop card board.

The board and card inspector are rendered with PixiJS. React owns the app shell and lightweight HUD, such as the game clock and debug overlay. Zustand owns game state. GSAP drives card, board, and inspector motion.

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

- `src/components/IsometricDesk.tsx`: mounts the Pixi desk scene.
- `src/components/GameTicker.tsx`: advances the game clock on a fixed interval.
- `src/components/GameClock.tsx`: renders the clock HUD with SVG digit assets.
- `src/store/gameStore.ts`: Zustand state and actions.
- `src/engine/model`: board types, initial state, game clock, card presentation data, card detail view models, placement rules.
- `src/engine/layout`: board-space projection and camera fitting.
- `src/engine/render`: Pixi lifecycle and drawing.
- `src/engine/animation`: GSAP tweens and physical card motion.
- `src/engine/effects`: renderer-agnostic effect plans for row/slot changes.

Read `docs/architecture.md` and `docs/adding-feature.md` before larger changes.
