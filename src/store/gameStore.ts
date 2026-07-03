import { create } from 'zustand'
import { initialBoardState } from '../engine/model/boardState'
import { getColumnIdForCard, moveCardToColumn, moveCardToSlot } from '../engine/model/placementRules'
import type { BoardState, CardId, ColumnId, SlotId } from '../engine/model/boardTypes'

export type InspectorSourceRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CardInspectorState = {
  cardId: CardId
  sourceRect: InspectorSourceRect
  isClosing: boolean
}

type GameStore = BoardState & {
  inspector: CardInspectorState | null
  openCardInspector: (cardId: CardId, sourceRect: InspectorSourceRect) => void
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
  openCardInspector: (cardId, sourceRect) => {
    set({
      inspector: {
        cardId,
        sourceRect,
        isClosing: false,
      },
    })
  },
  requestCloseCardInspector: () => {
    set((state) => {
      if (!state.inspector || state.inspector.isClosing) {
        return state
      }

      return {
        inspector: {
          ...state.inspector,
          isClosing: true,
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
