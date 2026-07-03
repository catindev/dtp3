import { useEffect, useState } from 'react'

const FPS_SAMPLE_MS = 1000

export function DebugOverlay() {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let frame = 0
    let frames = 0
    let sampleStart = performance.now()
    let disposed = false

    const tick = (now: number) => {
      if (disposed) {
        return
      }

      frames += 1

      if (now - sampleStart >= FPS_SAMPLE_MS) {
        setFps(Math.round((frames * 1000) / (now - sampleStart)))
        frames = 0
        sampleStart = now
      }

      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <aside className="debug-overlay" aria-label="Build diagnostics">
      <span>FPS {fps}</span>
      <span>v{__APP_VERSION__}</span>
      <span>{__BUILD_HASH__}</span>
    </aside>
  )
}
