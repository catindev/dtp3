import { Container, Graphics, Text } from 'pixi.js'
import { CARD_SIZE, SURFACE_SHADOW, TOKENS } from '../model/gameConstants'
import type { BoardCard, CardId, SlotId } from '../model/boardTypes'
import { getCardRestCorners, type SceneLayout } from '../layout/boardLayout'
import { projectWithContext, surfaceOffset } from '../layout/projection'
import { clamp, easeOutQuad, lerp } from '../math/easing'
import type { Polygon, Vec2 } from '../layout/projection'
import { applySurfaceTextTransform } from './textTransform'
import { CARD_TITLE_STYLE, formatCardTitle } from './cardTypography'
import { drawRoundedPolygon, offsetPolygon, scalePolygon, spreadPolygon } from './pixiPrimitives'
import { getCardAccent, getCardKicker } from '../model/cardPresentation'
import infoIconSvg from '../../assets/info-icon.svg?raw'

export type CardPhase = 'idle' | 'held' | 'landing' | 'inspector-opening' | 'inspector-open' | 'inspector-returning'

export type Flight = {
  fromX: number
  fromY: number
  toX: number
  toY: number
  height: number
}

export type CardView = {
  id: CardId
  data: BoardCard
  root: Container
  shadow: Graphics
  body: Graphics
  shine: Graphics
  accent: Graphics
  infoIcon: Graphics
  title: Text
  kicker: Text
  x: number
  y: number
  restX: number
  restY: number
  restU: number
  restV: number
  rotation: number
  tiltVelocity: number
  targetRotation: number
  dragOffset: Vec2
  motion: {
    lift: number
    fly: number
    impact: number
    contentAlpha: number
    detailAlpha: number
    backdropAlpha: number
    inspectorWidth: number
    inspectorHeight: number
  }
  visual: {
    hover: number
    hoverTarget: number
    hoverVelocity: number
  }
  phase: CardPhase
  flight: Flight | null
  hitPolygon: Polygon
  infoHitPolygon: Polygon
  slotId: SlotId | null
}

const INFO_ICON_SIZE = 38
const INFO_ICON_SOURCE_SIZE = 32
const INFO_ICON_INSET = 20
const INFO_ICON_HIT_SIZE = 46

