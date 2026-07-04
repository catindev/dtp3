import zeroUrl from '../assets/0.svg'
import oneUrl from '../assets/1.svg'
import twoUrl from '../assets/2.svg'
import threeUrl from '../assets/3.svg'
import fourUrl from '../assets/4.svg'
import fiveUrl from '../assets/5.svg'
import sixUrl from '../assets/6.svg'
import sevenUrl from '../assets/7.svg'
import eightUrl from '../assets/8.svg'
import nineUrl from '../assets/9.svg'
import timeDelimiterUrl from '../assets/time-delimeter.svg'
import { formatGameClockTime } from '../engine/model/gameClock'
import { useGameStore } from '../store/gameStore'

const digitUrls: Record<string, string> = {
  '0': zeroUrl,
  '1': oneUrl,
  '2': twoUrl,
  '3': threeUrl,
  '4': fourUrl,
  '5': fiveUrl,
  '6': sixUrl,
  '7': sevenUrl,
  '8': eightUrl,
  '9': nineUrl,
}

export function GameClock() {
  const clock = useGameStore((state) => state.clock)
  const time = formatGameClockTime(clock.minuteOfDay)

  return (
    <aside className="game-clock" aria-label={`Игровое время ${time}, день ${clock.day}`}>
      <div className="game-clock__time" aria-hidden="true">
        {time.split('').map((character, index) =>
          character === ':' ? (
            <img
              className="game-clock__delimiter"
              key={`${character}-${index}`}
              src={timeDelimiterUrl}
              alt=""
              draggable={false}
            />
          ) : (
            <img
              className="game-clock__digit"
              key={`${character}-${index}`}
              src={digitUrls[character]}
              alt=""
              draggable={false}
            />
          ),
        )}
      </div>
      <div className="game-clock__day">день {clock.day}</div>
    </aside>
  )
}
