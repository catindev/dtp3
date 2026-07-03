import { COLUMN_IDS, type BoardState, type ColumnId, type ColumnRowCounts, type SlotId } from '../model/boardTypes'
import { BOARD_GEOMETRY, CARD_SIZE } from '../model/gameConstants'
import { getColumnSlotCounts, makeSlotId, parseSlotId } from '../model/placementRules'
import { projectRaw, projectWithContext, type Polygon, type ProjectionContext, type Vec2 } from './projection'

export type SceneLayout = ProjectionContext & {
  width: number
  height: number
  visibleRows: number
  surfaceRows: number
  slotRowsByColumn: ColumnRowCounts
  surfaceRowsByColumn: ColumnRowCounts
  columnDepths: ColumnRowCounts
  deskPolygon: Polygon
  columnPolygons: Record<ColumnId, Polygon>
  dropColumnPolygons: Record<ColumnId, Polygon>
  slotPolygons: Record<SlotId, Polygon>
}

export type SlotPose = {
  slotId: SlotId
  columnId: ColumnId
  rowIndex: number
  u: number
  v: number
  x: number
  y: number
  polygon: Polygon
}

export const getColumnU = (columnIndex: number) =>
  BOARD_GEOMETRY.deskPaddingU + columnIndex * (BOARD_GEOMETRY.columnWidth + BOARD_GEOMETRY.columnGap)

export const getColumnDepth = (visibleRows: number) =>
  BOARD_GEOMETRY.cardStartV +
  visibleRows * CARD_SIZE.height +
  Math.max(0, visibleRows - 1) * BOARD_GEOMETRY.cardGapV +
  BOARD_GEOMETRY.columnBottomPaddingV

export const getDeskWidth = () =>
  BOARD_GEOMETRY.deskPaddingU * 2 +
  BOARD_GEOMETRY.columnWidth * COLUMN_IDS.length +
  BOARD_GEOMETRY.columnGap * (COLUMN_IDS.length - 1)

export const getDeskDepth = (visibleRows: number) =>
  BOARD_GEOMETRY.deskPaddingV * 2 + getColumnDepth(visibleRows)

export type LayoutOptions = {
  surfaceRowsByColumn?: ColumnRowCounts
  slotRowsByColumn?: ColumnRowCounts
}

const getMaxRows = (rowsByColumn: ColumnRowCounts) => Math.max(...COLUMN_IDS.map((columnId) => rowsByColumn[columnId]))

const mergeRows = (fallback: ColumnRowCounts, override?: ColumnRowCounts) =>
  Object.fromEntries(
    COLUMN_IDS.map((columnId) => [columnId, Math.max(1, override?.[columnId] ?? fallback[columnId])]),
  ) as ColumnRowCounts

export const getSlotPolygon = (layout: SceneLayout, columnId: ColumnId, rowIndex: number): Polygon => {
  const columnIndex = COLUMN_IDS.indexOf(columnId)
  const topV =
    BOARD_GEOMETRY.deskPaddingV +
    BOARD_GEOMETRY.cardStartV +
    rowIndex * (CARD_SIZE.height + BOARD_GEOMETRY.cardGapV) +
    BOARD_GEOMETRY.slotOffsetV
  const leftU = getColumnU(columnIndex) + BOARD_GEOMETRY.cardInsetU + BOARD_GEOMETRY.slotOffsetU
  const widthU = CARD_SIZE.width + BOARD_GEOMETRY.slotExtraWidth
  const depthV = CARD_SIZE.height + BOARD_GEOMETRY.slotExtraHeight

  return [
    projectWithContext(leftU, topV, layout),
    projectWithContext(leftU + widthU, topV, layout),
    projectWithContext(leftU + widthU, topV + depthV, layout),
    projectWithContext(leftU, topV + depthV, layout),
  ]
}

