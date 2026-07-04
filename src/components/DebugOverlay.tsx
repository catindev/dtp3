import { useEffect, useState } from 'react'
import { createFpsMeter } from '../engine/performance/fpsMeter'

export function DebugOverlay() {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    const fpsMeter = createFpsMeter(setFps)

    return () => {
      fpsMeter.destroy()
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
