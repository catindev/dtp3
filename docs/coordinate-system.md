# Coordinate System

The board uses logical surface coordinates before anything is drawn to the screen.

## Board Coordinates

- `u`: horizontal axis across columns.
- `v`: depth axis from far edge to near edge.
- `(0, 0)`: far-left desk corner in logical board space.

The projection lives in `src/engine/layout/projection.ts`. It keeps the desk flat but tilted toward the user:

- `frontTiltY`: vertical compression of depth.
- `farEdgeScale`: screen scale near the far edge.
- `nearEdgeScale`: screen scale near the near edge.

These values are configured in `BOARD_GEOMETRY` inside `src/engine/model/gameConstants.ts`.

Camera composition and zoom limits are calculated in `src/engine/layout/boardLayout.ts`. Camera margins and the reserved top band for the future game header live in `src/engine/layout/viewportConfig.ts`. Runtime camera offset and zoom value are owned by `src/engine/render/sceneViewport.ts`. Zoom is centered on the viewport and constrained so the three playable columns remain the main visible workspace without crossing into the reserved header area.

## Layout Outputs

`createLayout(width, height, zoom, cameraOffset, state)` returns a `SceneLayout` with:

- `deskPolygon`: projected desk shape.
- `columnPolygons`: projected columns by `ColumnId`.
- `slotPolygons`: projected empty card slots by `SlotId`.
- `visibleRows`: number of rows currently visible.
- `scale`, `origin`, `deskWidth`, `deskDepth`: projection context.

Use `getSlotPose(layout, slotId)` for card rest positions. It returns both logical `u/v` and screen `x/y`, which keeps cards, text, hit areas, and shadows aligned to the same math.

## Card Rendering

Idle cards use `getCardRestCorners(layout, restU, restV)`, so they lie on the projected table surface.

Held cards interpolate into a screen-space rectangular shape. The held card still keeps its source `restU/restV` for shadow direction and text interpolation.

Inspector-transition cards use the same principle: Pixi keeps the tabletop card's board rest pose, but interpolates the visible shell into a centered screen-space rectangle and draws modal content above it.

Card titles are formatted by `src/engine/render/cardTypography.ts`. They render as at most two lines; overflowing text is truncated with `...` before Pixi draws it.

Empty slots use the same board-space card width and height as idle cards. Slot stroke is intentionally lighter than card borders, so empty space reads as a placement guide rather than another card.

## Screen-Space UI

The card inspector is not part of board coordinates. Its target screen rectangle and modal-shell hit area are calculated by `src/engine/render/inspectorLayout.ts`. Its content is rendered by `src/engine/render/inspectorRenderer.ts`, driven by modal inspector state from the store and a pure detail model from `src/engine/model/cardDetails.ts`. Pixi owns the shell, backdrop, content, and reverse transformation.

Do not include modal panels in desk width/depth calculations. If a new object should sit on the table, add it to layout geometry explicitly; if it should stay readable during zoom, draw it as a screen-space Pixi overlay or a separate React overlay outside board geometry.
