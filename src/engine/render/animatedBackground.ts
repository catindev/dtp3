import {
  BACKGROUND_BASE_COLOR,
  BACKGROUND_DPR_LIMIT,
  BACKGROUND_FRAME_INTERVAL_MS,
  createBackgroundPattern,
  drawBackgroundPattern,
  type BackgroundPattern,
} from './backgroundPattern'

export type AnimatedBackgroundController = {
  destroy: () => void
}

export const createAnimatedBackground = (
  canvas: HTMLCanvasElement,
): AnimatedBackgroundController | null => {
  const nextContext = canvas.getContext('2d', { alpha: false, desynchronized: true })

  if (!nextContext) {
    return null
  }

  const context = nextContext
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
  let pattern: BackgroundPattern | null = null
  let animationFrame = 0
  let redrawTimer = 0
  let disposed = false
  let width = 0
  let height = 0
  let dpr = 1

  const scheduleDraw = () => {
    if (disposed || reduceMotionQuery.matches) {
      return
    }

    window.clearTimeout(redrawTimer)
    redrawTimer = window.setTimeout(() => {
      redrawTimer = 0

      if (disposed || animationFrame) {
        return
      }

      animationFrame = window.requestAnimationFrame(draw)
    }, BACKGROUND_FRAME_INTERVAL_MS)
  }

  const requestDrawNow = () => {
    window.clearTimeout(redrawTimer)

    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame)
    }

    animationFrame = window.requestAnimationFrame(draw)
  }

  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    dpr = Math.min(window.devicePixelRatio || 1, BACKGROUND_DPR_LIMIT)
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    pattern = createBackgroundPattern(width, height)
    requestDrawNow()
  }

  function draw(now: number) {
    animationFrame = 0

    if (disposed) {
      return
    }

    const time = now * 0.00034

    pointer.x += (pointer.targetX - pointer.x) * 0.055
    pointer.y += (pointer.targetY - pointer.y) * 0.055

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.fillStyle = BACKGROUND_BASE_COLOR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.globalCompositeOperation = 'source-over'

    if (pattern) {
      drawBackgroundPattern(context, pattern, time, pointer.x, pointer.y)
    }

    scheduleDraw()
  }

  const handlePointerMove = (event: PointerEvent) => {
    pointer.targetX = (event.clientX / Math.max(1, width) - 0.5) * 2
    pointer.targetY = (event.clientY / Math.max(1, height) - 0.5) * 2
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', handlePointerMove, { passive: true })

  return {
    destroy: () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(redrawTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
    },
  }
}
