import { COLUMN_IDS, type BoardState, type CardId, type ColumnId, type SlotId } from './boardTypes'

export const makeSlotId = (columnId: ColumnId, rowIndex: number): SlotId => `${columnId}:${rowIndex}`

export const parseSlotId = (slotId: SlotId) => {
  const [columnId, row] = slotId.split(':') as [ColumnId, string]

  return {
    columnId,
    rowIndex: Number(row),
  }
}

export const getSlotIdForCard = (state: BoardState, cardId: CardId) => state.placements[cardId]

export const getColumnIdForCard = (state: BoardState, cardId: CardId) =>
  parseSlotId(getSlotIdForCard(state, cardId)).columnId

export const getCardsInColumn = (state: BoardState, columnId: ColumnId, ignoredCardId?: CardId) =>
  (Object.keys(state.cards) as CardId[])
    .filter((cardId) => cardId !== ignoredCardId && parseSlotId(state.placements[cardId]).columnId === columnId)
    .sort((a, b) => parseSlotId(state.placements[a]).rowIndex - parseSlotId(state.placements[b]).rowIndex)

export const getColumnSlotCount = (state: BoardState, columnId: ColumnId, ignoredCardId?: CardId) =>
  getCardsInColumn(state, columnId, ignoredCardId).length + 1

export const getColumnSlotCounts = (state: BoardState, ignoredCardId?: CardId) =>
  Object.fromEntries(
    COLUMN_IDS.map((columnId) => [columnId, getColumnSlotCount(state, columnId, ignoredCardId)]),
  ) as Record<ColumnId, number>

export const getVisibleRowCount = (state: BoardState) => {
  const rowCounts = Object.values(getColumnSlotCounts(state))

  return Math.max(...rowCounts)
}

export const isSlotOccupied = (state: BoardState, slotId: SlotId, ignoredCardId?: CardId) =>
  (Object.keys(state.placements) as CardId[]).some(
    (cardId) => cardId !== ignoredCardId && state.placements[cardId] === slotId,
  )

export const getFirstFreeSlot = (state: BoardState, columnId: ColumnId, ignoredCardId?: CardId) => {
  return makeSlotId(columnId, getCardsInColumn(state, columnId, ignoredCardId).length)
}

export const getCompactPlacements = (state: BoardState, ignoredCardId?: CardId) => {
  const placements: Partial<Record<CardId, SlotId>> = {}

  COLUMN_IDS.forEach((columnId) => {
    getCardsInColumn(state, columnId, ignoredCardId).forEach((cardId, rowIndex) => {
      placements[cardId] = makeSlotId(columnId, rowIndex)
    })
  })

  return placements
}

const clampRowIndex = (rowIndex: number, maxRowIndex: number) => Math.min(Math.max(rowIndex, 0), maxRowIndex)

export const moveCardToSlot = (state: BoardState, cardId: CardId, slotId: SlotId): BoardState => {
  const { columnId: targetColumnId, rowIndex } = parseSlotId(slotId)
  const placements: Partial<Record<CardId, SlotId>> = {}

  COLUMN_IDS.forEach((columnId) => {
    const cardIds = getCardsInColumn(state, columnId, cardId)

    if (columnId === targetColumnId) {
      cardIds.splice(clampRowIndex(rowIndex, cardIds.length), 0, cardId)
    }

    cardIds.forEach((nextCardId, nextRowIndex) => {
      placements[nextCardId] = makeSlotId(columnId, nextRowIndex)
    })
  })

  return {
    ...state,
    placements: placements as Record<CardId, SlotId>,
  }
}

export const moveCardToColumn = (state: BoardState, cardId: CardId, targetColumnId: ColumnId): BoardState => {
  const currentColumnId = getColumnIdForCard(state, cardId)

  if (currentColumnId === targetColumnId) {
    return state
  }

  return moveCardToSlot(state, cardId, getFirstFreeSlot(state, targetColumnId, cardId))
}
