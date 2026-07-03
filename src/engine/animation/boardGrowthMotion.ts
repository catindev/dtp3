import { gsap } from 'gsap'
import type { ColumnRowCounts } from '../model/boardTypes'

export type BoardGrowthMotion = {
  columnRows: ColumnRowCounts
}

export const animateBoardGrowth = (
  motion: BoardGrowthMotion,
  targetRows: ColumnRowCounts,
  onUpdate: () => void,
) => {
  gsap.killTweensOf(motion.columnRows)
  gsap.to(motion.columnRows, {
    ...targetRows,
    duration: 0.82,
    ease: 'elastic.out(1, 0.48)',
    onUpdate,
    onComplete: () => {
      Object.assign(motion.columnRows, targetRows)
      onUpdate()
    },
  })
}

export const settleBoardGrowth = (
  motion: BoardGrowthMotion,
  targetRows: ColumnRowCounts,
  onUpdate: () => void,
) => {
  gsap.killTweensOf(motion.columnRows)
  gsap.to(motion.columnRows, {
    ...targetRows,
    duration: 0.46,
    ease: 'elastic.out(0.8, 0.52)',
    onUpdate,
    onComplete: () => {
      Object.assign(motion.columnRows, targetRows)
      onUpdate()
    },
  })
}

export const clearBoardGrowth = (motion: BoardGrowthMotion) => {
  gsap.killTweensOf(motion.columnRows)
}
