import { gsap } from 'gsap'
import type { ColumnId, SlotId } from '../model/boardTypes'

export type SlotCollapseEffect = {
  slotId: SlotId
  columnId: ColumnId
  rowIndex: number
  scale: number
  alpha: number
}

export const createSlotCollapseEffect = (slotId: SlotId, columnId: ColumnId, rowIndex: number) => ({
  slotId,
  columnId,
  rowIndex,
  scale: 1,
  alpha: 0.18,
}) satisfies SlotCollapseEffect

export const collapseSlot = (
  effect: SlotCollapseEffect,
  onUpdate: () => void,
  onComplete: () => void,
) => {
  gsap.killTweensOf(effect)
  gsap
    .timeline({
      onUpdate,
      onComplete,
    })
    .to(effect, {
      scale: 1.1,
      alpha: 0.24,
      duration: 0.12,
      ease: 'power2.out',
    })
    .to(effect, {
      scale: 0,
      alpha: 0,
      duration: 0.28,
      ease: 'back.in(1.9)',
    })
}

export const clearSlotEffect = (effect: SlotCollapseEffect) => {
  gsap.killTweensOf(effect)
}
