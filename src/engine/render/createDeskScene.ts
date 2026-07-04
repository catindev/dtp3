import { Application, Container, Graphics } from 'pixi.js'
import type { Text } from 'pixi.js'
import {
  closeCardInspector,
  liftCard,
  openCardInspector,
  resetCardToRest,
  setCardHover,
  settleCard,
  type PointerTracker,
} from '../animation/cardMotion'
import { hitCard, hitCardInfoIcon, validAdjacentDropColumn } from '../interaction/hitTest'
import {
  canPanLayout,
  clampCameraOffsetToLayout,
  createLayout,
  fitCameraOffsetToWorkspace,
  getWorkspaceZoomLimit,
  type SceneLayout,
} from '../layout/boardLayout'
import type { Vec2 } from '../layout/projection'
import { type CardId, type ColumnId, type SlotId } from '../model/boardTypes'
import { ZOOM } from '../model/gameConstants'
import { getColumnSlotCounts, getFirstFreeSlot, getSlotIdForCard } from '../model/placementRules'
import { useGameStore } from '../../store/gameStore'
import { clamp } from '../math/easing'
import { getCardDetailModel } from '../model/cardDetails'
import { drawBoard, drawColumns } from './boardRenderer'
import { drawCard, type CardView } from './cardView'
import { createCardMotionLoop } from './cardMotionLoop'
import {
  getInspectorTargetRect,
  INSPECTOR_MOBILE_QUERY,
  isPointInsideInspectorShell,
  toLocalInspectorTarget,
} from './inspectorLayout'
import { createInspectorView, destroyInspectorView, drawInspectorView } from './inspectorRenderer'
import { createSceneViewport } from './sceneViewport'
import { createSceneRowMotion } from './sceneRowMotion'
import {
  destroyCardViews,
  destroyColumnLabels,
  syncCardViews as syncCardViewRegistry,
  syncColumnLabels as syncColumnLabelRegistry,
} from './sceneEntities'
import { relayoutCardViews } from './sceneCardLayout'

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
  const viewport = createSceneViewport(initialZoom)
  const initialState = useGameStore.getState()
  const state = () => useGameStore.getState()
  const initialRows = getColumnSlotCounts(initialState)
  const rowMotion = createSceneRowMotion(initialRows, {
    isActive: () => !disposed,
    onUpdate: () => syncAndRedraw(),
  })
  const getLayoutOptions = () => ({
    surfaceRowsByColumn: rowMotion.growthMotion.columnRows,
    slotRowsByColumn: rowMotion.getTargetRows(),
  })
  const createSceneLayout = (size: ReturnType<typeof getHostSize>, zoom: number, cameraOffset: Vec2) =>
    createLayout(size.width, size.height, zoom, cameraOffset, state(), getLayoutOptions())
  const getSceneZoomMax = (size: ReturnType<typeof getHostSize>) =>
    getWorkspaceZoomLimit(size.width, size.height, state(), getLayoutOptions())
  const initialSize = getHostSize(host)
  let layout = createSceneLayout(initialSize, viewport.zoom, viewport.cameraOffset)
  let hoverColumnId: ColumnId | null = null
  let hoverSlotId: SlotId | null = null
  let hoveredCard: CardView | null = null
  let inspectorCardId: CardId | null = initialState.inspector?.cardId ?? null
  let activeCard: CardView | null = null
  let activePointerId: number | null = null
  let activePan: CameraPan | null = null
  let pointer: PointerTracker = { x: 0, y: 0, previousX: 0, previousY: 0, vx: 0, vy: 0 }

  const boardLayer = new Container()
  const cardLayer = new Container()
  const board = new Graphics()
  const columns = new Graphics()
  const labels = new Map<ColumnId, Text>()
  const cardViews = new Map<CardId, CardView>()
  const inspectorView = createInspectorView()

  const stageElement = host.closest<HTMLElement>('.stage')

  const syncInspectorHostState = () => {
    const isOpen = isInspectorModalOpen()

    host.classList.toggle('is-inspector-open', isOpen)
    stageElement?.classList.toggle('is-inspector-open', isOpen)
  }

  const renderScene = () => {
    if (!app || disposed) {
      return
    }

    app.render()
  }

  const localPoint = (event: Pick<MouseEvent, 'clientX' | 'clientY'>): Vec2 => {
    const bounds = host.getBoundingClientRect()

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
  }

  const isInspectorModalOpen = () => state().inspector !== null

  const getInspectorCard = () => {
    const inspector = state().inspector

    return inspector ? cardViews.get(inspector.cardId) ?? null : null
  }

  const getLocalInspectorTarget = () => {
    const targetRect = getInspectorTargetRect({
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.matchMedia(INSPECTOR_MOBILE_QUERY).matches,
    })

    return toLocalInspectorTarget(targetRect, host.getBoundingClientRect())
  }

  const drawInspectorOverlay = () => {
    const currentState = state()
    const inspector = currentState.inspector
    const card = inspector ? cardViews.get(inspector.cardId) ?? null : null
    const details = getCardDetailModel(currentState, inspector?.cardId ?? null)

    drawInspectorView(inspectorView, layout, card, details)
  }

  const renderAnimatedFrame = () => {
    drawInspectorOverlay()
    renderScene()
  }

  const drawCardFrame = (card: CardView) => {
    drawCard(card, layout)
    renderAnimatedFrame()
  }

  const cardMotionLoop = createCardMotionLoop({
    getCards: () => cardViews.values(),
    getLayout: () => layout,
    getPointer: () => pointer,
    render: renderAnimatedFrame,
  })

  const syncColumnLabels = () => {
    syncColumnLabelRegistry(labels, boardLayer, state().columns)
  }

  const syncCardViews = () => {
    syncCardViewRegistry(cardViews, cardLayer, state().cards, {
      onRemove: (card) => {
        if (hoveredCard?.id === card.id) {
          setCardHover(card, false)
          hoveredCard = null
          host.classList.remove('is-hovering-card')
        }
        if (state().inspector?.cardId === card.id) {
          useGameStore.getState().finishCloseCardInspector()
        }
        cardMotionLoop.forget(card.id)
      },
    })
  }

  const redrawScene = () => {
    const currentState = state()

    drawBoard(board, layout)
    drawColumns(columns, labels, layout, currentState, hoverColumnId, hoverSlotId, rowMotion.slotEffects.values())
    relayoutCardViews({
      state: currentState,
      cardViews,
      layout,
      onCardMotion: cardMotionLoop.start,
    })
    cardViews.forEach((card) => {
      drawCard(card, layout)
      card.root.visible = true
      cardMotionLoop.remember(card)
    })
    drawInspectorOverlay()
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
    renderScene()
    cardMotionLoop.start()
  }

  const recreateLayout = () => {
    const size = getHostSize(host, layout)
    const nextZoomMax = getSceneZoomMax(size)

    if (Math.abs(nextZoomMax - viewport.zoomMax) > 0.001) {
      viewport.zoomMax = nextZoomMax
      onZoomMaxChange?.(nextZoomMax)
    }

    if (viewport.zoom > viewport.zoomMax) {
      viewport.zoom = viewport.zoomMax
      onZoomChange?.(viewport.zoom)
    }

    const makeLayout = (offset: Vec2) => createSceneLayout(size, viewport.zoom, offset)

    let baseLayout = makeLayout(viewport.cameraOffset)

    const clampedOffset = clampCameraOffsetToLayout(baseLayout, viewport.cameraOffset)

    if (
      Math.abs(clampedOffset.x - viewport.cameraOffset.x) > 0.05 ||
      Math.abs(clampedOffset.y - viewport.cameraOffset.y) > 0.05
    ) {
      viewport.cameraOffset = clampedOffset
      baseLayout = makeLayout(viewport.cameraOffset)
    }

    if (!activePan) {
      const workspaceOffset = fitCameraOffsetToWorkspace(baseLayout, viewport.cameraOffset)

      if (
        Math.abs(workspaceOffset.x - viewport.cameraOffset.x) > 0.05 ||
        Math.abs(workspaceOffset.y - viewport.cameraOffset.y) > 0.05
      ) {
        viewport.cameraOffset = workspaceOffset
        baseLayout = makeLayout(viewport.cameraOffset)
      }
    }

    layout = makeLayout(viewport.cameraOffset)

    host.classList.toggle('is-pan-enabled', canPanLayout(layout))
  }

  function syncAndRedraw() {
    recreateLayout()
    syncColumnLabels()
    syncCardViews()
    redrawScene()
  }

  const syncStoreState = () => {
    rowMotion.syncToRows(getColumnSlotCounts(state()))

    const currentState = state()
    const inspector = currentState.inspector
    const nextInspectorCardId = inspector?.cardId ?? null

    syncInspectorHostState()

    if (inspector?.phase === 'closing') {
      const card = cardViews.get(inspector.cardId)

      if (card && card.phase !== 'inspector-returning') {
        closeCardInspector(
          card,
          layout,
          () => drawCardFrame(card),
          () => {
            const latestInspector = state().inspector

            if (latestInspector?.cardId === card.id && latestInspector.phase === 'closing') {
              useGameStore.getState().finishCloseCardInspector()
            }
          },
        )
      }
    }

    if (inspectorCardId && !nextInspectorCardId) {
      const card = cardViews.get(inspectorCardId)

      if (card && card.phase !== 'idle' && card.phase !== 'inspector-returning') {
        resetCardToRest(card)
        drawCardFrame(card)
      }
    }

    inspectorCardId = nextInspectorCardId
  }

  const setZoom = (nextZoom: number) => {
    const size = getHostSize(host, layout)
    const nextZoomMax = getSceneZoomMax(size)

    if (Math.abs(nextZoomMax - viewport.zoomMax) > 0.001) {
      viewport.zoomMax = nextZoomMax
      onZoomMaxChange?.(nextZoomMax)
    }

    const clampedZoom = clamp(nextZoom, ZOOM.min, viewport.zoomMax)

    if (Math.abs(clampedZoom - viewport.zoom) < 0.001) {
      return
    }

    const zoomRatio = clampedZoom / viewport.zoom

    viewport.cameraOffset = {
      x: viewport.cameraOffset.x * zoomRatio,
      y: viewport.cameraOffset.y * zoomRatio,
    }
    viewport.zoom = clampedZoom
    viewport.cameraOffset = fitCameraOffsetToWorkspace(
      createSceneLayout(size, viewport.zoom, viewport.cameraOffset),
      viewport.cameraOffset,
    )
    onZoomChange?.(clampedZoom)
    syncAndRedraw()
  }

  const handleWheel = (event: WheelEvent) => {
    if (isInspectorModalOpen()) {
      event.preventDefault()
      return
    }

    const factor = Math.exp(-event.deltaY * 0.001)

    setZoom(viewport.zoom * factor)
    event.preventDefault()
  }

  const clearActiveCardPointer = () => {
    activeCard = null
    activePointerId = null
  }

  const startCardDrag = (card: CardView, point: Vec2, sourceSlotId: SlotId) => {
    card.phase = 'held'
    setCardHover(card, true)
    card.dragOffset = { x: card.x - point.x, y: card.y - point.y }
    card.flight = null
    card.motion.fly = 1
    card.motion.impact = 0
    card.tiltVelocity = 0
    card.targetRotation = 0
    host.classList.add('is-dragging')
    useGameStore.getState().beginDrag(card.id, sourceSlotId)
    liftCard(card)
    cardMotionLoop.start()
  }

  const openInspectorFromCard = (card: CardView) => {
    const localTarget = getLocalInspectorTarget()

    setHoveredCard(null)
    useGameStore.getState().openCardInspector(card.id)
    openCardInspector(
      card,
      layout,
      localTarget,
      () => drawCardFrame(card),
      () => {
        if (disposed) return

        const inspector = state().inspector
        if (inspector?.cardId !== card.id || inspector.phase !== 'opening') {
          return
        }

        useGameStore.getState().completeCardInspectorOpen()
        renderAnimatedFrame()
      },
    )
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }

    const point = localPoint(event)

    if (isInspectorModalOpen()) {
      const inspector = state().inspector

      if (inspector?.phase === 'open' && !isPointInsideInspectorShell(point, getInspectorCard())) {
        useGameStore.getState().requestCloseCardInspector()
      }

      event.preventDefault()
      return
    }

    const infoCard = hitCardInfoIcon(cardViews.values(), point)

    if (infoCard) {
      openInspectorFromCard(infoCard)
      event.preventDefault()
      return
    }

    const card = hitCard(cardViews.values(), point)

    if (!card) {
      setHoveredCard(null)

      if (!canPanLayout(layout)) {
        return
      }

      activePan = {
        pointerId: event.pointerId,
        startOffset: viewport.cameraOffset,
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
    host.setPointerCapture(event.pointerId)
    startCardDrag(card, point, getSlotIdForCard(state(), card.id))
    cardMotionLoop.start()
    event.preventDefault()
  }

  const handlePointerMove = (event: PointerEvent) => {
    const point = localPoint(event)

    if (isInspectorModalOpen()) {
      return
    }

    if (activePan?.pointerId === event.pointerId) {
      viewport.cameraOffset = {
        x: activePan.startOffset.x + point.x - activePan.startPoint.x,
        y: activePan.startOffset.y + point.y - activePan.startPoint.y,
      }
      syncAndRedraw()
      event.preventDefault()
      return
    }

    if (activePointerId !== event.pointerId || !activeCard) {
      const nextHoveredCard = hitCard(cardViews.values(), point)

      setHoveredCard(nextHoveredCard)
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
      drawColumns(columns, labels, layout, state(), hoverColumnId, hoverSlotId, rowMotion.slotEffects.values())
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
    useGameStore.getState().endDrag()
    hoverColumnId = null
    hoverSlotId = null
    clearActiveCardPointer()
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
    inspectorView.backdrop.zIndex = 95_000
    inspectorView.content.zIndex = 110
    boardLayer.addChild(board, columns)
    cardLayer.sortableChildren = true
    cardLayer.addChild(inspectorView.backdrop)
    app.stage.addChild(boardLayer, cardLayer, inspectorView.content)
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
  onZoomChange?.(viewport.zoom)
  onZoomMaxChange?.(viewport.zoomMax)
  void boot()

  return {
    setZoom,
    destroy: () => {
      disposed = true
      unsubscribe()
      resizeObserver.disconnect()
      rowMotion.destroy()
      cardMotionLoop.stop()
      host.removeEventListener('pointerdown', handlePointerDown)
      host.removeEventListener('pointermove', handlePointerMove)
      host.removeEventListener('pointerup', handlePointerUp)
      host.removeEventListener('pointercancel', handlePointerUp)
      host.removeEventListener('pointerleave', handlePointerLeave)
      host.removeEventListener('wheel', handleWheel)
      host.classList.remove('is-dragging', 'is-hovering-card', 'is-panning', 'is-pan-enabled', 'is-inspector-open')
      stageElement?.classList.remove('is-inspector-open')
      destroyCardViews(cardViews)
      destroyColumnLabels(labels)
      destroyInspectorView(inspectorView)
      useGameStore.getState().finishCloseCardInspector()

      if (app) {
        app.destroy(true, { children: true })
      }
    },
  }
}
