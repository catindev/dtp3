import { useEffect, useState } from 'react'

const UPDATE_INTERVAL_MS = 500

export function FpsCounter() {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let animationFrame = 0
    let frames = 0
    let lastUpdate = performance.now()

    const tick = (now: number) => {
      frames += 1
      const elapsed = now - lastUpdate

      if (elapsed >= UPDATE_INTERVAL_MS) {
        setFps(Math.round((frames * 1000) / elapsed))
        frames = 0
        lastUpdate = now
      }

      animationFrame = window.requestAnimationFrame(tick)
    }

    animationFrame = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <span className="fps-counter" aria-label={`FPS ${fps}`}>
      <span>FPS</span>
      <span className="fps-value">{fps || '--'}</span>
    </span>
  )
}
