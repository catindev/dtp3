import { create } from 'zustand'
import { initialBoardState } from '../engine/model/boardState'
import { getColumnIdForCard, moveCardToColumn, moveCardToSlot } from '../engine/model/placementRules'
import type { BoardState, CardId, ColumnId, SlotId } from '../engine/model/boardTypes'

export type CardInspectorPhase = 'opening' | 'open' | 'closing'

export type CardInspectorState = {
  cardId: CardId
  phase: CardInspectorPhase
}

type GameStore = BoardState & {
  inspector: CardInspectorState | null
  openCardInspector: (cardId: CardId) => void
  completeCardInspectorOpen: () => void
  requestCloseCardInspector: () => void
  finishCloseCardInspector: () => void
  beginDrag: (cardId: CardId, sourceSlotId: SlotId) => void
  endDrag: () => void
  moveCardToColumn: (cardId: CardId, targetColumnId: ColumnId) => void
  moveCardToSlot: (cardId: CardId, targetSlotId: SlotId) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialBoardState,
  inspector: null,
  openCardInspector: (cardId) => {
    set({
      inspector: {
        cardId,
        phase: 'opening',
      },
    })
  },
  completeCardInspectorOpen: () => {
    set((state) => {
      if (!state.inspector || state.inspector.phase !== 'opening') {
        return state
      }

      return {
        inspector: {
          ...state.inspector,
          phase: 'open',
        },
      }
    })
  },
  requestCloseCardInspector: () => {
    set((state) => {
      if (!state.inspector || state.inspector.phase !== 'open') {
        return state
      }

      return {
        inspector: {
          ...state.inspector,
          phase: 'closing',
        },
      }
    })
  },
  finishCloseCardInspector: () => {
    set({ inspector: null })
  },
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
