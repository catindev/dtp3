import { GAME_TICK_MS } from '../model/gameClock'

export type GameTickerController = {
  destroy: () => void
}

export const createGameTicker = (onTick: () => void): GameTickerController => {
  const intervalId = window.setInterval(onTick, GAME_TICK_MS)

  return {
    destroy: () => {
      window.clearInterval(intervalId)
    },
  }
}
