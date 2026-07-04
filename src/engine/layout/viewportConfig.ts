// Reserve room for the future game header when calculating max zoom and camera bounds.
export const VIEWPORT_RESERVED_HEADER_Y = 80

export const CAMERA_EDGE_MARGIN = {
  top: 64 + VIEWPORT_RESERVED_HEADER_Y,
  right: 28,
  bottom: 28,
  left: 28,
} as const

export const CAMERA_COMPOSITION = {
  centerX: 0.5,
  centerY: 0.43,
} as const

export const WORKSPACE_FIT_MARGIN = {
  top: 72 + VIEWPORT_RESERVED_HEADER_Y,
  right: 52,
  bottom: 36,
  left: 52,
} as const
