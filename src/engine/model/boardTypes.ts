export const COLUMN_IDS = ['backlog', 'in-progress', 'done'] as const

export type ColumnId = (typeof COLUMN_IDS)[number]
export type CardId = number
export type SlotId = `${ColumnId}:${number}`
export type ColumnRowCounts = Record<ColumnId, number>
export type CardCategory = 'feature' | 'bug' | 'incident' | 'performance' | 'compliance'
export type CardDomain = 'PAY' | 'AUTH' | 'ADM' | 'SRCH' | 'REP' | 'NTF'
export type SubtaskType = 'backend' | 'frontend' | 'SRE' | 'QA'

export type CardStats = {
  pressure: number
  complexity: number
  value: number
  clarity: number
  quality: number
  qa: number
  bugs: number
  impact: number
}

export type CardSubtask = {
  id: number
  title: string
  completed: boolean
  type: SubtaskType
}

export type BoardCard = {
  id: CardId
  title: string
  category: CardCategory
  deadline: number
  domain: CardDomain
  stats: CardStats
  subtasks: CardSubtask[]
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

export const getCardIds = (cards: Record<CardId, BoardCard>) =>
  Object.keys(cards)
    .map(Number)
    .filter(Number.isFinite) as CardId[]
