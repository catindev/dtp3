import {
  animateBoardGrowth,
  clearBoardGrowth,
  settleBoardGrowth,
  type BoardGrowthMotion,
} from '../animation/boardGrowthMotion'
import {
  clearSlotEffect,
  collapseSlot,
  createSlotCollapseEffect,
  type SlotCollapseEffect,
} from '../animation/slotMotion'
import {
  cloneRows,
  createBoardRowsEffectPlan,
  type BoardRowsMotionEffect,
  type RemovedSlotEffect,
} from '../effects/boardRowEffects'
import { COLUMN_IDS, type ColumnRowCounts, type SlotId } from '../model/boardTypes'

export type SceneRowMotionController = {
  growthMotion: BoardGrowthMotion
  slotEffects: Map<SlotId, SlotCollapseEffect>
  getTargetRows: () => ColumnRowCounts
  syncToRows: (nextRows: ColumnRowCounts) => void
  destroy: () => void
}

type SceneRowMotionOptions = {
  isActive: () => boolean
  onUpdate: () => void
}

export const createSceneRowMotion = (
  initialRows: ColumnRowCounts,
  { isActive, onUpdate }: SceneRowMotionOptions,
): SceneRowMotionController => {
  const growthMotion: BoardGrowthMotion = { columnRows: cloneRows(initialRows) }
  const slotEffects = new Map<SlotId, SlotCollapseEffect>()
  let targetRows = cloneRows(initialRows)
  let motionToken = 0

  const clearRevivedSlotEffects = (nextRows: ColumnRowCounts) => {
    slotEffects.forEach((effect, slotId) => {
      if (effect.rowIndex >= nextRows[effect.columnId]) {
        return
      }

      clearSlotEffect(effect)
      slotEffects.delete(slotId)
    })
  }

  const startRemovedSlotEffects = (removedSlots: RemovedSlotEffect[], onComplete: () => void) => {
    let remainingEffects = 0

    removedSlots.forEach((removedSlot) => {
      const existingEffect = slotEffects.get(removedSlot.slotId)
      const effect = createSlotCollapseEffect(removedSlot.slotId, removedSlot.columnId, removedSlot.rowIndex)

      if (existingEffect) {
        clearSlotEffect(existingEffect)
      }

      remainingEffects += 1
      slotEffects.set(removedSlot.slotId, effect)
      collapseSlot(
        effect,
        onUpdate,
        () => {
          if (slotEffects.get(removedSlot.slotId) === effect) {
            slotEffects.delete(removedSlot.slotId)
          }
          onUpdate()
          remainingEffects -= 1

          if (remainingEffects === 0) {
            onComplete()
          }
        },
      )
    })

    if (remainingEffects === 0) {
      onComplete()
    }
  }

  const applyBoardRowsMotion = (motion: BoardRowsMotionEffect) => {
    if (motion.type === 'grow') {
      animateBoardGrowth(growthMotion, motion.targetRows, onUpdate)
      return
    }

    if (motion.type === 'hold') {
      clearBoardGrowth(growthMotion)
      COLUMN_IDS.forEach((columnId) => {
        growthMotion.columnRows[columnId] = Math.max(growthMotion.columnRows[columnId], motion.targetRows[columnId])
      })
      return
    }

    settleBoardGrowth(growthMotion, motion.targetRows, onUpdate)
  }

  const syncToRows = (nextRowsInput: ColumnRowCounts) => {
    const rowEffectPlan = createBoardRowsEffectPlan(targetRows, nextRowsInput)

    if (!rowEffectPlan.changed) {
      targetRows = cloneRows(rowEffectPlan.nextRows)
      onUpdate()
      return
    }

    const currentToken = (motionToken += 1)
    const runAfterRemovedSlotsMotion = () => {
      if (!isActive() || currentToken !== motionToken) {
        return
      }

      if (rowEffectPlan.afterRemovedSlotsMotion) {
        applyBoardRowsMotion(rowEffectPlan.afterRemovedSlotsMotion)
      }
    }

    targetRows = cloneRows(rowEffectPlan.nextRows)
    clearRevivedSlotEffects(targetRows)

    if (rowEffectPlan.removedSlots.length > 0) {
      startRemovedSlotEffects(rowEffectPlan.removedSlots, runAfterRemovedSlotsMotion)
    }

    if (rowEffectPlan.immediateMotion) {
      applyBoardRowsMotion(rowEffectPlan.immediateMotion)
    }

    if (rowEffectPlan.removedSlots.length === 0) {
      runAfterRemovedSlotsMotion()
    }

    onUpdate()
  }

  return {
    growthMotion,
    slotEffects,
    getTargetRows: () => targetRows,
    syncToRows,
    destroy: () => {
      motionToken += 1
      clearBoardGrowth(growthMotion)
      slotEffects.forEach(clearSlotEffect)
      slotEffects.clear()
    },
  }
}
