import { useEffect, useRef } from 'react'
import { createDeskScene, type DeskSceneController } from '../engine/render/createDeskScene'
import { CardInspector } from './card-inspector'

export function IsometricDesk() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<DeskSceneController | null>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const scene = createDeskScene({
      host,
      initialZoom: 1,
    })

    sceneRef.current = scene

    return () => {
      sceneRef.current = null
      scene.destroy()
    }
  }, [])

  return (
    <div className="desk-frame">
      <div ref={hostRef} className="desk-canvas" aria-label="Stacksy board concept" />
      <CardInspector />
    </div>
  )
}
