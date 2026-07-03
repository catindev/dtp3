import { useEffect, useRef } from 'react'
import {
  BACKGROUND_BASE_COLOR,
  BACKGROUND_DPR_LIMIT,
  BACKGROUND_FRAME_INTERVAL_MS,
  createBackgroundPattern,
  drawBackgroundPattern,
  type BackgroundPattern,
} from '../engine/render/backgroundPattern'

export function AbstractBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d', { alpha: false })

    if (!context) {
      return
    }

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
    let pattern: BackgroundPattern | null = null
    let animationFrame = 0
    let lastDrawTime = -Infinity
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, BACKGROUND_DPR_LIMIT)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      pattern = createBackgroundPattern(width, height)
      lastDrawTime = -Infinity
    }

    const draw = (now: number) => {
      const shouldDraw =
        now - lastDrawTime >= BACKGROUND_FRAME_INTERVAL_MS || lastDrawTime === -Infinity

      if (!shouldDraw) {
        animationFrame = window.requestAnimationFrame(draw)
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
      lastDrawTime = now

      if (!reduceMotionQuery.matches) {
        animationFrame = window.requestAnimationFrame(draw)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointer.targetX = (event.clientX / Math.max(1, width) - 0.5) * 2
      pointer.targetY = (event.clientY / Math.max(1, height) - 0.5) * 2
    }

    resize()
    draw(0)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    if (!reduceMotionQuery.matches) {
      animationFrame = window.requestAnimationFrame(draw)
    }

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="abstract-background" aria-hidden="true" />
}
