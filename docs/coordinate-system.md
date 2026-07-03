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
