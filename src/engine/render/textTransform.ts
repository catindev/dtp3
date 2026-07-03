import type { Text } from 'pixi.js'
import type { SceneLayout } from '../layout/boardLayout'
import { surfaceBasis } from '../layout/projection'
import { clamp, easeOutQuad, lerp } from '../math/easing'

export const applySurfaceTextTransform = (
  text: Text,
  layout: SceneLayout,
  u: number,
  v: number,
  scale: number,
  lift = 0,
) => {
  const basis = surfaceBasis(layout, u, v)
  const amount = easeOutQuad(clamp(lift, 0, 1))
  const screenScale = layout.scale * scale

  text.rotation = lerp(basis.rotation, 0, amount)
  text.skew.set(lerp(basis.skewX, 0, amount), 0)
  text.scale.set(
    lerp(basis.scaleX * scale, screenScale, amount),
    lerp(basis.scaleY * scale, screenScale, amount),
  )
}
