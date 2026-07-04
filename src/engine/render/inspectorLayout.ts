import type { InspectorShellTarget } from '../animation/cardMotion'
import type { Vec2 } from '../layout/projection'
import type { CardView } from './cardView'

export type InspectorTargetRect = {
  x: number
  y: number
  width: number
  height: number
}

export type InspectorViewport = {
  width: number
  height: number
  isMobile: boolean
}

export const INSPECTOR_MOBILE_QUERY = '(max-width: 760px)'

const INSPECTOR_DESKTOP_MARGIN = 56
const INSPECTOR_MOBILE_MARGIN = 18
const INSPECTOR_VERTICAL_MARGIN = 28
const INSPECTOR_DESKTOP_WIDTH = 560
const INSPECTOR_MAX_HEIGHT = 720

export const getInspectorTargetRect = ({ width: viewportWidth, height: viewportHeight, isMobile }: InspectorViewport) => {
  const margin = isMobile ? INSPECTOR_MOBILE_MARGIN : INSPECTOR_DESKTOP_MARGIN
  const width = isMobile
    ? Math.max(300, viewportWidth - margin * 2)
    : Math.min(INSPECTOR_DESKTOP_WIDTH, Math.max(300, viewportWidth - margin * 2))
  const height = Math.min(
    INSPECTOR_MAX_HEIGHT,
    Math.max(360, viewportHeight - INSPECTOR_VERTICAL_MARGIN * 2),
  )

  return {
    x: (viewportWidth - width) / 2,
    y: (viewportHeight - height) / 2,
    width,
    height,
  }
}

export const toLocalInspectorTarget = (
  rect: InspectorTargetRect,
  hostBounds: Pick<DOMRect, 'left' | 'top'>,
): InspectorShellTarget => ({
  x: rect.x + rect.width / 2 - hostBounds.left,
  y: rect.y + rect.height / 2 - hostBounds.top,
  width: rect.width,
  height: rect.height,
})

export const isPointInsideInspectorShell = (point: Vec2, card: CardView | null) => {
  if (!card || card.motion.inspectorWidth <= 0 || card.motion.inspectorHeight <= 0) {
    return false
  }

  return (
    point.x >= card.x - card.motion.inspectorWidth / 2 &&
    point.x <= card.x + card.motion.inspectorWidth / 2 &&
    point.y >= card.y - card.motion.inspectorHeight / 2 &&
    point.y <= card.y + card.motion.inspectorHeight / 2
  )
}
