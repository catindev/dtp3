import { useEffect, useRef } from 'react'
import { createAnimatedBackground } from '../engine/render/animatedBackground'

export function AbstractBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const background = createAnimatedBackground(canvas)

    return () => {
      background?.destroy()
    }
  }, [])

  return <canvas ref={canvasRef} className="abstract-background" aria-hidden="true" />
}