export const createLayout = (
  width: number,
  height: number,
  zoom: number,
  cameraOffset: Vec2,
  state: BoardState,
  options: LayoutOptions = {},
): SceneLayout => {
  const ruleSlotRowsByColumn = getColumnSlotCounts(state)
  const slotRowsByColumn = mergeRows(ruleSlotRowsByColumn, options.slotRowsByColumn)
  const surfaceRowsByColumn = mergeRows(slotRowsByColumn, options.surfaceRowsByColumn)
  const visibleRows = getMaxRows(slotRowsByColumn)
  const surfaceRows = getMaxRows(surfaceRowsByColumn)
  const columnDepths = Object.fromEntries(
    COLUMN_IDS.map((columnId) => [columnId, getColumnDepth(surfaceRowsByColumn[columnId])]),
  ) as ColumnRowCounts
  const deskWidth = getDeskWidth()
  const deskDepth = getDeskDepth(surfaceRows)
  const dimensions = { deskWidth, deskDepth }
  const rawCorners = [
    projectRaw(0, 0, dimensions),
    projectRaw(deskWidth, 0, dimensions),
    projectRaw(deskWidth, deskDepth, dimensions),
    projectRaw(0, deskDepth, dimensions),
  ]
  const minX = Math.min(...rawCorners.map((point) => point.x))
  const maxX = Math.max(...rawCorners.map((point) => point.x))
  const minY = Math.min(...rawCorners.map((point) => point.y))
  const maxY = Math.max(...rawCorners.map((point) => point.y))
  const rawWidth = maxX - minX
  const rawHeight = maxY - minY
  const baseScale = Math.min(Math.max(Math.min((width - 80) / rawWidth, (height - 104) / rawHeight), 0.45), 1.12)
  const scale = baseScale * zoom
  const origin = {
    x: width / 2 - ((minX + rawWidth / 2) * scale) + cameraOffset.x,
    y: Math.max(26, height / 2 - (rawHeight * scale) / 2 - minY * scale) + cameraOffset.y,
  }
  const context = { origin, scale, deskWidth, deskDepth }
  const deskPolygon = [
    projectWithContext(0, 0, context),
    projectWithContext(deskWidth, 0, context),
    projectWithContext(deskWidth, deskDepth, context),
    projectWithContext(0, deskDepth, context),
  ]
  const columnPolygons = Object.fromEntries(
    COLUMN_IDS.map((id, index) => {
      const u = getColumnU(index)
      const v = BOARD_GEOMETRY.deskPaddingV
      const columnDepth = columnDepths[id]

      return [
        id,
        [
          projectWithContext(u, v, context),
          projectWithContext(u + BOARD_GEOMETRY.columnWidth, v, context),
          projectWithContext(u + BOARD_GEOMETRY.columnWidth, v + columnDepth, context),
          projectWithContext(u, v + columnDepth, context),
        ],
      ]
    }),
  ) as Record<ColumnId, Polygon>
  const dropColumnPolygons = Object.fromEntries(
    COLUMN_IDS.map((id, index) => {
      const u = getColumnU(index)
      const v = BOARD_GEOMETRY.deskPaddingV
      const dropDepth = Math.max(getColumnDepth(visibleRows), deskDepth - BOARD_GEOMETRY.deskPaddingV * 2)

      return [
        id,
        [
          projectWithContext(u, v, context),
          projectWithContext(u + BOARD_GEOMETRY.columnWidth, v, context),
          projectWithContext(u + BOARD_GEOMETRY.columnWidth, v + dropDepth, context),
          projectWithContext(u, v + dropDepth, context),
        ],
      ]
    }),
  ) as Record<ColumnId, Polygon>
  const slotPolygons = Object.fromEntries(
    COLUMN_IDS.flatMap((columnId, columnIndex) =>
      Array.from({ length: slotRowsByColumn[columnId] }, (_, rowIndex) => {
        const slotId = makeSlotId(columnId, rowIndex)
        const topV =
          BOARD_GEOMETRY.deskPaddingV +
          BOARD_GEOMETRY.cardStartV +
          rowIndex * (CARD_SIZE.height + BOARD_GEOMETRY.cardGapV) +
          BOARD_GEOMETRY.slotOffsetV
        const leftU = getColumnU(columnIndex) + BOARD_GEOMETRY.cardInsetU + BOARD_GEOMETRY.slotOffsetU
        const widthU = CARD_SIZE.width + BOARD_GEOMETRY.slotExtraWidth
        const depthV = CARD_SIZE.height + BOARD_GEOMETRY.slotExtraHeight

        return [
          slotId,
          [
            projectWithContext(leftU, topV, context),
            projectWithContext(leftU + widthU, topV, context),
            projectWithContext(leftU + widthU, topV + depthV, context),
            projectWithContext(leftU, topV + depthV, context),
          ],
        ]
      }),
    ),
  ) as Record<SlotId, Polygon>

  return {
    width,
    height,
    visibleRows,
    surfaceRows,
    slotRowsByColumn,
    surfaceRowsByColumn,
    columnDepths,
    deskPolygon,
    columnPolygons,
    dropColumnPolygons,
    slotPolygons,
    ...context,
  }
}

export const getSlotPose = (layout: SceneLayout, slotId: SlotId): SlotPose => {
  const { columnId, rowIndex } = parseSlotId(slotId)
  const columnIndex = COLUMN_IDS.indexOf(columnId)
  const u = getColumnU(columnIndex) + BOARD_GEOMETRY.cardInsetU + CARD_SIZE.width / 2
  const v =
    BOARD_GEOMETRY.deskPaddingV +
    BOARD_GEOMETRY.cardStartV +
    rowIndex * (CARD_SIZE.height + BOARD_GEOMETRY.cardGapV) +
    CARD_SIZE.height / 2
  const point = projectWithContext(u, v, layout)

  return {
    slotId,
    columnId,
    rowIndex,
    u,
    v,
    x: point.x,
    y: point.y,
    polygon: layout.slotPolygons[slotId],
  }
}

export const getCardRestCorners = (layout: SceneLayout, centerU: number, centerV: number) => {
  const center = projectWithContext(centerU, centerV, layout)

  return [
    projectWithContext(centerU - CARD_SIZE.width / 2, centerV - CARD_SIZE.height / 2, layout),
    projectWithContext(centerU + CARD_SIZE.width / 2, centerV - CARD_SIZE.height / 2, layout),
    projectWithContext(centerU + CARD_SIZE.width / 2, centerV + CARD_SIZE.height / 2, layout),
    projectWithContext(centerU - CARD_SIZE.width / 2, centerV + CARD_SIZE.height / 2, layout),
  ].map((point) => ({
    x: point.x - center.x,
    y: point.y - center.y,
  }))
}
