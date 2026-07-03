# Adding Features

Use this checklist when starting a new chat or adding a feature.

## 1. Locate the Layer

- Game rule or placement behavior: `src/engine/model/placementRules.ts`.
- New state or action: `src/store/gameStore.ts`.
- Board/card size or color: `src/engine/model/gameConstants.ts`.
- Projection or slot geometry: `src/engine/layout`.
- Pixi object lifecycle or event wiring: `src/engine/render/createDeskScene.ts`.
- Drawing details: `src/engine/render/boardRenderer.ts` or `src/engine/render/cardView.ts`.
- Drag physics or GSAP landing: `src/engine/animation/cardMotion.ts`.
- Hit testing or allowed drop areas: `src/engine/interaction/hitTest.ts`.

## 2. Keep Rules Testable

Prefer pure functions in `src/engine/model`. A placement feature should usually be expressible without Pixi, DOM, or GSAP.

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

## 5. Verify

Run:

```bash
npm run build
npm run lint
```

For visual or interaction changes, run the app and smoke-test it in the browser.
