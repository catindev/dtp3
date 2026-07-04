import { useEffect } from 'react'
import { createGameTicker } from '../engine/time/gameTicker'
import { useGameStore } from '../store/gameStore'

export function GameTicker() {
  useEffect(() => {
    const ticker = createGameTicker(() => {
      useGameStore.getState().advanceGameTick()
    })

    return () => {
      ticker.destroy()
    }
  }, [])

  return null
}
