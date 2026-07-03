import { Application, Container, Graphics } from 'pixi.js'
import type { Text, Ticker } from 'pixi.js'
import {
  animateBoardGrowth,
  clearBoardGrowth,
  settleBoardGrowth,
  type BoardGrowthMotion,
} from '../animation/boardGrowthMotion'
import { hopCardToRest, liftCard, settleCard, updateCardMotion, type PointerTracker } from '../animation/cardMotion'
import {
  clearSlotEffect,
  collapseSlot,
  createSlotCollapseEffect,
  type SlotCollapseEffect,
} from '../animation/slotMotion'
import { hitCard, validAdjacentDropColumn } from '../interaction/hitTest'
import { createLayout, getSlotPose, type ColumnRowCounts, type SceneLayout } from '../layout/boardLayout'
import type { Vec2 } from '../layout/projection'
import { COLUMN_IDS, type CardId, type ColumnId, type SlotId } from '../model/boardTypes'
import { ZOOM } from '../model/gameConstants'
import { getColumnSlotCounts, getCompactPlacements, getFirstFreeSlot, getSlotIdForCard, makeSlotId } from '../model/placementRules'
import { useGameStore } from '../../store/gameStore'
import { clamp } from '../math/easing'
import { drawBoard, drawColumns, createColumnLabel } from './boardRenderer'
import { createCardView, drawCard, type CardView } from './cardView'

export type DeskSceneController = {
  setZoom: (nextZoom: number, focus?: Vec2) => void
  destroy: () => void
}

type DeskSceneOptions = {
  host: HTMLDivElement
  initialZoom?: number
  onZoomChange?: (zoom: number) => void
}

const getHostSize = (host: HTMLDivElement, fallback?: SceneLayout) => ({
  width: host.clientWidth || fallback?.width || 960,
  height: host.clientHeight || fallback?.height || 640,
})

const cloneRows = (rows: ColumnRowCounts) =>
  Object.fromEntries(COLUMN_IDS.map((columnId) => [columnId, rows[columnId]])) as ColumnRowCounts

const rowsChanged = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  COLUMN_IDS.some((columnId) => Math.abs(from[columnId] - to[columnId]) > 0.001)

const hasRowGrowth = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  COLUMN_IDS.some((columnId) => to[columnId] > from[columnId])

const hasRowShrink = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  COLUMN_IDS.some((columnId) => to[columnId] < from[columnId])

const getRowsWithDelayedShrink = (from: ColumnRowCounts, to: ColumnRowCounts) =>
  Object.fromEntries(
    COLUMN_IDS.map((columnId) => [columnId, to[columnId] > from[columnId] ? to[columnId] : from[columnId]]),
  ) as ColumnRowCounts

const loadSceneFonts = async () => {
  if (!document.fonts) {
    return
  }

  await Promise.all([
    document.fonts.load('700 15px "Onest Variable"'),
    document.fonts.load('700 10px "Onest Variable"'),
    document.fonts.load('800 15px "Onest Variable"'),
  ])
}

