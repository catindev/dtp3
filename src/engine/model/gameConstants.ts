export const BOARD_GEOMETRY = {
  frontTiltY: 0.72,
  farEdgeScale: 0.76,
  nearEdgeScale: 1.1,
  deskPaddingU: 58,
  deskPaddingV: 46,
  columnWidth: 214,
  columnGap: 28,
  columnLabelV: 26,
  columnBottomPaddingV: 58,
  cardStartV: 64,
  cardInsetU: 29,
  cardGapV: 20,
  slotExtraWidth: 10,
  slotExtraHeight: 8,
  slotOffsetU: -5,
  slotOffsetV: -7,
} as const

export const CARD_SIZE = {
  width: 156,
  height: 86,
  padding: 24,
} as const

export const ZOOM = {
  min: 0.84,
  max: 1.08,
  step: 0.1,
} as const

export const SURFACE_SHADOW = 0x33291b

export const TOKENS = {
  desk: {
    fill: 0xe0d6bd,
    border: 0xcbbe9e,
    radius: 16,
  },
  column: {
    fill: 0xeae2cd,
    hoverFill: 0xf1ead7,
    border: 0xd8cdb2,
    hoverBorder: 0xc8ad70,
    radius: 12,
  },
  card: {
    fill: 0xfffdf6,
    border: 0xd8cdb2,
    radius: 10,
  },
  slot: {
    emptyBorder: 0xc9bfa8,
    dropFill: 0xfffdf6,
    dropBorder: 0xe8c9a8,
    radius: 9,
  },
  text: {
    primary: 0x33291b,
    secondary: 0x7a684c,
  },
} as const
