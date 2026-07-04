const DEFAULT_FPS_SAMPLE_MS = 1000

export type FpsMeterController = {
  destroy: () => void
}

export const createFpsMeter = (
  onSample: (fps: number) => void,
  sampleMs = DEFAULT_FPS_SAMPLE_MS,
): FpsMeterController => {
  let frame = 0
  let frames = 0
  let sampleStart = performance.now()
  let disposed = false

  const tick = (now: number) => {
    if (disposed) {
      return
    }

    frames += 1

    if (now - sampleStart >= sampleMs) {
      onSample(Math.round((frames * 1000) / (now - sampleStart)))
      frames = 0
      sampleStart = now
    }

    frame = window.requestAnimationFrame(tick)
  }

  frame = window.requestAnimationFrame(tick)

  return {
    destroy: () => {
      disposed = true
      window.cancelAnimationFrame(frame)
    },
  }
}
