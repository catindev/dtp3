import { Application, Container, Graphics } from 'pixi.js'
import type { Text } from 'pixi.js'
import {
  animateBoardGrowth,
  clearBoardGrowth,
  settleBoardGrowth,
  type BoardGrowthMotion,
} from '../animation/boardGrowthMotion'
import {
  cloneRows,
  createBoardRowsEffectPlan,
  type BoardRowsMotionEffect,
  type RemovedSlotEffect,
} from '../effects/boardRowEffects'
import {
  hopCardToRest,
  liftCard,
  setCardHover,
  settleCard,
  type PointerTracker,
} from '../animation/cardMotion'
import {
  clearSlotEffect,
  collapseSlot,
  createSlotCollapseEffect,
  type SlotCollapseEffect,
} from '../animation/slotMotion'
import { hitCard, validAdjacentDropColumn } from '../interaction/hitTest'
import {
  canPanLayout,
  clampCameraOffsetToLayout,
  createLayout,
  fitCameraOffsetToWorkspace,
  getSlotPose,
  getWorkspaceZoomLimit,
  type SceneLayout,
} from '../layout/boardLayout'
import type { Vec2 } from '../layout/projection'
import { COLUMN_IDS, getCardIds, type CardId, type ColumnId, type ColumnRowCounts, type SlotId } from '../model/boardTypes'
import { ZOOM } from '../model/gameConstants'
import { getCardKicker } from '../model/cardPresentation'
import { getColumnSlotCounts, getCompactPlacements, getFirstFreeSlot, getSlotIdForCard } from '../model/placementRules'
import { useGameStore } from '../../store/gameStore'
import { clamp } from '../math/easing'
import { drawBoard, drawColumns, createColumnLabel } from './boardRenderer'
import { formatCardTitle } from './cardTypography'
import { createCardView, drawCard, type CardView } from './cardView'
import { createCardMotionLoop } from './cardMotionLoop'

export type DeskSceneController = {
  setZoom: (nextZoom: number) => void
  destroy: () => void
}

type DeskSceneOptions = {
  host: HTMLDivElement
  initialZoom?: number
  onZoomChange?: (zoom: number) => void
  onZoomMaxChange?: (zoomMax: number) => void
}

type CameraPan = {
  pointerId: number
  startOffset: Vec2
  startPoint: Vec2
}

const getHostSize = (host: HTMLDivElement, fallback?: SceneLayout) => ({
  width: host.clientWidth || fallback?.width || 960,
  height: host.clientHeight || fallback?.height || 640,
})

const PIXI_RESOLUTION_LIMIT = 1.5

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

