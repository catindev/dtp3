import { BOARD_GEOMETRY } from '../model/gameConstants'

export type Vec2 = {
  x: number
  y: number
}

export type Polygon = Vec2[]

export type ProjectionDimensions = {
  deskWidth: number
  deskDepth: number
}

export type ProjectionContext = ProjectionDimensions & {
  origin: Vec2
  scale: number
}

const perspectiveScale = (v: number, deskDepth: number) =>
  BOARD_GEOMETRY.farEdgeScale +
  (BOARD_GEOMETRY.nearEdgeScale - BOARD_GEOMETRY.farEdgeScale) * (v / deskDepth)

export const projectWithContext = (u: number, v: number, context: ProjectionContext): Vec2 => ({
  x: context.origin.x + (u - context.deskWidth / 2) * context.scale * perspectiveScale(v, context.deskDepth),
  y: context.origin.y + v * BOARD_GEOMETRY.frontTiltY * context.scale,
})

export const projectRaw = (u: number, v: number, dimensions: ProjectionDimensions): Vec2 =>
  projectWithContext(u, v, {
    ...dimensions,
    origin: { x: 0, y: 0 },
    scale: 1,
  })

export const surfaceBasis = (context: ProjectionContext, u: number, v: number) => {
  const origin = projectWithContext(u, v, context)
  const alongU = projectWithContext(u + 1, v, context)
  const alongV = projectWithContext(u, v + 1, context)
  const uAxis = { x: alongU.x - origin.x, y: alongU.y - origin.y }
  const vAxis = { x: alongV.x - origin.x, y: alongV.y - origin.y }

  return {
    rotation: Math.atan2(uAxis.y, uAxis.x),
    scaleX: Math.hypot(uAxis.x, uAxis.y),
    scaleY: Math.hypot(vAxis.x, vAxis.y),
    skewX: Math.atan2(vAxis.x, vAxis.y),
  }
}

export const surfaceOffset = (context: ProjectionContext, u: number, v: number, amountV: number) => {
  const from = projectWithContext(u, v, context)
  const to = projectWithContext(u, v + amountV, context)

  return {
    x: to.x - from.x,
    y: to.y - from.y,
  }
}
