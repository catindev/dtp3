export const COLUMN_IDS = ['backlog', 'in-progress', 'done'] as const

export type ColumnId = (typeof COLUMN_IDS)[number]
export type CardId = 'card-1' | 'card-2' | 'card-3' | 'card-4'
export type SlotId = `${ColumnId}:${number}`
export type ColumnRowCounts = Record<ColumnId, number>

export type BoardCard = {
  id: CardId
  title: string
  kicker: string
  accent: number
}

export type BoardColumn = {
  id: ColumnId
  title: string
}

export type DragState = {
  cardId: CardId
  sourceColumnId: ColumnId
  sourceSlotId: SlotId
} | null

export type BoardState = {
  cards: Record<CardId, BoardCard>
  columns: BoardColumn[]
  placements: Record<CardId, SlotId>
  drag: DragState
}