export const createDeskScene = ({ host, initialZoom = 1, onZoomChange }: DeskSceneOptions): DeskSceneController => {
  let disposed = false
  let app: Application | null = null
  let currentZoom = clamp(initialZoom, ZOOM.min, ZOOM.max)
  let cameraOffset: Vec2 = { x: 0, y: 0 }
  const initialState = useGameStore.getState()
  const initialRows = getColumnSlotCounts(initialState)
  const growthMotion: BoardGrowthMotion = { columnRows: cloneRows(initialRows) }
  let targetRowsByColumn = cloneRows(initialRows)
  const initialSize = getHostSize(host)
  let layout = createLayout(initialSize.width, initialSize.height, currentZoom, cameraOffset, initialState, {
    surfaceRowsByColumn: growthMotion.columnRows,
    slotRowsByColumn: targetRowsByColumn,
  })
  let hoverColumnId: ColumnId | null = null
  let hoverSlotId: SlotId | null = null
  let activeCard: CardView | null = null
  let activePointerId: number | null = null
  let pointer: PointerTracker = { x: 0, y: 0, previousX: 0, previousY: 0, vx: 0, vy: 0 }
  let rowMotionToken = 0

  const boardLayer = new Container()
  const cardLayer = new Container()
  const board = new Graphics()
  const columns = new Graphics()
  const labels = new Map<ColumnId, Text>()
  const cardViews = new Map<CardId, CardView>()
  const slotEffects = new Map<SlotId, SlotCollapseEffect>()

  const state = () => useGameStore.getState()

  const localPoint = (event: Pick<MouseEvent, 'clientX' | 'clientY'>): Vec2 => {
    const bounds = host.getBoundingClientRect()

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
  }

  const syncColumnLabels = () => {
    const currentColumnIds = new Set(state().columns.map((column) => column.id))

    labels.forEach((label, columnId) => {
      if (currentColumnIds.has(columnId)) {
        return
      }

      label.removeFromParent()
      label.destroy()
      labels.delete(columnId)
    })

    state().columns.forEach((column) => {
      const existing = labels.get(column.id)

      if (existing) {
        existing.text = column.title
        existing.zIndex = 20
        return
      }

      const label = createColumnLabel(column.title)

      label.zIndex = 20
      labels.set(column.id, label)
      boardLayer.addChild(label)
    })
  }

  const syncCardViews = () => {
    const nextCards = state().cards
    const nextIds = new Set(Object.keys(nextCards) as CardId[])

    cardViews.forEach((card, cardId) => {
      if (nextIds.has(cardId)) {
        return
      }

      card.root.removeFromParent()
      card.root.destroy({ children: true })
      cardViews.delete(cardId)
    })

    ;(Object.keys(nextCards) as CardId[]).forEach((cardId) => {
      const data = nextCards[cardId]
      const existing = cardViews.get(cardId)

      if (existing) {
        existing.data = data
        existing.title.text = data.title
        existing.kicker.text = data.kicker.toUpperCase()
        return
      }

      const view = createCardView(data)

      cardViews.set(cardId, view)
      cardLayer.addChild(view.root)
    })
  }

  const relayoutCards = () => {
    const currentState = state()
    const visualPlacements = getCompactPlacements(currentState)

    ;(Object.keys(currentState.cards) as CardId[]).forEach((cardId) => {
      const card = cardViews.get(cardId)

      if (!card) {
        return
      }

      const slotId = visualPlacements[cardId] ?? currentState.placements[cardId]
      const previousSlotId = card.slotId
      const shouldHop = previousSlotId !== null && previousSlotId !== slotId && card.phase === 'idle'
      const pose = getSlotPose(layout, slotId)

      card.restX = pose.x
      card.restY = pose.y
      card.restU = pose.u
      card.restV = pose.v
      card.slotId = slotId

      if (card.phase === 'landing' && card.flight) {
        card.flight.toX = pose.x
        card.flight.toY = pose.y
      }

      if (card.x === 0 && card.y === 0) {
        card.x = pose.x
        card.y = pose.y
      }

      if (shouldHop) {
        hopCardToRest(card, layout)
      }
    })
  }

  const redrawScene = () => {
    const currentState = state()

    drawBoard(board, layout)
    drawColumns(columns, labels, layout, currentState, hoverColumnId, hoverSlotId, slotEffects.values())
    relayoutCards()
    cardViews.forEach((card) => drawCard(card, layout))
  }

  const recreateLayout = () => {
    const size = getHostSize(host, layout)

    layout = createLayout(size.width, size.height, currentZoom, cameraOffset, state(), {
      surfaceRowsByColumn: growthMotion.columnRows,
      slotRowsByColumn: targetRowsByColumn,
    })
  }

  const syncAndRedraw = () => {
    recreateLayout()
    syncColumnLabels()
    syncCardViews()
    redrawScene()
  }

  const clearRevivedSlotEffects = (nextRows: ColumnRowCounts) => {
    slotEffects.forEach((effect, slotId) => {
      if (effect.rowIndex >= nextRows[effect.columnId]) {
        return
      }

      clearSlotEffect(effect)
      slotEffects.delete(slotId)
    })
  }

  const startRemovedSlotEffects = (
    previousRows: ColumnRowCounts,
    nextRows: ColumnRowCounts,
    onComplete: () => void,
  ) => {
    let remainingEffects = 0

    COLUMN_IDS.forEach((columnId) => {
      for (let rowIndex = nextRows[columnId]; rowIndex < previousRows[columnId]; rowIndex += 1) {
        const slotId = makeSlotId(columnId, rowIndex)
        const existingEffect = slotEffects.get(slotId)
        const effect = createSlotCollapseEffect(slotId, columnId, rowIndex)

        if (existingEffect) {
          clearSlotEffect(existingEffect)
        }

        remainingEffects += 1
        slotEffects.set(slotId, effect)
        collapseSlot(
          effect,
          syncAndRedraw,
          () => {
            if (slotEffects.get(slotId) === effect) {
              slotEffects.delete(slotId)
            }
            syncAndRedraw()
            remainingEffects -= 1

            if (remainingEffects === 0) {
              onComplete()
            }
          },
        )
      }
    })

    if (remainingEffects === 0) {
      onComplete()
    }
  }

  const syncStoreState = () => {
    const currentState = state()
    const nextRows = getColumnSlotCounts(currentState)

    if (rowsChanged(targetRowsByColumn, nextRows)) {
      const previousRows = cloneRows(targetRowsByColumn)
      const shouldGrow = hasRowGrowth(previousRows, nextRows)
      const shouldShrink = hasRowShrink(previousRows, nextRows)
      const motionToken = (rowMotionToken += 1)
      const finishShrink = () => {
        if (disposed || motionToken !== rowMotionToken) {
          return
        }

        settleBoardGrowth(growthMotion, targetRowsByColumn, syncAndRedraw)
      }

      targetRowsByColumn = cloneRows(nextRows)
      clearRevivedSlotEffects(targetRowsByColumn)

      if (shouldShrink) {
        startRemovedSlotEffects(previousRows, nextRows, finishShrink)
      }

      if (shouldGrow) {
        animateBoardGrowth(
          growthMotion,
          shouldShrink ? getRowsWithDelayedShrink(previousRows, nextRows) : nextRows,
          syncAndRedraw,
        )
      } else if (shouldShrink) {
        clearBoardGrowth(growthMotion)
        COLUMN_IDS.forEach((columnId) => {
          growthMotion.columnRows[columnId] = Math.max(growthMotion.columnRows[columnId], previousRows[columnId])
        })
      } else {
        settleBoardGrowth(growthMotion, nextRows, syncAndRedraw)
      }

      syncAndRedraw()
      return
    }

    targetRowsByColumn = cloneRows(nextRows)
    syncAndRedraw()
  }

  const setZoom = (nextZoom: number, focus = { x: layout.width / 2, y: layout.height / 2 }) => {
    const clampedZoom = clamp(nextZoom, ZOOM.min, ZOOM.max)

    if (Math.abs(clampedZoom - currentZoom) < 0.001) {
      return
    }

    const ratio = clampedZoom / currentZoom
    const center = { x: layout.width / 2, y: layout.height / 2 }
    const maxOffset = 86 * clampedZoom

    cameraOffset = {
      x: clamp(focus.x - center.x - (focus.x - center.x - cameraOffset.x) * ratio, -maxOffset, maxOffset),
      y: clamp(focus.y - center.y - (focus.y - center.y - cameraOffset.y) * ratio, -maxOffset, maxOffset),
    }
    currentZoom = clampedZoom
    onZoomChange?.(clampedZoom)
    syncAndRedraw()
  }

  const handleWheel = (event: WheelEvent) => {
    const point = localPoint(event)
    const factor = Math.exp(-event.deltaY * 0.001)

    setZoom(currentZoom * factor, point)
    event.preventDefault()
  }

  const handlePointerDown = (event: PointerEvent) => {
    const point = localPoint(event)
    const card = hitCard(cardViews.values(), point)

    if (!card) {
      return
    }

    activeCard = card
    activePointerId = event.pointerId
    pointer = { x: point.x, y: point.y, previousX: point.x, previousY: point.y, vx: 0, vy: 0 }
    card.phase = 'held'
    card.dragOffset = { x: card.x - point.x, y: card.y - point.y }
    card.flight = null
    card.motion.fly = 1
    card.motion.impact = 0
    card.tiltVelocity = 0
    card.targetRotation = 0
    host.setPointerCapture(event.pointerId)
    host.classList.add('is-dragging')
    useGameStore.getState().beginDrag(card.id, getSlotIdForCard(state(), card.id))
    liftCard(card)
    event.preventDefault()
  }

  const handlePointerMove = (event: PointerEvent) => {
    const point = localPoint(event)

    if (activePointerId !== event.pointerId || !activeCard) {
      host.classList.toggle('is-hovering-card', Boolean(hitCard(cardViews.values(), point)))
      return
    }

    pointer.vx = point.x - pointer.x
    pointer.vy = point.y - pointer.y
    pointer.previousX = pointer.x
    pointer.previousY = pointer.y
    pointer.x = point.x
    pointer.y = point.y
    hoverColumnId = validAdjacentDropColumn(layout, point, state().drag?.sourceColumnId ?? 'backlog')
    hoverSlotId = hoverColumnId && activeCard ? getFirstFreeSlot(state(), hoverColumnId, activeCard.id) : null
    drawColumns(columns, labels, layout, state(), hoverColumnId, hoverSlotId, slotEffects.values())
    event.preventDefault()
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId || !activeCard) {
      return
    }

    const card = activeCard
    const targetColumnId = validAdjacentDropColumn(layout, localPoint(event), state().drag?.sourceColumnId ?? 'backlog')

    if (targetColumnId) {
      useGameStore.getState().moveCardToColumn(card.id, targetColumnId)
    }

    useGameStore.getState().endDrag()
    hoverColumnId = null
    hoverSlotId = null
    activeCard = null
    activePointerId = null
    host.classList.remove('is-dragging', 'is-hovering-card')
    if (host.hasPointerCapture(event.pointerId)) {
      host.releasePointerCapture(event.pointerId)
    }

    syncAndRedraw()
    settleCard(card, layout, targetColumnId)
    event.preventDefault()
  }

  const tick = (ticker: Ticker) => {
    const delta = Math.min(ticker.deltaMS / 16.67, 2)

    cardViews.forEach((card) => {
      updateCardMotion(card, pointer, layout, delta)
      drawCard(card, layout)
    })
  }

  const boot = async () => {
    await loadSceneFonts()

    if (disposed) {
      return
    }

    const nextApp = new Application()

    await nextApp.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })

    if (disposed) {
      nextApp.destroy(true)
      return
    }

    app = nextApp
    app.stage.sortableChildren = true
    boardLayer.sortableChildren = true
    board.zIndex = 0
    columns.zIndex = 10
    boardLayer.zIndex = 0
    cardLayer.zIndex = 100
    boardLayer.addChild(board, columns)
    cardLayer.sortableChildren = true
    app.stage.addChild(boardLayer, cardLayer)
    host.appendChild(app.canvas)
    syncAndRedraw()
    app.ticker.add(tick)
  }

  const resizeObserver = new ResizeObserver(syncAndRedraw)
  const unsubscribe = useGameStore.subscribe(syncStoreState)

  resizeObserver.observe(host)
  host.addEventListener('pointerdown', handlePointerDown)
  host.addEventListener('pointermove', handlePointerMove)
  host.addEventListener('pointerup', handlePointerUp)
  host.addEventListener('pointercancel', handlePointerUp)
  host.addEventListener('wheel', handleWheel, { passive: false })
  onZoomChange?.(currentZoom)
  void boot()

  return {
    setZoom,
    destroy: () => {
      disposed = true
      unsubscribe()
      resizeObserver.disconnect()
      clearBoardGrowth(growthMotion)
      slotEffects.forEach(clearSlotEffect)
      slotEffects.clear()
      host.removeEventListener('pointerdown', handlePointerDown)
      host.removeEventListener('pointermove', handlePointerMove)
      host.removeEventListener('pointerup', handlePointerUp)
      host.removeEventListener('pointercancel', handlePointerUp)
      host.removeEventListener('wheel', handleWheel)
      host.classList.remove('is-dragging', 'is-hovering-card')
      cardViews.forEach((card) => {
        card.root.removeFromParent()
        card.root.destroy({ children: true })
      })
      labels.forEach((label) => {
        label.removeFromParent()
        label.destroy()
      })

      if (app) {
        app.ticker.remove(tick)
        app.destroy(true, { children: true })
      }
    },
  }
}
