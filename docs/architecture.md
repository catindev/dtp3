# Architecture

The prototype is split into engine layers so the board can evolve into a game-like system without turning the React component into the main engine.

## Layers

- React: `src/components/IsometricDesk.tsx`
  - Mounts the Pixi scene.
  - Displays zoom controls.
  - Does not know placement rules or projection math.

- Store: `src/store/gameStore.ts`
  - Holds cards, columns, placements, and drag state.
  - Exposes actions for drag lifecycle and card movement.

- Model: `src/engine/model`
  - `boardTypes.ts`: stable domain types.
  - `gameConstants.ts`: board geometry, card size, zoom bounds, colors.
  - `boardState.ts`: initial state.
  - `placementRules.ts`: slot parsing, visible row count, free slot lookup, card moves.

- Layout: `src/engine/layout`
  - Converts board coordinates to screen coordinates.
  - Computes desk, column, slot, and card-rest geometry.

- Effects: `src/engine/effects`
  - Converts model changes into renderer-agnostic effect plans.
  - `boardRowEffects.ts`: compares previous/next row counts, lists removed slots, and decides which board height motion runs immediately vs after slot collapse.

- Render: `src/engine/render`
  - `createDeskScene.ts`: Pixi lifecycle, pointer events, store subscription.
  - Executes effect plans from `src/engine/effects`; it should not decide row growth/shrink rules directly.
  - `boardRenderer.ts`: desk, columns, labels, empty slots.
  - `cardView.ts`: card graphics, card text, shadows, hit polygons.
  - `cardTypography.ts`: title line fitting and two-line ellipsis for card text.
  - `textTransform.ts`: surface-aligned Pixi text transforms.
  - `pixiPrimitives.ts`: reusable polygon drawing and polygon scaling helpers.

- Interaction: `src/engine/interaction`
  - Hit testing for cards and columns.
  - Adjacent-column drop validation.

- Animation: `src/engine/animation`
  - GSAP lift/landing tweens.
  - Per-frame physical drag response.
  - Hover/held visual state tweens for cards.

## Dependency Direction

React can depend on render scene APIs. Render can depend on layout, model, interaction, animation, and store. Model must stay independent from Pixi, React, and GSAP.

```mermaid
flowchart LR
  React["React component"] --> Scene["createDeskScene"]
  Scene --> Store["Zustand store"]
  Scene --> Render["Render helpers"]
  Scene --> Interaction["Interaction helpers"]
  Scene --> Animation["Animation helpers"]
  Scene --> Effects["Effect planners"]
  Render --> Layout["Layout/projection"]
  Interaction --> Layout
  Effects --> Model
  Layout --> Model["Model/constants"]
  Store --> Model
  Animation --> Render
```
