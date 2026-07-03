import { COLUMN_IDS, type ColumnId, type ColumnRowCounts, type SlotId } from '../model/boardTypes'
import { makeSlotId } from '../model/placementRules'

export type RemovedSlotEffect = {
  slotId: SlotId
  columnId: ColumnId
  rowIndex: number
}

export type BoardRowsMotionEffect =
  | {
      type: 'grow'
      targetRows: ColumnRowCounts
    }
  | {
      type: 'hold'
      targetRows: ColumnRowCounts
    }
  | {
      type: 'settle'
      targetRows: ColumnRowCounts
    }

export type BoardRowsEffectPlan = {
  changed: boolean
  nextRows: ColumnRowCounts
  removedSlots: RemovedSlotEffect[]
  immediateMotion: BoardRowsMotionEffect | null
  afterRemovedSlotsMotion: BoardRowsMotionEffect | null
}

export const cloneRows = (rows: ColumnRowCounts) =>
  Object.fromEntries(COLUMN_IDS.map((columnId) => [columnId, rows[columnId]])) as ColumnRowCounts

export const rowsChanged = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  COLUMN_IDS.some((columnId) => Math.abs(from[columnId] - to[columnId]) > 0.001)

const hasRowGrowth = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  COLUMN_IDS.some((columnId) => to[columnId] > from[columnId])

const hasRowShrink = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  COLUMN_IDS.some((columnId) => to[columnId] < from[columnId])

const getRowsWithDelayedShrink = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  Object.fromEntries(
    COLUMN_IDS.map((columnId) => [columnId, to[columnId] > from[columnId] ? to[columnId] : from[columnId]]),
  ) as ColumnRowCounts

const getRemovedSlotEffects = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  COLUMN_IDS.flatMap((columnId) =>
    Array.from({ length: Math.max(0, from[columnId] - to[columnId]) }, (_, index) => {
      const rowIndex = to[columnId] + index

      return {
        slotId: makeSlotId(columnId, rowIndex),
        columnId,
        rowIndex,
      } satisfies RemovedSlotEffect
    }),
  )

export const createBoardRowsEffectPlan = (
  previousRows: ColumnRowCounts,
  nextRowsInput: ColumnRowCounts,
): BoardRowsEffectPlan => {
  const nextRows = cloneRows(nextRowsInput)

  if (!rowsChanged(previousRows, nextRows)) {
    return {
      changed: false,
      nextRows,
      removedSlots: [],
      immediateMotion: null,
      afterRemovedSlotsMotion: null,
    }
  }

  const shouldGrow = hasRowGrowth(previousRows, nextRows)
  const shouldShrink = hasRowShrink(previousRows, nextRows)
  const removedSlots = shouldShrink ? getRemovedSlotEffects(previousRows, nextRows) : []

  return {
    changed: true,
    nextRows,
    removedSlots,
    immediateMotion: shouldGrow
      ? {
          type: 'grow',
          targetRows: shouldShrink ? getRowsWithDelayedShrink(previousRows, nextRows) : nextRows,
        }
      : shouldShrink
        ? {
            type: 'hold',
            targetRows: cloneRows(previousRows),
          }
        : {
            type: 'settle',
            targetRows: nextRows,
          },
    afterRemovedSlotsMotion: shouldShrink
      ? {
          type: 'settle',
          targetRows: nextRows,
        }
      : null,
  }
}
