import { Graphics, Text } from 'pixi.js'
import { COLUMN_IDS, type BoardState, type CardId, type ColumnId, type SlotId } from '../model/boardTypes'
import { BOARD_GEOMETRY, CARD_SIZE, TOKENS } from '../model/gameConstants'
import { getColumnU, getSlotPolygon, type SceneLayout } from '../layout/boardLayout'
import { projectWithContext } from '../layout/projection'
import { getCompactPlacements, parseSlotId } from '../model/placementRules'
import type { SlotCollapseEffect } from '../animation/slotMotion'
import { drawRoundedPolygon, scalePolygonFromCenter } from './pixiPrimitives'
import { applySurfaceTextTransform } from './textTransform'

const DESK_EDGE_VISIBILITY_MARGIN = 42

const shouldDrawFiniteDesk = (layout: SceneLayout) => {
  const minX = Math.min(...layout.deskPolygon.map((point) => point.x))
  const maxX = Math.max(...layout.deskPolygon.map((point) => point.x))
  const minY = Math.min(...layout.deskPolygon.map((point) => point.y))
  const maxY = Math.max(...layout.deskPolygon.map((point) => point.y))

  return (
    minX >= DESK_EDGE_VISIBILITY_MARGIN &&
    maxX <= layout.width - DESK_EDGE_VISIBILITY_MARGIN &&
    minY >= DESK_EDGE_VISIBILITY_MARGIN &&
    maxY <= layout.height - DESK_EDGE_VISIBILITY_MARGIN
  )
}

export const createColumnLabel = (title: string) => {
  const label = new Text({
    text: title,
    style: {
      fill: TOKENS.text.primary,
      fontFamily: 'Onest Variable, ui-sans-serif, system-ui, sans-serif',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0,
    },
  })

  label.anchor.set(0.5)

  return label
}

export const drawBoard = (graphics: Graphics, layout: SceneLayout) => {
  graphics.clear()

  if (!shouldDrawFiniteDesk(layout)) {
    graphics.rect(0, 0, layout.width, layout.height).fill({ color: TOKENS.desk.fill, alpha: 0.72 })
    return
  }

  drawRoundedPolygon(
    graphics,
    layout.deskPolygon,
    TOKENS.desk.radius * layout.scale,
    TOKENS.desk.fill,
    1,
    TOKENS.desk.border,
    1,
    1.5 * layout.scale,
  )
}

export const drawColumns = (
  graphics: Graphics,
  labels: Map<ColumnId, Text>,
  layout: SceneLayout,
  state: BoardState,
  hoverColumnId: ColumnId | null,
  hoverSlotId: SlotId | null,
  slotEffects: Iterable<SlotCollapseEffect> = [],
) => {
  graphics.clear()
  const visualPlacements = getCompactPlacements(state)

  drawRoundedPolygon(
    graphics,
    layout.inspectorSectionPolygon,
    TOKENS.column.radius * layout.scale,
    TOKENS.column.fill,
    1,
    TOKENS.column.border,
    1,
    1.5 * layout.scale,
  )

  state.columns.forEach((column) => {
    const columnIndex = COLUMN_IDS.indexOf(column.id)
    const polygon = layout.columnPolygons[column.id]
    const isHovered = hoverColumnId === column.id
    const fill = isHovered ? TOKENS.column.hoverFill : TOKENS.column.fill
    const stroke = isHovered ? TOKENS.column.hoverBorder : TOKENS.column.border
    const occupiedRows = new Set<number>(
      (Object.keys(visualPlacements) as CardId[])
        .filter((cardId) => visualPlacements[cardId])
        .filter((cardId) => parseSlotId(visualPlacements[cardId]!).columnId === column.id)
        .map((cardId) => parseSlotId(visualPlacements[cardId]!).rowIndex),
    )
    const label = labels.get(column.id)

    drawRoundedPolygon(
      graphics,
      polygon,
      TOKENS.column.radius * layout.scale,
      fill,
      1,
      stroke,
      1,
      1.5 * layout.scale,
    )

    for (let rowIndex = 0; rowIndex < layout.slotRowsByColumn[column.id]; rowIndex += 1) {
      const slotId = `${column.id}:${rowIndex}` as SlotId
      const rowTop =
        BOARD_GEOMETRY.deskPaddingV +
        BOARD_GEOMETRY.cardStartV +
        rowIndex * (CARD_SIZE.height + BOARD_GEOMETRY.cardGapV) +
        BOARD_GEOMETRY.slotOffsetV
      const u = getColumnU(columnIndex) + BOARD_GEOMETRY.cardInsetU + BOARD_GEOMETRY.slotOffsetU
      const slot = [
        projectWithContext(u, rowTop, layout),
        projectWithContext(u + CARD_SIZE.width + BOARD_GEOMETRY.slotExtraWidth, rowTop, layout),
        projectWithContext(
          u + CARD_SIZE.width + BOARD_GEOMETRY.slotExtraWidth,
          rowTop + CARD_SIZE.height + BOARD_GEOMETRY.slotExtraHeight,
          layout,
        ),
        projectWithContext(u, rowTop + CARD_SIZE.height + BOARD_GEOMETRY.slotExtraHeight, layout),
      ]
      const isDropSlot = hoverSlotId === slotId
      const isOccupied = occupiedRows.has(rowIndex)
      const slotRadius = TOKENS.slot.radius * layout.scale
      const slotBorder = isDropSlot ? TOKENS.slot.dropBorder : TOKENS.slot.emptyBorder
      const slotBorderAlpha = isDropSlot ? 0.65 : 0.5

      drawRoundedPolygon(
        graphics,
        slot,
        slotRadius,
        isDropSlot ? TOKENS.slot.dropFill : TOKENS.card.fill,
        isDropSlot ? 0.55 : isOccupied ? 0.08 : 0.18,
        isOccupied ? 0 : slotBorder,
        isOccupied ? 0 : slotBorderAlpha,
        1.25 * layout.scale,
      )
    }

    if (label) {
      const labelU = getColumnU(columnIndex) + BOARD_GEOMETRY.columnWidth / 2
      const labelV = BOARD_GEOMETRY.deskPaddingV - BOARD_GEOMETRY.columnLabelGapV
      const labelPoint = projectWithContext(labelU, labelV, layout)

      label.x = labelPoint.x
      label.y = labelPoint.y
      applySurfaceTextTransform(label, layout, labelU, labelV, 0.92)
      label.alpha = 0.92
    }
  })

  for (const effect of slotEffects) {
    drawRoundedPolygon(
      graphics,
      scalePolygonFromCenter(getSlotPolygon(layout, effect.columnId, effect.rowIndex), effect.scale),
      TOKENS.card.radius * layout.scale * effect.scale,
      TOKENS.card.fill,
      effect.alpha,
      TOKENS.card.border,
      effect.alpha * 0.75,
      1.25 * layout.scale,
    )
  }
}
