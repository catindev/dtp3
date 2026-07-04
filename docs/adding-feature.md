# Adding Features

Use this checklist when starting a new chat or adding a feature.

## 1. Locate the Layer

- Game rule or placement behavior: `src/engine/model/placementRules.ts`.
- State transition side effects such as slot collapse or board growth order: `src/engine/effects`.
- New state or action: `src/store/gameStore.ts`.
- Game-time rules, day bounds, or tick formatting: `src/engine/model/gameClock.ts`.
- Game-clock HUD or fixed interval wiring: `src/components/GameClock.tsx` and `src/components/GameTicker.tsx`.
- New card data fields: `src/engine/model/boardTypes.ts` and `src/engine/model/boardState.ts`.
- Card labels, colors, codes, risk text, or modal detail derivation: `src/engine/model/cardPresentation.ts` and `src/engine/model/cardDetails.ts`.
- Board/card size or color: `src/engine/model/gameConstants.ts`.
- Projection or slot geometry: `src/engine/layout`.
- Camera composition, top reserved header space, and workspace fit margins: `src/engine/layout/viewportConfig.ts`.
- Pixi scene orchestration, event wiring, and store subscription: `src/engine/render/createDeskScene.ts`.
- Runtime camera/zoom state: `src/engine/render/sceneViewport.ts`.
- Runtime slot-row growth/shrink and removed-slot collapse execution: `src/engine/render/sceneRowMotion.ts`.
- Pixi card/column-label sync and cleanup: `src/engine/render/sceneEntities.ts`.
- Card rest-position sync and compacted-slot hop behavior: `src/engine/render/sceneCardLayout.ts`.
- Drawing details: `src/engine/render/boardRenderer.ts` or `src/engine/render/cardView.ts`.
- Per-frame card redraw scheduling: `src/engine/render/cardMotionLoop.ts`.
- Screen-space card detail UI: `src/engine/render/inspectorRenderer.ts`.
- Screen-space card detail modal geometry: `src/engine/render/inspectorLayout.ts`.
- Card title fitting or truncation: `src/engine/render/cardTypography.ts`.
- Drag physics or GSAP landing: `src/engine/animation/cardMotion.ts`.
- Card hover/held highlight timing: `src/engine/animation/cardMotion.ts`.
- Card-to-inspector transform: `src/engine/animation/cardMotion.ts`, `src/engine/render/cardView.ts`, and `src/engine/render/inspectorRenderer.ts`.
- Hit testing or allowed drop areas: `src/engine/interaction/hitTest.ts`.
- Reusable React overlay spring/popup motion: `src/styles/motion.css`.

## 2. Keep Rules Testable

Prefer pure functions in `src/engine/model`. A placement feature should usually be expressible without Pixi, DOM, or GSAP.

When a rule needs animation side effects, first return a plain effect plan from `src/engine/effects`, then let `createDeskScene.ts` execute that plan. Avoid embedding new rule decisions directly inside Pixi event handlers or render code.

## 3. Keep Units Consistent

- Logical board geometry uses `u/v`.
- Screen drawing uses `x/y`.
- Convert through `createLayout`, `projectWithContext`, or `getSlotPose`.

## 4. Preserve Interaction UX

For drag changes, manually check:

- pointer hover cursor;
- card lift;
- held card remains above every other card;
- held card shape remains readable;
- accepted drop lands into a slot;
- rejected drop returns to the source slot;
- zoom still works within configured min/max.
- info-icon inspector opens as a Pixi modal, blocks the desk, and closes by transforming back into the same card.

For time changes, manually check:

- the clock advances without dragging or redrawing the desk;
- day rollover happens after `18:00`;
- HUD clock assets do not block pointer events on the board.

## 5. Verify

Run:

```bash
npm run build
npm run lint
```

For visual or interaction changes, run the app and smoke-test it in the browser.
