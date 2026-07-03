import { BOARD_GEOMETRY } from '../model/gameConstants'

export const BACKGROUND_BASE_COLOR = '#e9e1ce'
export const BACKGROUND_DPR_LIMIT = 0.9
export const BACKGROUND_FRAME_INTERVAL_MS = 0

const SHAPE_CELL_WIDTH = 126
const SHAPE_CELL_HEIGHT = 118
const LINE_COLORS = [
  'rgba(122, 104, 76, 0.09)',
  'rgba(95, 80, 57, 0.07)',
  'rgba(201, 112, 42, 0.08)',
  'rgba(255, 253, 246, 0.16)',
]
const TRIANGLE_COLORS = [
  'rgba(122, 104, 76, 0.07)',
  'rgba(165, 139, 82, 0.07)',
  'rgba(201, 112, 42, 0.075)',
  'rgba(255, 253, 246, 0.145)',
]

type Vec2 = {
  x: number
  y: number
}

type BackgroundProjection = {
  width: number
  originY: number
  surfaceWidth: number
  surfaceDepth: number
}

type BackgroundCell = {
  row: number
  col: number
  kind: 'line' | 'triangle'
  jitterX: number
  jitterY: number
  rotation: number
  scale: number
  color: string
  size: number
  strokeWidth: number
  variant: number
}

