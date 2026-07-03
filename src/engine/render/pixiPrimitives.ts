import { Graphics } from 'pixi.js'
import type { Polygon } from '../layout/projection'

export const toFlatPoints = (points: Polygon) => points.flatMap((point) => [point.x, point.y])

export const drawRoundedPolygon = (
  graphics: Graphics,
  polygon: Polygon,
  radius: number,
  fill: number,
  alpha: number,
  stroke = 0,
  strokeAlpha = 0,
  strokeWidth = 1,
) => {
  if (radius <= 0) {
    graphics.poly(toFlatPoints(polygon), true).fill({ color: fill, alpha })
  } else {
    polygon.forEach((point, index) => {
      const previous = polygon[(index - 1 + polygon.length) % polygon.length]
      const next = polygon[(index + 1) % polygon.length]
      const previousDistance = Math.hypot(previous.x - point.x, previous.y - point.y)
      const nextDistance = Math.hypot(next.x - point.x, next.y - point.y)
      const cornerRadius = Math.min(radius, previousDistance / 2, nextDistance / 2)
      const start = {
        x: point.x + ((previous.x - point.x) / previousDistance) * cornerRadius,
        y: point.y + ((previous.y - point.y) / previousDistance) * cornerRadius,
      }
      const end = {
        x: point.x + ((next.x - point.x) / nextDistance) * cornerRadius,
        y: point.y + ((next.y - point.y) / nextDistance) * cornerRadius,
      }

      if (index === 0) {
        graphics.moveTo(start.x, start.y)
      } else {
        graphics.lineTo(start.x, start.y)
      }

      graphics.quadraticCurveTo(point.x, point.y, end.x, end.y, 8)
    })
    graphics.closePath().fill({ color: fill, alpha })
  }

  if (strokeAlpha > 0) {
    graphics.stroke({ color: stroke, alpha: strokeAlpha, width: strokeWidth })
  }
}

export const offsetPolygon = (polygon: Polygon, dx: number, dy: number) =>
  polygon.map((point) => ({
    x: point.x + dx,
    y: point.y + dy,
  }))

export const scalePolygon = (polygon: Polygon, scaleX: number, scaleY = scaleX) =>
  polygon.map((point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  }))

export const scalePolygonFromCenter = (polygon: Polygon, scaleX: number, scaleY = scaleX) => {
  const center = polygon.reduce(
    (sum, point) => ({
      x: sum.x + point.x / polygon.length,
      y: sum.y + point.y / polygon.length,
    }),
    { x: 0, y: 0 },
  )

  return polygon.map((point) => ({
    x: center.x + (point.x - center.x) * scaleX,
    y: center.y + (point.y - center.y) * scaleY,
  }))
}
