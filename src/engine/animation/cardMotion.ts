import { gsap } from 'gsap'
import type { ColumnId } from '../model/boardTypes'
import type { SceneLayout } from '../layout/boardLayout'
import { clamp, lerp } from '../math/easing'
import type { CardView } from '../render/cardView'

export type PointerTracker = {
  x: number
  y: number
  previousX: number
  previousY: number
  vx: number
  vy: number
}

export const clearCardTweens = (card: CardView) => {
  gsap.killTweensOf(card.motion)
}

export const setCardHover = (card: CardView, isHovered: boolean) => {
  gsap.killTweensOf(card.visual)
  gsap.to(card.visual, {
    hover: isHovered ? 1 : 0,
    duration: isHovered ? 0.18 : 0.12,
    ease: isHovered ? 'back.out(1.9)' : 'power2.out',
  })
}

export const liftCard = (card: CardView) => {
  clearCardTweens(card)
  gsap.to(card.motion, {
    lift: 1,
    duration: 0.22,
    ease: 'back.out(1.7)',
  })
}

export const settleCard = (card: CardView, layout: SceneLayout, targetColumnId: ColumnId | null) => {
  clearCardTweens(card)
  card.phase = 'landing'
  card.flight = {
    fromX: card.x,
    fromY: card.y,
    toX: card.restX,
    toY: card.restY,
    height: (targetColumnId ? 40 : 76) * layout.scale,
  }
  card.motion.fly = 0
  card.motion.impact = 0
  card.targetRotation = 0

  gsap.to(card.motion, {
    fly: 1,
    lift: 0,
    duration: targetColumnId ? 0.42 : 0.56,
    ease: targetColumnId ? 'power3.out' : 'back.out(1.15)',
    onComplete: () => {
      card.phase = 'idle'
      card.flight = null
      card.x = card.restX
      card.y = card.restY
      card.rotation = 0
      card.tiltVelocity = 0
    },
  })
  gsap.to(card.motion, {
    impact: 1,
    delay: targetColumnId ? 0.27 : 0.38,
    duration: 0.08,
    yoyo: true,
    repeat: 1,
    ease: 'power2.out',
    onComplete: () => {
      card.motion.impact = 0
    },
  })
}

export const hopCardToRest = (card: CardView, layout: SceneLayout) => {
  clearCardTweens(card)
  card.phase = 'landing'
  card.flight = {
    fromX: card.x,
    fromY: card.y,
    toX: card.restX,
    toY: card.restY,
    height: 28 * layout.scale,
  }
  card.motion.fly = 0
  card.motion.impact = 0
  card.targetRotation = 0

  gsap.to(card.motion, {
    fly: 1,
    duration: 0.34,
    ease: 'power2.out',
    onComplete: () => {
      card.phase = 'idle'
      card.flight = null
      card.x = card.restX
      card.y = card.restY
      card.rotation = 0
      card.tiltVelocity = 0
    },
  })
  gsap.to(card.motion, {
    impact: 1,
    delay: 0.23,
    duration: 0.07,
    yoyo: true,
    repeat: 1,
    ease: 'power2.out',
    onComplete: () => {
      card.motion.impact = 0
    },
  })
}

export const updateCardMotion = (card: CardView, pointer: PointerTracker, layout: SceneLayout, delta: number) => {
  if (card.phase === 'held') {
    const targetX = pointer.x + card.dragOffset.x
    const targetY = pointer.y + card.dragOffset.y - 18 * layout.scale * card.motion.lift
    const follow = 1 - Math.pow(0.001, delta / 10)
    const targetTilt = clamp(pointer.vx * 0.009 + pointer.vy * 0.0025, -0.26, 0.26)
    const spring = (targetTilt - card.rotation) * 0.18 * delta
    const damping = Math.pow(0.72, delta)

    card.x = lerp(card.x, targetX, follow)
    card.y = lerp(card.y, targetY, follow)
    card.targetRotation = targetTilt
    card.tiltVelocity = (card.tiltVelocity + spring) * damping
    card.rotation += card.tiltVelocity * delta
    pointer.vx *= Math.pow(0.78, delta)
    pointer.vy *= Math.pow(0.78, delta)
  } else if (card.phase === 'landing' && card.flight) {
    const t = clamp(card.motion.fly, 0, 1)
    const arc = Math.sin(t * Math.PI) * card.flight.height

    card.x = lerp(card.flight.fromX, card.flight.toX, t)
    card.y = lerp(card.flight.fromY, card.flight.toY, t) - arc
    card.tiltVelocity *= Math.pow(0.58, delta)
    card.rotation = lerp(card.rotation, 0, 0.24 * delta)
  } else {
    card.x = lerp(card.x, card.restX, 0.18 * delta)
    card.y = lerp(card.y, card.restY, 0.18 * delta)
    card.tiltVelocity *= Math.pow(0.58, delta)
    card.rotation = lerp(card.rotation, 0, 0.16 * delta)
  }
}
