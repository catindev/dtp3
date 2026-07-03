import { Container, Graphics, Text } from 'pixi.js'
import { CARD_SIZE, SURFACE_SHADOW, TOKENS } from '../model/gameConstants'
import type { BoardCard, CardId, SlotId } from '../model/boardTypes'
import { getCardRestCorners, type SceneLayout } from '../layout/boardLayout'
import { projectWithContext, surfaceOffset } from '../layout/projection'
import { clamp, easeOutQuad, lerp } from '../math/easing'
import type { Polygon, Vec2 } from '../layout/projection'
import { applySurfaceTextTransform } from './textTransform'
import { drawRoundedPolygon, offsetPolygon, scalePolygon } from './pixiPrimitives'

export type CardPhase = 'idle' | 'held' | 'landing'

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
  }
  phase: CardPhase
  flight: Flight | null
  hitPolygon: Polygon
  slotId: SlotId | null
}

const rotatePoint = (point: Vec2, rotation: number): Vec2 => {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

const getHeldCardSize = (layout: SceneLayout) => ({
  width: (CARD_SIZE.width + 26) * layout.scale,
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

export const createCardView = (card: BoardCard) => {
  const root = new Container()
  const shadow = new Graphics()
  const body = new Graphics()
  const shine = new Graphics()
  const accent = new Graphics()
  const title = new Text({
    text: card.title,
    style: {
      fill: TOKENS.text.primary,
      fontFamily: 'Onest Variable, ui-sans-serif, system-ui, sans-serif',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0,
    },
  })
  const kicker = new Text({
    text: card.kicker.toUpperCase(),
    style: {
      fill: TOKENS.text.secondary,
      fontFamily: 'Onest Variable, ui-sans-serif, system-ui, sans-serif',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0,
    },
  })

  title.anchor.set(0, 0.5)
  kicker.anchor.set(0, 0.5)
  root.addChild(shadow, body, shine, accent, title, kicker)

  return {
    id: card.id,
    data: card,
    root,
    shadow,
    body,
    shine,
    accent,
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
    motion: { lift: 0, fly: 1, impact: 0 },
    phase: 'idle',
    flight: null,
    hitPolygon: [],
    slotId: null,
  } satisfies CardView
}

export const drawCard = (card: CardView, layout: SceneLayout) => {
  const lift = clamp(card.motion.lift, 0, 1)
  const impact = card.motion.impact
  const scaleX = 1 + lift * 0.035 + impact * 0.045
  const scaleY = 1 + lift * 0.035 - impact * 0.06
  const shapeLift = card.phase === 'held' ? 1 : lift
  const restCorners = getCardRestCorners(layout, card.restU, card.restV)
  const liftedCorners = getHeldCardCorners(layout)
  const corners = mixCorners(restCorners, liftedCorners, shapeLift)
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
  const titleSurface = getSurfaceLocalPoint(layout, card, contentLeftU, contentTopV + 32)
  const titleScreen = { x: heldContentLeft, y: heldContentTop + 32 * layout.scale }
  const kickerPoint = mixPoint(kickerSurface, kickerScreen, contentLift)
  const titlePoint = mixPoint(titleSurface, titleScreen, contentLift)
  const textU = card.restU + contentLeftU
  const kickerV = card.restV + contentTopV + 12
  const titleV = card.restV + contentTopV + 32
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
    card.phase === 'held' ? 100_000 : card.phase === 'landing' ? 90_000 : Math.round(card.y)
  card.shadow.clear()
  card.body.clear()
  card.shine.clear()
  card.accent.clear()
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
  drawRoundedPolygon(
    card.body,
    corners,
    TOKENS.card.radius * layout.scale,
    TOKENS.card.fill,
    1,
    TOKENS.card.border,
    1,
    1.5 * layout.scale,
  )

  drawRoundedPolygon(
    card.accent,
    accentCorners,
    3 * layout.scale,
    card.data.accent,
    0.94,
  )

  card.kicker.x = kickerPoint.x
  card.kicker.y = kickerPoint.y
  applySurfaceTextTransform(card.kicker, layout, textU, kickerV, 0.76 + contentLift * 0.1, shapeLift)
  card.kicker.alpha = 0.72
  card.title.x = titlePoint.x
  card.title.y = titlePoint.y
  applySurfaceTextTransform(card.title, layout, textU, titleV, 0.78 + contentLift * 0.14, shapeLift)
  card.title.alpha = 0.92
  card.hitPolygon = corners.map((point) => {
    const scaled = { x: point.x * scaleX, y: point.y * scaleY }
    const rotated = rotatePoint(scaled, card.rotation)

    return {
      x: rotated.x + card.x,
      y: rotated.y + card.y,
    }
  })
}
