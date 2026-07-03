import { Graphics, Text } from 'pixi.js'
import { COLUMN_IDS, type BoardState, type CardId, type ColumnId, type SlotId } from '../model/boardTypes'
import { BOARD_GEOMETRY, CARD_SIZE, TOKENS } from '../model/gameConstants'
import { getColumnU, getSlotPolygon, type SceneLayout } from '../layout/boardLayout'
import { projectWithContext } from '../layout/projection'
import { getCompactPlacements, parseSlotId } from '../model/placementRules'
import type { SlotCollapseEffect } from '../animation/slotMotion'
import { drawRoundedPolygon, scalePolygonFromCenter } from './pixiPrimitives'

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
      const slotBorderAlpha = isDropSlot ? 0.65 : 0.75

      drawRoundedPolygon(
        graphics,
        slot,
        slotRadius,
        isDropSlot ? TOKENS.slot.dropFill : TOKENS.card.fill,
        isDropSlot ? 0.55 : isOccupied ? 0.08 : 0.18,
        isOccupied ? 0 : slotBorder,
        isOccupied ? 0 : slotBorderAlpha,
        1.5 * layout.scale,
      )
    }

    if (label) {
      const labelU = getColumnU(columnIndex) + BOARD_GEOMETRY.columnWidth / 2
      const labelV = BOARD_GEOMETRY.columnLabelV
      const labelPoint = projectWithContext(labelU, labelV, layout)

      label.x = labelPoint.x
      label.y = labelPoint.y
      label.rotation = 0
      label.skew.set(0, 0)
      label.scale.set(Math.max(0.82, Math.min(layout.scale * 0.92, 1.08)))
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