export type BackgroundPattern = {
  width: number
  height: number
  projection: BackgroundProjection
  cells: BackgroundCell[]
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const hashCell = (x: number, y: number, salt: number) => {
  let hash = Math.imul(x + 1013, 374761393) ^ Math.imul(y + 668265263, 1274126177)
  hash = (hash ^ Math.imul(salt + 37, 1597334677)) >>> 0
  hash ^= hash >>> 13
  return ((Math.imul(hash, 1274126177) >>> 0) / 4294967295)
}

const pickColor = (palette: string[], seed: number) =>
  palette[Math.min(palette.length - 1, Math.floor(seed * palette.length))]

const getPerspectiveScale = (v: number, surfaceDepth: number) => {
  const progress = clamp(v / surfaceDepth, 0, 1)

  return (
    BOARD_GEOMETRY.farEdgeScale +
    (BOARD_GEOMETRY.nearEdgeScale - BOARD_GEOMETRY.farEdgeScale) * progress
  )
}

const projectBackgroundPoint = (
  { width, originY, surfaceWidth, surfaceDepth }: BackgroundProjection,
  point: Vec2,
): Vec2 => {
  const scale = getPerspectiveScale(point.y, surfaceDepth)

  return {
    x: width / 2 + (point.x - surfaceWidth / 2) * scale,
    y: originY + point.y * BOARD_GEOMETRY.frontTiltY,
  }
}

const rotateSurfacePoint = (x: number, y: number, rotation: number): Vec2 => {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

const getProjectedStrokeWidth = (
  strokeWidth: number,
  projection: BackgroundProjection,
  v: number,
) => strokeWidth * (0.62 + getPerspectiveScale(v, projection.surfaceDepth) * 0.34)

const drawProjectedLineFigure = (
  ctx: CanvasRenderingContext2D,
  projection: BackgroundProjection,
  center: Vec2,
  rotation: number,
  length: number,
  strokeWidth: number,
) => {
  const start = rotateSurfacePoint(-length / 2, 0, rotation)
  const end = rotateSurfacePoint(length / 2, 0, rotation)
  const screenStart = projectBackgroundPoint(projection, {
    x: center.x + start.x,
    y: center.y + start.y,
  })
  const screenEnd = projectBackgroundPoint(projection, {
    x: center.x + end.x,
    y: center.y + end.y,
  })

  ctx.lineCap = 'round'
  ctx.lineWidth = getProjectedStrokeWidth(strokeWidth, projection, center.y)
  ctx.beginPath()
  ctx.moveTo(screenStart.x, screenStart.y)
  ctx.lineTo(screenEnd.x, screenEnd.y)
  ctx.stroke()
}

const drawProjectedTriangleFigure = (
  ctx: CanvasRenderingContext2D,
  projection: BackgroundProjection,
  center: Vec2,
  rotation: number,
  size: number,
  strokeWidth: number,
  variant: number,
) => {
  const skew = (variant - 0.5) * 0.16
  const topY = -size * (0.55 + skew)
  const leftX = -size * (0.48 - skew * 0.35)
  const rightX = size * (0.48 + skew * 0.35)
  const bottomY = size * 0.42
  const points = [
    rotateSurfacePoint(0, topY, rotation),
    rotateSurfacePoint(rightX, bottomY, rotation),
    rotateSurfacePoint(leftX, bottomY, rotation),
  ].map((point) =>
    projectBackgroundPoint(projection, {
      x: center.x + point.x,
      y: center.y + point.y,
    }),
  )

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = getProjectedStrokeWidth(strokeWidth, projection, center.y)
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  ctx.lineTo(points[1].x, points[1].y)
  ctx.lineTo(points[2].x, points[2].y)
  ctx.closePath()
  ctx.stroke()
}

export const createBackgroundPattern = (width: number, height: number): BackgroundPattern => {
  const projection = {
    width,
    originY: -height * 0.18,
    surfaceWidth: width * 1.62,
    surfaceDepth: (height * 1.32) / BOARD_GEOMETRY.frontTiltY,
  }
  const rows = Math.ceil(projection.surfaceDepth / SHAPE_CELL_HEIGHT) + 5
  const cols = Math.ceil(projection.surfaceWidth / SHAPE_CELL_WIDTH) + 8
  const cells: BackgroundCell[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const kindSeed = hashCell(col, row, 1)
      const kind = kindSeed > 0.62 ? 'triangle' : 'line'

      cells.push({
        row,
        col,
        kind,
        jitterX: (hashCell(col, row, 2) - 0.5) * 42,
        jitterY: (hashCell(col, row, 3) - 0.5) * 34,
        rotation: hashCell(col, row, 4) * Math.PI,
        scale: 0.82 + hashCell(col, row, 5) * 0.42,
        color:
          kind === 'triangle'
            ? pickColor(TRIANGLE_COLORS, hashCell(col, row, 6))
            : pickColor(LINE_COLORS, hashCell(col, row, 9)),
        size:
          kind === 'triangle'
            ? 34 + hashCell(col, row, 7) * 18
            : 34 + hashCell(col, row, 10) * 28,
        strokeWidth:
          kind === 'triangle'
            ? 5.5
            : 6 + hashCell(col, row, 11) * 2,
        variant: hashCell(col, row, 8),
      })
    }
  }

  return {
    width,
    height,
    projection,
    cells,
  }
}

export const drawBackgroundPattern = (
  ctx: CanvasRenderingContext2D,
  pattern: BackgroundPattern,
  time: number,
  parallaxX: number,
  parallaxY: number,
) => {
  const { width, height, projection } = pattern
  const offsetX =
    ((time * 16 + parallaxX * 18) % SHAPE_CELL_WIDTH) - SHAPE_CELL_WIDTH * 2
  const offsetY =
    ((time * 9 + parallaxY * 12) % SHAPE_CELL_HEIGHT) - SHAPE_CELL_HEIGHT * 2

  for (const cell of pattern.cells) {
    const stagger = cell.row % 2 === 0 ? 0 : SHAPE_CELL_WIDTH / 2
    const x = cell.col * SHAPE_CELL_WIDTH + stagger + offsetX + cell.jitterX
    const y = cell.row * SHAPE_CELL_HEIGHT + offsetY + cell.jitterY
    const wave = Math.sin(time * 1.45 + cell.row * 0.62 + cell.col * 0.38)
    const slowWave = Math.cos(time * 0.58 + cell.row * 0.29 - cell.col * 0.45)
    const center = {
      x: x + wave * 6 + parallaxX * (4 + cell.row * 0.06),
      y: y + slowWave * 5 + parallaxY * (4 + cell.col * 0.04),
    }
    const screenCenter = projectBackgroundPoint(projection, center)

    if (
      screenCenter.x < -100 ||
      screenCenter.x > width + 100 ||
      screenCenter.y < -100 ||
      screenCenter.y > height + 100
    ) {
      continue
    }

    const scale = cell.scale + wave * 0.028
    const rotation =
      cell.rotation + Math.sin(time * 0.62 + cell.row * 0.3 + cell.col * 0.24) * 0.065

    ctx.globalAlpha = 0.48 + slowWave * 0.1
    ctx.strokeStyle = cell.color

    if (cell.kind === 'triangle') {
      drawProjectedTriangleFigure(
        ctx,
        projection,
        center,
        rotation,
        cell.size * scale,
        cell.strokeWidth * scale,
        cell.variant,
      )
      continue
    }

    drawProjectedLineFigure(
      ctx,
      projection,
      center,
      rotation,
      cell.size * scale,
      cell.strokeWidth * scale,
    )
  }

  ctx.globalAlpha = 1
}
