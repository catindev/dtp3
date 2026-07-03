import { create } from 'zustand'
import { initialBoardState } from '../engine/model/boardState'
import { getColumnIdForCard, moveCardToColumn, moveCardToSlot } from '../engine/model/placementRules'
import type { BoardState, CardId, ColumnId, SlotId } from '../engine/model/boardTypes'

type GameStore = BoardState & {
  beginDrag: (cardId: CardId, sourceSlotId: SlotId) => void
  endDrag: () => void
  moveCardToColumn: (cardId: CardId, targetColumnId: ColumnId) => void
  moveCardToSlot: (cardId: CardId, targetSlotId: SlotId) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialBoardState,
  beginDrag: (cardId, sourceSlotId) => {
    set({
      drag: {
        cardId,
        sourceSlotId,
        sourceColumnId: getColumnIdForCard(get(), cardId),
      },
    })
  },
  endDrag: () => {
    set({ drag: null })
  },
  moveCardToColumn: (cardId, targetColumnId) => {
    set((state) => moveCardToColumn(state, cardId, targetColumnId))
  },
  moveCardToSlot: (cardId, targetSlotId) => {
    set((state) => moveCardToSlot(state, cardId, targetSlotId))
  },
}))

export type { BoardCard, BoardColumn, BoardState, CardId, ColumnId, SlotId } from '../engine/model/boardTypes'
