import { updateCardMotion, type PointerTracker } from '../animation/cardMotion'
import type { CardId } from '../model/boardTypes'
import type { SceneLayout } from '../layout/boardLayout'
import { drawCard, type CardView } from './cardView'

type CardMotionLoopOptions = {
  getCards: () => Iterable<CardView>
  getPointer: () => PointerTracker
  getLayout: () => SceneLayout
  render: () => void
}

export type CardMotionLoop = {
  start: () => void
  stop: () => void
  remember: (card: CardView) => void
  forget: (cardId: CardId) => void
}

const quantize = (value: number) => Math.round(value * 100)

const getCardRenderKey = (card: CardView) =>
  [
    card.phase,
    quantize(card.x),
    quantize(card.y),
    quantize(card.restX),
    quantize(card.restY),
    quantize(card.rotation),
    quantize(card.motion.lift),
    quantize(card.motion.fly),
    quantize(card.motion.impact),
    quantize(card.visual.hover),
    quantize(card.visual.hoverTarget),
  ].join('|')

const hasUnsettledCardMotion = (cards: Iterable<CardView>) => {
  for (const card of cards) {
    if (Math.abs(card.visual.hover - card.visual.hoverTarget) > 0.002 || Math.abs(card.visual.hoverVelocity) > 0.002) {
      return true
    }

    if (card.phase === 'landing') {
      return true
    }

    if (card.phase === 'held' && Math.abs(card.motion.lift - 1) > 0.01) {
      return true
    }

    if (card.phase === 'idle' && Math.abs(card.motion.lift) > 0.01) {
      return true
    }

    if (Math.abs(card.motion.impact) > 0.01) {
      return true
    }

    if (card.phase !== 'held' && (Math.abs(card.x - card.restX) > 0.05 || Math.abs(card.y - card.restY) > 0.05)) {
      return true
    }

    if (Math.abs(card.rotation) > 0.001 || Math.abs(card.tiltVelocity) > 0.001) {
      return true
    }
  }

  return false
}

export const createCardMotionLoop = ({
  getCards,
  getLayout,
  getPointer,
  render,
}: CardMotionLoopOptions): CardMotionLoop => {
  const renderKeys = new Map<CardId, string>()
  let frame = 0
  let lastFrameTime = 0
  let isRunning = false

  const runFrame = (now: number) => {
    if (!isRunning) {
      return
    }

    const elapsed = lastFrameTime === 0 ? 16.67 : Math.min(now - lastFrameTime, 34)
    const delta = Math.min(elapsed / 16.67, 2)
    const layout = getLayout()
    const pointer = getPointer()
    let needsRender = false

    lastFrameTime = now

    for (const card of getCards()) {
      updateCardMotion(card, pointer, layout, delta)

      const nextRenderKey = getCardRenderKey(card)

      if (renderKeys.get(card.id) !== nextRenderKey) {
        drawCard(card, layout)
        renderKeys.set(card.id, nextRenderKey)
        needsRender = true
      }
    }

    if (needsRender) {
      render()
    }

    if (needsRender || hasUnsettledCardMotion(getCards())) {
      frame = window.requestAnimationFrame(runFrame)
      return
    }

    isRunning = false
    lastFrameTime = 0
    frame = 0
  }

  return {
    start: () => {
      if (isRunning) {
        return
      }

      isRunning = true
      lastFrameTime = 0
      frame = window.requestAnimationFrame(runFrame)
    },
    stop: () => {
      isRunning = false
      lastFrameTime = 0

      if (frame) {
        window.cancelAnimationFrame(frame)
      }

      frame = 0
      renderKeys.clear()
    },
    remember: (card) => {
      renderKeys.set(card.id, getCardRenderKey(card))
    },
    forget: (cardId) => {
      renderKeys.delete(cardId)
    },
  }
}
