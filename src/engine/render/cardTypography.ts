import { CanvasTextMetrics, TextStyle } from 'pixi.js'
import { CARD_SIZE, TOKENS } from '../model/gameConstants'

const CARD_TITLE_MAX_LINES = 2
const CARD_TITLE_ELLIPSIS = '...'
const CARD_TITLE_RIGHT_PADDING = 14
const CARD_TITLE_WIDTH = CARD_SIZE.width - CARD_SIZE.padding - CARD_TITLE_RIGHT_PADDING

export const CARD_TITLE_STYLE = new TextStyle({
  fill: TOKENS.text.primary,
  fontFamily: 'Onest Variable, ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '700',
  letterSpacing: 0,
  lineHeight: 16,
})

const measureTitleLine = (line: string) => CanvasTextMetrics.measureText(line, CARD_TITLE_STYLE).width

const fitsTitleLine = (line: string) => measureTitleLine(line) <= CARD_TITLE_WIDTH

const truncateTitleLine = (line: string) => {
  const chars = [...line.trim()]

  while (chars.length > 0) {
    const candidate = `${chars.join('').trimEnd()}${CARD_TITLE_ELLIPSIS}`

    if (fitsTitleLine(candidate)) {
      return candidate
    }

    chars.pop()
  }

  return CARD_TITLE_ELLIPSIS
}

export const formatCardTitle = (title: string) => {
  const words = title.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let wordIndex = 0

  while (wordIndex < words.length && lines.length < CARD_TITLE_MAX_LINES) {
    let line = words[wordIndex]

    wordIndex += 1

    while (wordIndex < words.length) {
      const nextLine = `${line} ${words[wordIndex]}`

      if (!fitsTitleLine(nextLine)) {
        break
      }

      line = nextLine
      wordIndex += 1
    }

    lines.push(fitsTitleLine(line) ? line : truncateTitleLine(line))
  }

  if (wordIndex < words.length && lines.length > 0) {
    lines[lines.length - 1] = truncateTitleLine(lines[lines.length - 1])
  }

  return lines.join('\n')
}
