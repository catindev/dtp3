import { gsap } from 'gsap'
import { getPolygonBounds, type SceneLayout } from '../layout/boardLayout'
import type { Vec2 } from '../layout/projection'
import { ZOOM } from '../model/gameConstants'
import { clamp } from '../math/easing'

export type SceneViewport = {
  zoom: number
  zoomMax: number
  cameraOffset: Vec2
  rightHudInset: number
  hudShiftTarget: number
  hoverLockUntil: number
  hudMotion: {
    x: number
  }
}

const HUD_SHIFT_LEFT_MARGIN = 28
const HUD_SHIFT_TRIGGER_OVERLAP = 36
const HUD_SHIFT_EXTRA_SPACE = 24
const HUD_SHIFT_VIEWPORT_LIMIT_RATIO = 0.24
const HOVER_LOCK_AFTER_LAYOUT_SHIFT_MS = 620

export const createSceneViewport = (initialZoom: number): SceneViewport => ({
  zoom: clamp(initialZoom, ZOOM.min, ZOOM.max),
  zoomMax: ZOOM.max,
  cameraOffset: { x: 0, y: 0 },
  rightHudInset: 0,
  hudShiftTarget: 0,
  hoverLockUntil: 0,
  hudMotion: { x: 0 },
})

export const getTargetHudShiftX = (layout: SceneLayout, rightHudInset: number) => {
  if (rightHudInset <= 0) {
    return 0
  }

  const bounds = getPolygonBounds(layout.workspacePolygon)
  const inspectorStartX = layout.width - rightHudInset
  const overlap = bounds.maxX - inspectorStartX

  if (overlap <= HUD_SHIFT_TRIGGER_OVERLAP) {
    return 0
  }

  const allowedLeftShift = Math.max(0, bounds.minX - HUD_SHIFT_LEFT_MARGIN)
  const viewportLimit = layout.width * HUD_SHIFT_VIEWPORT_LIMIT_RATIO

  return -Math.min(overlap + HUD_SHIFT_EXTRA_SPACE, allowedLeftShift, viewportLimit)
}

export const lockHoverForLayoutShift = (viewport: SceneViewport) => {
  viewport.hoverLockUntil = performance.now() + HOVER_LOCK_AFTER_LAYOUT_SHIFT_MS
}

export const isHoverLockedForLayoutShift = (viewport: SceneViewport) =>
  performance.now() < viewport.hoverLockUntil

export const setHudShiftTarget = (
  viewport: SceneViewport,
  target: number,
  onUpdate: () => void,
) => {
  if (Math.abs(target - viewport.hudShiftTarget) < 0.5) {
    return false
  }

  viewport.hudShiftTarget = target
  lockHoverForLayoutShift(viewport)
  gsap.killTweensOf(viewport.hudMotion)
  gsap.to(viewport.hudMotion, {
    x: target,
    duration: 0.58,
    ease: 'elastic.out(0.82, 0.72)',
    onUpdate,
    onComplete: onUpdate,
  })

  return true
}

export const setRightHudInset = (viewport: SceneViewport, nextRightHudInset: number) => {
  const nextInset = Math.max(0, nextRightHudInset)

  if (Math.abs(nextInset - viewport.rightHudInset) < 0.5) {
    return false
  }

  viewport.rightHudInset = nextInset
  lockHoverForLayoutShift(viewport)

  return true
}

export const destroySceneViewport = (viewport: SceneViewport) => {
  gsap.killTweensOf(viewport.hudMotion)
}