export const createDeskScene = ({
  host,
  initialZoom = 1,
  onZoomChange,
  onZoomMaxChange,
}: DeskSceneOptions): DeskSceneController => {
  let disposed = false
  let app: Application | null = null
  let currentZoom = clamp(initialZoom, ZOOM.min, ZOOM.max)
  let currentZoomMax: number = ZOOM.max
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
  let hoveredCard: CardView | null = null
  let activeCard: CardView | null = null
  let activePointerId: number | null = null
  let activePan: CameraPan | null = null
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

  const renderScene = () => {
    if (!app || disposed) {
      return
    }

    app.render()
  }

  const cardMotionLoop = createCardMotionLoop({
    getCards: () => cardViews.values(),
    getLayout: () => layout,
    getPointer: () => pointer,
    render: renderScene,
  })

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
    const nextIds = new Set(getCardIds(nextCards))

    cardViews.forEach((card, cardId) => {
      if (nextIds.has(cardId)) {
        return
      }

      card.root.removeFromParent()
      card.root.destroy({ children: true })
      if (hoveredCard?.id === cardId) {
        hoveredCard = null
        host.classList.remove('is-hovering-card')
        useGameStore.getState().setHoveredCardId(null)
      }
      cardViews.delete(cardId)
      cardMotionLoop.forget(cardId)
    })

    getCardIds(nextCards).forEach((cardId) => {
      const data = nextCards[cardId]
      const existing = cardViews.get(cardId)

      if (existing) {
        existing.data = data
        existing.title.text = formatCardTitle(data.title)
        existing.kicker.text = getCardKicker(data)
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

    getCardIds(currentState.cards).forEach((cardId) => {
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

      if (card.phase === 'idle' && !shouldHop) {
        card.x = pose.x
        card.y = pose.y
        card.rotation = 0
        card.tiltVelocity = 0
      } else if (card.x === 0 && card.y === 0) {
        card.x = pose.x
        card.y = pose.y
      }

      if (shouldHop) {
        hopCardToRest(card, layout)
        cardMotionLoop.start()
      }
    })
  }

  const redrawScene = () => {
    const currentState = state()

    drawBoard(board, layout)
    drawColumns(columns, labels, layout, currentState, hoverColumnId, hoverSlotId, slotEffects.values())
    relayoutCards()
    cardViews.forEach((card) => {
      drawCard(card, layout)
      cardMotionLoop.remember(card)
    })
    renderScene()
  }

  const setHoveredCard = (card: CardView | null) => {
    if (hoveredCard === card) {
      return
    }

    if (hoveredCard) {
      setCardHover(hoveredCard, false)
    }

    hoveredCard = card

    if (hoveredCard) {
      setCardHover(hoveredCard, true)
    }

    host.classList.toggle('is-hovering-card', Boolean(hoveredCard))
    useGameStore.getState().setHoveredCardId(hoveredCard?.id ?? null)
    renderScene()
    cardMotionLoop.start()
  }

  const recreateLayout = () => {
    const size = getHostSize(host, layout)
    const nextZoomMax = getWorkspaceZoomLimit(size.width, size.height, state(), {
      surfaceRowsByColumn: growthMotion.columnRows,
      slotRowsByColumn: targetRowsByColumn,
    })

    if (Math.abs(nextZoomMax - currentZoomMax) > 0.001) {
      currentZoomMax = nextZoomMax
      onZoomMaxChange?.(nextZoomMax)
    }

    if (currentZoom > currentZoomMax) {
      currentZoom = currentZoomMax
      onZoomChange?.(currentZoom)
    }

    layout = createLayout(size.width, size.height, currentZoom, cameraOffset, state(), {
      surfaceRowsByColumn: growthMotion.columnRows,
      slotRowsByColumn: targetRowsByColumn,
    })

    const clampedOffset = clampCameraOffsetToLayout(layout, cameraOffset)

    if (Math.abs(clampedOffset.x - cameraOffset.x) > 0.05 || Math.abs(clampedOffset.y - cameraOffset.y) > 0.05) {
      cameraOffset = clampedOffset
      layout = createLayout(size.width, size.height, currentZoom, cameraOffset, state(), {
        surfaceRowsByColumn: growthMotion.columnRows,
        slotRowsByColumn: targetRowsByColumn,
      })
    }

    if (!activePan) {
      const workspaceOffset = fitCameraOffsetToWorkspace(layout, cameraOffset)

      if (Math.abs(workspaceOffset.x - cameraOffset.x) > 0.05 || Math.abs(workspaceOffset.y - cameraOffset.y) > 0.05) {
        cameraOffset = workspaceOffset
        layout = createLayout(size.width, size.height, currentZoom, cameraOffset, state(), {
          surfaceRowsByColumn: growthMotion.columnRows,
          slotRowsByColumn: targetRowsByColumn,
        })
      }
    }

    host.classList.toggle('is-pan-enabled', canPanLayout(layout))
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
        syncAndRedraw,
        () => {
          if (slotEffects.get(removedSlot.slotId) === effect) {
            slotEffects.delete(removedSlot.slotId)
          }
          syncAndRedraw()
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
      animateBoardGrowth(growthMotion, motion.targetRows, syncAndRedraw)
      return
    }

    if (motion.type === 'hold') {
      clearBoardGrowth(growthMotion)
      COLUMN_IDS.forEach((columnId) => {
        growthMotion.columnRows[columnId] = Math.max(growthMotion.columnRows[columnId], motion.targetRows[columnId])
      })
      return
    }

    settleBoardGrowth(growthMotion, motion.targetRows, syncAndRedraw)
  }

  const syncStoreState = () => {
    const currentState = state()
    const nextRows = getColumnSlotCounts(currentState)
    const rowEffectPlan = createBoardRowsEffectPlan(targetRowsByColumn, nextRows)

    if (rowEffectPlan.changed) {
      const motionToken = (rowMotionToken += 1)
      const runAfterRemovedSlotsMotion = () => {
        if (disposed || motionToken !== rowMotionToken) {
          return
        }

        if (rowEffectPlan.afterRemovedSlotsMotion) {
          applyBoardRowsMotion(rowEffectPlan.afterRemovedSlotsMotion)
        }
      }

      targetRowsByColumn = cloneRows(rowEffectPlan.nextRows)
      clearRevivedSlotEffects(targetRowsByColumn)

      if (rowEffectPlan.removedSlots.length > 0) {
        startRemovedSlotEffects(rowEffectPlan.removedSlots, runAfterRemovedSlotsMotion)
      }

      if (rowEffectPlan.immediateMotion) {
        applyBoardRowsMotion(rowEffectPlan.immediateMotion)
      }

      if (rowEffectPlan.removedSlots.length === 0) {
        runAfterRemovedSlotsMotion()
      }

      syncAndRedraw()
      return
    }

    targetRowsByColumn = cloneRows(nextRows)
    syncAndRedraw()
  }

  const setZoom = (nextZoom: number) => {
    const size = getHostSize(host, layout)
    const nextZoomMax = getWorkspaceZoomLimit(size.width, size.height, state(), {
      surfaceRowsByColumn: growthMotion.columnRows,
      slotRowsByColumn: targetRowsByColumn,
    })

    if (Math.abs(nextZoomMax - currentZoomMax) > 0.001) {
      currentZoomMax = nextZoomMax
      onZoomMaxChange?.(nextZoomMax)
    }

    const clampedZoom = clamp(nextZoom, ZOOM.min, currentZoomMax)

    if (Math.abs(clampedZoom - currentZoom) < 0.001) {
      return
    }

    const zoomRatio = clampedZoom / currentZoom

    cameraOffset = {
      x: cameraOffset.x * zoomRatio,
      y: cameraOffset.y * zoomRatio,
    }
    currentZoom = clampedZoom
    cameraOffset = fitCameraOffsetToWorkspace(
      createLayout(size.width, size.height, currentZoom, cameraOffset, state(), {
        surfaceRowsByColumn: growthMotion.columnRows,
        slotRowsByColumn: targetRowsByColumn,
      }),
      cameraOffset,
    )
    onZoomChange?.(clampedZoom)
    syncAndRedraw()
  }

  const handleWheel = (event: WheelEvent) => {
    const factor = Math.exp(-event.deltaY * 0.001)

    setZoom(currentZoom * factor)
    event.preventDefault()
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }

    const point = localPoint(event)
    const card = hitCard(cardViews.values(), point)

    if (!card) {
      if (!canPanLayout(layout)) {
        return
      }

      setHoveredCard(null)
      activePan = {
        pointerId: event.pointerId,
        startOffset: cameraOffset,
        startPoint: point,
      }
      host.setPointerCapture(event.pointerId)
      host.classList.add('is-panning')
      event.preventDefault()
      return
    }

    activeCard = card
    activePointerId = event.pointerId
    setHoveredCard(card)
    pointer = { x: point.x, y: point.y, previousX: point.x, previousY: point.y, vx: 0, vy: 0 }
    card.phase = 'held'
    setCardHover(card, true)
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
    cardMotionLoop.start()
    event.preventDefault()
  }

  const handlePointerMove = (event: PointerEvent) => {
    const point = localPoint(event)

    if (activePan?.pointerId === event.pointerId) {
      cameraOffset = {
        x: activePan.startOffset.x + point.x - activePan.startPoint.x,
        y: activePan.startOffset.y + point.y - activePan.startPoint.y,
      }
      syncAndRedraw()
      event.preventDefault()
      return
    }

    if (activePointerId !== event.pointerId || !activeCard) {
      setHoveredCard(hitCard(cardViews.values(), point))
      return
    }

    pointer.vx = point.x - pointer.x
    pointer.vy = point.y - pointer.y
    pointer.previousX = pointer.x
    pointer.previousY = pointer.y
    pointer.x = point.x
    pointer.y = point.y
    cardMotionLoop.start()
    const nextHoverColumnId = validAdjacentDropColumn(layout, point, state().drag?.sourceColumnId ?? 'backlog')
    const nextHoverSlotId =
      nextHoverColumnId && activeCard ? getFirstFreeSlot(state(), nextHoverColumnId, activeCard.id) : null

    if (nextHoverColumnId !== hoverColumnId || nextHoverSlotId !== hoverSlotId) {
      hoverColumnId = nextHoverColumnId
      hoverSlotId = nextHoverSlotId
      drawColumns(columns, labels, layout, state(), hoverColumnId, hoverSlotId, slotEffects.values())
      renderScene()
    }
    event.preventDefault()
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (activePan?.pointerId === event.pointerId) {
      activePan = null
      host.classList.remove('is-panning')
      if (host.hasPointerCapture(event.pointerId)) {
        host.releasePointerCapture(event.pointerId)
      }
      event.preventDefault()
      return
    }

    if (activePointerId !== event.pointerId || !activeCard) {
      return
    }

    const card = activeCard
    const targetColumnId = validAdjacentDropColumn(layout, localPoint(event), state().drag?.sourceColumnId ?? 'backlog')

    if (targetColumnId) {
      useGameStore.getState().moveCardToColumn(card.id, targetColumnId)
    }

    setHoveredCard(null)
    setCardHover(card, false)
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
    cardMotionLoop.start()
    event.preventDefault()
  }

  const handlePointerLeave = () => {
    if (activeCard || activePan) {
      return
    }

    setHoveredCard(null)
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
      autoStart: false,
      resolution: Math.min(window.devicePixelRatio || 1, PIXI_RESOLUTION_LIMIT),
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
  }

  const resizeObserver = new ResizeObserver(syncAndRedraw)
  const unsubscribe = useGameStore.subscribe(syncStoreState)

  resizeObserver.observe(host)
  host.addEventListener('pointerdown', handlePointerDown)
  host.addEventListener('pointermove', handlePointerMove)
  host.addEventListener('pointerup', handlePointerUp)
  host.addEventListener('pointercancel', handlePointerUp)
  host.addEventListener('pointerleave', handlePointerLeave)
  host.addEventListener('wheel', handleWheel, { passive: false })
  onZoomChange?.(currentZoom)
  onZoomMaxChange?.(currentZoomMax)
  void boot()

  return {
    setZoom,
    destroy: () => {
      disposed = true
      unsubscribe()
      resizeObserver.disconnect()
      clearBoardGrowth(growthMotion)
      cardMotionLoop.stop()
      slotEffects.forEach(clearSlotEffect)
      slotEffects.clear()
      host.removeEventListener('pointerdown', handlePointerDown)
      host.removeEventListener('pointermove', handlePointerMove)
      host.removeEventListener('pointerup', handlePointerUp)
      host.removeEventListener('pointercancel', handlePointerUp)
      host.removeEventListener('pointerleave', handlePointerLeave)
      host.removeEventListener('wheel', handleWheel)
      host.classList.remove('is-dragging', 'is-hovering-card', 'is-panning', 'is-pan-enabled')
      cardViews.forEach((card) => {
        card.root.removeFromParent()
        card.root.destroy({ children: true })
      })
      labels.forEach((label) => {
        label.removeFromParent()
        label.destroy()
      })
      useGameStore.getState().setHoveredCardId(null)

      if (app) {
        app.destroy(true, { children: true })
      }
    },
  }
}