const rotatePoint = (point: Vec2, rotation: number): Vec2 => {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

const getHeldCardSize = (layout: SceneLayout) => ({
  width: (CARD_SIZE.width + 8) * layout.scale,
  height: (CARD_SIZE.height + 28) * layout.scale,
})

const getHeldCardCorners = (layout: SceneLayout) => {
  const { width, height } = getHeldCardSize(layout)

  return [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ]
}

const mixPolygon = (from: Polygon, to: Polygon, amount: number) =>
  from.map((point, index) => ({
    x: lerp(point.x, to[index].x, amount),
    y: lerp(point.y, to[index].y, amount),
  }))

const mixPoint = (from: Vec2, to: Vec2, amount: number) => ({
  x: lerp(from.x, to.x, amount),
  y: lerp(from.y, to.y, amount),
})

const getSurfaceLocalPoint = (layout: SceneLayout, card: CardView, offsetU: number, offsetV: number): Vec2 => {
  const projected = projectWithContext(card.restU + offsetU, card.restV + offsetV, layout)
  const center = projectWithContext(card.restU, card.restV, layout)

  return {
    x: projected.x - center.x,
    y: projected.y - center.y,
  }
}

const getSurfaceLocalRect = (
  layout: SceneLayout,
  card: CardView,
  leftU: number,
  topV: number,
  widthU: number,
  heightV: number,
) => [
  getSurfaceLocalPoint(layout, card, leftU, topV),
  getSurfaceLocalPoint(layout, card, leftU + widthU, topV),
  getSurfaceLocalPoint(layout, card, leftU + widthU, topV + heightV),
  getSurfaceLocalPoint(layout, card, leftU, topV + heightV),
]

const getScreenLocalRect = (left: number, top: number, width: number, height: number) => [
  { x: left, y: top },
  { x: left + width, y: top },
  { x: left + width, y: top + height },
  { x: left, y: top + height },
]

const mixCorners = (rest: Polygon, lifted: Polygon, lift: number) => mixPolygon(rest, lifted, easeOutQuad(lift))

const mixColor = (from: number, to: number, amount: number) => {
  const t = clamp(amount, 0, 1)
  const fromR = (from >> 16) & 255
  const fromG = (from >> 8) & 255
  const fromB = from & 255
  const toR = (to >> 16) & 255
  const toG = (to >> 8) & 255
  const toB = to & 255

  return (
    (Math.round(lerp(fromR, toR, t)) << 16) |
    (Math.round(lerp(fromG, toG, t)) << 8) |
    Math.round(lerp(fromB, toB, t))
  )
}

export const createCardView = (card: BoardCard) => {
  const root = new Container()
  const shadow = new Graphics()
  const body = new Graphics()
  const shine = new Graphics()
  const accent = new Graphics()
  const infoIcon = new Graphics().svg(infoIconSvg)
  const title = new Text({
    text: formatCardTitle(card.title),
    style: CARD_TITLE_STYLE,
  })
  const kicker = new Text({
    text: getCardKicker(card),
    style: {
      fill: TOKENS.text.secondary,
      fontFamily: 'Onest Variable, ui-sans-serif, system-ui, sans-serif',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0,
    },
  })

  title.anchor.set(0, 0)
  kicker.anchor.set(0, 0.5)
  root.addChild(shadow, body, shine, accent, title, kicker, infoIcon)

  return {
    id: card.id,
    data: card,
    root,
    shadow,
    body,
    shine,
    accent,
    infoIcon,
    title,
    kicker,
    x: 0,
    y: 0,
    restX: 0,
    restY: 0,
    restU: 0,
    restV: 0,
    rotation: 0,
    tiltVelocity: 0,
    targetRotation: 0,
    dragOffset: { x: 0, y: 0 },
    motion: {
      lift: 0,
      fly: 1,
      impact: 0,
      contentAlpha: 1,
      detailAlpha: 0,
      backdropAlpha: 0,
      inspectorWidth: 0,
      inspectorHeight: 0,
    },
    visual: { hover: 0, hoverTarget: 0, hoverVelocity: 0 },
    phase: 'idle',
    flight: null,
    hitPolygon: [],
    infoHitPolygon: [],
    slotId: null,
  } satisfies CardView
}

export const drawCard = (card: CardView, layout: SceneLayout) => {
  const lift = clamp(card.motion.lift, 0, 1)
  const impact = card.motion.impact
  const isInspectorPhase =
    card.phase === 'inspector-opening' ||
    card.phase === 'inspector-open' ||
    card.phase === 'inspector-returning'
  const inspectorStyle = isInspectorPhase ? easeOutQuad(lift) : 0
  const liftScale = isInspectorPhase ? 0 : lift * 0.035
  const scaleX = 1 + liftScale + impact * 0.045
  const scaleY = 1 + liftScale - impact * 0.06
  const shapeLift = card.phase === 'held' || card.phase === 'inspector-open' ? 1 : lift
  const restCorners = getCardRestCorners(layout, card.restU, card.restV)
  const inspectorWidth = card.motion.inspectorWidth || getHeldCardSize(layout).width
  const inspectorHeight = card.motion.inspectorHeight || getHeldCardSize(layout).height
  const liftedCorners = isInspectorPhase
    ? getScreenLocalRect(-inspectorWidth / 2, -inspectorHeight / 2, inspectorWidth, inspectorHeight)
    : getHeldCardCorners(layout)
  const corners = mixCorners(restCorners, liftedCorners, shapeLift)
  const hoverMotion = clamp(Math.max(card.visual.hover, card.phase === 'held' ? 1 : 0), 0, 1.18)
  const hoverAlpha = clamp(hoverMotion, 0, 1)
  const idleHoverMotion = card.phase === 'idle' ? clamp(card.visual.hover, 0, 1.18) : 0
  const idleHoverAlpha = clamp(idleHoverMotion, 0, 1)
  const contentAlpha = clamp(card.motion.contentAlpha, 0, 1)
  const bodyFill = mixColor(TOKENS.card.fill, 0xf3e7d2, inspectorStyle)
  const bodyBorder = mixColor(TOKENS.card.border, 0xc9702a, inspectorStyle)
  const bodyRadius = lerp(TOKENS.card.radius * layout.scale, 18, inspectorStyle)
  const bodyStrokeWidth = lerp(1.5 * layout.scale, 4, inspectorStyle)
  const contentLift = easeOutQuad(shapeLift)
  const cardLeftU = -CARD_SIZE.width / 2
  const cardTopV = -CARD_SIZE.height / 2
  const contentLeftU = cardLeftU + CARD_SIZE.padding
  const contentTopV = cardTopV + CARD_SIZE.padding
  const heldSize = getHeldCardSize(layout)
  const heldContentLeft = -heldSize.width / 2 + CARD_SIZE.padding * layout.scale
  const heldContentTop = -heldSize.height / 2 + CARD_SIZE.padding * layout.scale
  const accentSurface = getSurfaceLocalRect(layout, card, contentLeftU, contentTopV, 30, 5)
  const accentScreen = getScreenLocalRect(
    heldContentLeft,
    heldContentTop,
    30 * layout.scale,
    5 * layout.scale,
  )
  const accentCorners = mixPolygon(accentSurface, accentScreen, contentLift)
  const kickerSurface = getSurfaceLocalPoint(layout, card, contentLeftU, contentTopV + 12)
  const kickerScreen = { x: heldContentLeft, y: heldContentTop + 12 * layout.scale }
  const titleSurface = getSurfaceLocalPoint(layout, card, contentLeftU, contentTopV + 24)
  const titleScreen = { x: heldContentLeft, y: heldContentTop + 24 * layout.scale }
  const kickerPoint = mixPoint(kickerSurface, kickerScreen, contentLift)
  const titlePoint = mixPoint(titleSurface, titleScreen, contentLift)
  const infoIconCenterU = CARD_SIZE.width / 2 - INFO_ICON_INSET
  const infoIconCenterV = -CARD_SIZE.height / 2 + INFO_ICON_INSET
  const infoIconSurface = getSurfaceLocalPoint(layout, card, infoIconCenterU, infoIconCenterV)
  const infoIconHitSurface = getSurfaceLocalRect(
    layout,
    card,
    infoIconCenterU - INFO_ICON_HIT_SIZE / 2,
    infoIconCenterV - INFO_ICON_HIT_SIZE / 2,
    INFO_ICON_HIT_SIZE,
    INFO_ICON_HIT_SIZE,
  )
  const textU = card.restU + contentLeftU
  const kickerV = card.restV + contentTopV + 12
  const titleV = card.restV + contentTopV + 24
  const floorOffset = surfaceOffset(layout, card.restU, card.restV, 2 + lift * 11 + impact * 2)
  const castOffset = {
    x: floorOffset.x + (3 + lift * 12) * layout.scale,
    y: floorOffset.y + (2 + lift * 10) * layout.scale,
  }
  const ambientOffset = {
    x: floorOffset.x + (6 + lift * 22) * layout.scale,
    y: floorOffset.y + (4 + lift * 18) * layout.scale,
  }

  card.root.x = card.x
  card.root.y = card.y
  card.root.rotation = card.rotation
  card.root.scale.set(scaleX, scaleY)
  card.root.zIndex =
    card.phase === 'held' || isInspectorPhase ? 100_000 : card.phase === 'landing' ? 90_000 : Math.round(card.y)
  card.shadow.clear()
  card.body.clear()
  card.shine.clear()
  card.accent.clear()
  if (isInspectorPhase) {
    const modalShadow = clamp(inspectorStyle, 0, 1)
    const modalSpread = 3 + modalShadow * 5

    drawRoundedPolygon(
      card.shadow,
      offsetPolygon(spreadPolygon(corners, modalSpread), 0, 10),
      bodyRadius + modalSpread * 0.6,
      SURFACE_SHADOW,
      0.055 * modalShadow,
    )
    drawRoundedPolygon(
      card.shadow,
      offsetPolygon(spreadPolygon(corners, 1 + modalShadow * 3), 0, 3),
      bodyRadius + 4,
      SURFACE_SHADOW,
      0.05 * modalShadow,
    )
  } else {
    drawRoundedPolygon(
      card.shadow,
      offsetPolygon(corners, floorOffset.x, floorOffset.y),
      TOKENS.card.radius * layout.scale,
      SURFACE_SHADOW,
      0.05,
    )
    drawRoundedPolygon(
      card.shadow,
      offsetPolygon(scalePolygon(corners, 1 + lift * 0.07, 1 + lift * 0.05), castOffset.x, castOffset.y),
      TOKENS.card.radius * layout.scale,
      SURFACE_SHADOW,
      0.038 + lift * 0.04,
    )
    drawRoundedPolygon(
      card.shadow,
      offsetPolygon(scalePolygon(corners, 1 + lift * 0.2, 1 + lift * 0.16), ambientOffset.x, ambientOffset.y),
      TOKENS.card.radius * layout.scale,
      SURFACE_SHADOW,
      lift * 0.035,
    )
  }
  if (idleHoverMotion > 0.001) {
    const outlineSpread = 2.3 * layout.scale * idleHoverMotion
    const dropSpread = 5 * layout.scale * idleHoverMotion

    drawRoundedPolygon(
      card.shadow,
      offsetPolygon(spreadPolygon(corners, dropSpread), 0, 3 * layout.scale * idleHoverMotion),
      TOKENS.card.radius * layout.scale + dropSpread * 0.65,
      SURFACE_SHADOW,
      0.07 * idleHoverAlpha,
    )
    drawRoundedPolygon(
      card.shadow,
      spreadPolygon(corners, outlineSpread),
      TOKENS.card.radius * layout.scale + outlineSpread,
      TOKENS.card.hoverBorder,
      0.22 * idleHoverAlpha,
    )
  }
  drawRoundedPolygon(
    card.body,
    corners,
    bodyRadius,
    bodyFill,
    1,
    bodyBorder,
    1,
    bodyStrokeWidth,
  )
  if (hoverMotion > 0.001) {
    drawRoundedPolygon(
      card.body,
      corners,
      TOKENS.card.radius * layout.scale,
      TOKENS.card.fill,
      0,
      TOKENS.card.hoverBorder,
      hoverAlpha,
      (1.5 + Math.max(0, hoverMotion - 1) * 1.2) * layout.scale,
    )
  }

  drawRoundedPolygon(
    card.accent,
    accentCorners,
    3 * layout.scale,
    getCardAccent(card.data),
    0.94 * contentAlpha,
  )

  card.accent.visible = contentAlpha > 0.01
  card.kicker.x = kickerPoint.x
  card.kicker.y = kickerPoint.y
  applySurfaceTextTransform(card.kicker, layout, textU, kickerV, 0.76 + contentLift * 0.1, shapeLift)
  card.kicker.alpha = 0.72 * contentAlpha
  card.kicker.visible = contentAlpha > 0.01
  card.title.x = titlePoint.x
  card.title.y = titlePoint.y
  applySurfaceTextTransform(card.title, layout, textU, titleV, 0.78 + contentLift * 0.14, shapeLift)
  card.title.alpha = 0.92 * contentAlpha
  card.title.visible = contentAlpha > 0.01
  const infoIconAppear = card.phase === 'idle' ? idleHoverMotion : 0
  const infoIconAlpha = clamp(infoIconAppear, 0, 1)
  const infoIconOvershoot = Math.max(0, infoIconAppear - 1)
  const infoIconScale =
    ((INFO_ICON_SIZE * layout.scale) / INFO_ICON_SOURCE_SIZE) * (0.42 + infoIconAlpha * 0.58 + infoIconOvershoot * 0.16)

  card.infoIcon.visible = infoIconAlpha > 0.015
  card.infoIcon.x = infoIconSurface.x - (INFO_ICON_SOURCE_SIZE * infoIconScale) / 2
  card.infoIcon.y = infoIconSurface.y - (INFO_ICON_SOURCE_SIZE * infoIconScale) / 2
  card.infoIcon.rotation = 0
  card.infoIcon.skew.set(0, 0)
  card.infoIcon.scale.set(infoIconScale)
  card.infoIcon.alpha = infoIconAlpha
  card.hitPolygon = corners.map((point) => {
    const scaled = { x: point.x * scaleX, y: point.y * scaleY }
    const rotated = rotatePoint(scaled, card.rotation)

    return {
      x: rotated.x + card.x,
      y: rotated.y + card.y,
    }
  })
  card.infoHitPolygon =
    card.phase === 'idle' && infoIconAlpha > 0.2
      ? infoIconHitSurface.map((point) => {
          const scaled = { x: point.x * scaleX, y: point.y * scaleY }
          const rotated = rotatePoint(scaled, card.rotation)

          return {
            x: rotated.x + card.x,
            y: rotated.y + card.y,
          }
        })
      : []
}
