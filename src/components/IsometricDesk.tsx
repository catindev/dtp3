import { useEffect, useRef, useState } from 'react'
import { ZOOM } from '../engine/model/gameConstants'
import { createDeskScene, type DeskSceneController } from '../engine/render/createDeskScene'

export function IsometricDesk() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<DeskSceneController | null>(null)
  const [zoom, setZoom] = useState(1)
  const [zoomMax, setZoomMax] = useState<number>(ZOOM.max)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const scene = createDeskScene({
      host,
      initialZoom: 1,
      onZoomChange: setZoom,
      onZoomMaxChange: setZoomMax,
    })

    sceneRef.current = scene

    return () => {
      sceneRef.current = null
      scene.destroy()
    }
  }, [])

  const requestZoom = (nextZoom: number) => {
    sceneRef.current?.setZoom(nextZoom)
  }

  return (
    <div className="desk-frame">
      <div ref={hostRef} className="desk-canvas" aria-label="Stacksy board concept" />
      <div className="zoom-controls" aria-label="Zoom controls">
        <button type="button" aria-label="Zoom out" onClick={() => requestZoom(zoom - ZOOM.step)}>
          -
        </button>
        <input
          aria-label="Zoom"
          type="range"
          min={ZOOM.min}
          max={zoomMax}
          step={0.01}
          value={zoom}
          onChange={(event) => requestZoom(Number(event.currentTarget.value))}
        />
        <button type="button" aria-label="Zoom in" onClick={() => requestZoom(zoom + ZOOM.step)}>
          +
        </button>
        <button type="button" className="zoom-reset" aria-label="Reset zoom" onClick={() => requestZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </div>
  )
}
