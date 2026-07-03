export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const easeOutQuad = (value: number) => 1 - (1 - value) * (1 - value)

export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount
