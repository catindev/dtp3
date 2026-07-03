import type { Vec2 } from '../layout/projection'
import { ZOOM } from '../model/gameConstants'
import { clamp } from '../math/easing'

export type SceneViewport = {
  zoom: number
  zoomMax: number
  cameraOffset: Vec2
}

export const createSceneViewport = (initialZoom: number): SceneViewport => ({
  zoom: clamp(initialZoom, ZOOM.min, ZOOM.max),
  zoomMax: ZOOM.max,
  cameraOffset: { x: 0, y: 0 },
})
