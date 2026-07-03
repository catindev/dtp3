# Adding Features

Use this checklist when starting a new chat or adding a feature.

## 1. Locate the Layer

- Game rule or placement behavior: `src/engine/model/placementRules.ts`.
- State transition side effects such as slot collapse or board growth order: `src/engine/effects`.
- New state or action: `src/store/gameStore.ts`.
- New card data fields: `src/engine/model/boardTypes.ts` and `src/engine/model/boardState.ts`.
- Card labels, colors, codes, risk text, or HUD detail derivation: `src/engine/model/cardPresentation.ts` and `src/engine/model/cardDetails.ts`.
- Board/card size or color: `src/engine/model/gameConstants.ts`.
- Projection or slot geometry: `src/engine/layout`.
- Pixi object lifecycle, event wiring, and effect execution: `src/engine/render/createDeskScene.ts`.
- Drawing details: `src/engine/render/boardRenderer.ts` or `src/engine/render/cardView.ts`.
- Per-frame card redraw scheduling: `src/engine/render/cardMotionLoop.ts`.
- Screen-space card detail UI: `src/components/card-inspector`.
- Card title fitting or truncation: `src/engine/render/cardTypography.ts`.
- Drag physics or GSAP landing: `src/engine/animation/cardMotion.ts`.
- Card hover/held highlight timing: `src/engine/animation/cardMotion.ts`.
- Hit testing or allowed drop areas: `src/engine/interaction/hitTest.ts`.

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
- hovered-card inspector appears without changing desk geometry.

## 5. Verify

Run:

```bash
npm run build
npm run lint
```

For visual or interaction changes, run the app and smoke-test it in the browser.
