import { useEffect } from 'react'
import { GAME_TICK_MS } from '../engine/model/gameClock'
import { useGameStore } from '../store/gameStore'

export function GameTicker() {
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      useGameStore.getState().advanceGameTick()
    }, GAME_TICK_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return null
}
