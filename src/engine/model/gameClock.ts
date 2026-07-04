export const GAME_TICK_MS = 500
export const GAME_DAY_START_MINUTE = 8 * 60
export const GAME_DAY_END_MINUTE = 18 * 60
export const GAME_MINUTES_PER_TICK = 1

export type GameClockState = {
  day: number
  minuteOfDay: number
  tick: number
}

export const initialGameClock: GameClockState = {
  day: 1,
  minuteOfDay: GAME_DAY_START_MINUTE,
  tick: 0,
}

export const advanceGameClock = (clock: GameClockState): GameClockState => {
  const nextMinute = clock.minuteOfDay + GAME_MINUTES_PER_TICK

  if (nextMinute > GAME_DAY_END_MINUTE) {
    return {
      day: clock.day + 1,
      minuteOfDay: GAME_DAY_START_MINUTE,
      tick: clock.tick + 1,
    }
  }

  return {
    ...clock,
    minuteOfDay: nextMinute,
    tick: clock.tick + 1,
  }
}

export const formatGameClockTime = (minuteOfDay: number) => {
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}
