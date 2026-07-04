import { Container, Graphics, Text } from 'pixi.js'
import type { TextStyleFontWeight } from 'pixi.js'
import type { SceneLayout } from '../layout/boardLayout'
import type { CardDetailMetric, CardDetailModel, CardDetailTask } from '../model/cardDetails'
import type { CardView } from './cardView'

const FONT_FAMILY = 'Onest Variable, ui-sans-serif, system-ui, sans-serif'
const PANEL_INK = 0xc9702a
const PANEL_CARD = 0xfffdf6
const TEXT_PRIMARY = 0x33291b
const TEXT_SECONDARY = 0x857963
const DANGER = 0xa33a28
const GOOD = 0x4f7641
const RISK = 0x8b6410

const setText = (text: Text, value: string) => {
  if (text.text !== value) {
    text.text = value
  }
}

const setTone = (text: Text, tone: CardDetailMetric['tone']) => {
  text.style.fill = tone === 'danger' ? DANGER : tone === 'good' ? GOOD : TEXT_PRIMARY
}

const setFontSize = (text: Text, size: number) => {
  if (text.style.fontSize !== size) {
    text.style.fontSize = size
  }
}

const drawRoundRect = (
  graphics: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: number,
  fillAlpha: number,
  stroke = 0,
  strokeAlpha = 0,
  strokeWidth = 1,
) => {
  graphics.roundRect(x, y, width, height, radius).fill({ color: fill, alpha: fillAlpha })

  if (strokeAlpha > 0) {
    graphics.stroke({ color: stroke, alpha: strokeAlpha, width: strokeWidth })
  }
}

const createText = (fontSize: number, fill = TEXT_PRIMARY, weight: TextStyleFontWeight = '900') =>
  new Text({
    text: '',
    style: {
      fill,
      fontFamily: FONT_FAMILY,
      fontSize,
      fontWeight: weight,
      letterSpacing: 0,
    },
  })

export type InspectorView = {
  backdrop: Graphics
  content: Container
  graphics: Graphics
  tabText: Text
  titleText: Text
  signal: Graphics
  metrics: Array<{
    label: Text
    value: Text
  }>
  riskTitle: Text
  riskCaption: Text
  chips: Text[]
  tasksTitle: Text
  tasks: Array<{
    checkbox: Text
    title: Text
    type: Text
  }>
}

export const createInspectorView = (): InspectorView => {
  const backdrop = new Graphics()
  const content = new Container()
  const graphics = new Graphics()
  const tabText = createText(13, 0xfffdf6, '900')
  const titleText = createText(30, TEXT_PRIMARY, '900')
  const signal = new Graphics()
  const metrics = Array.from({ length: 8 }, () => ({
    label: createText(13, TEXT_SECONDARY, '900'),
    value: createText(13, TEXT_PRIMARY, '900'),
  }))
  const riskTitle = createText(15, RISK, '900')
  const riskCaption = createText(10, RISK, '900')
  const chips = Array.from({ length: 3 }, () => createText(12, RISK, '900'))
  const tasksTitle = createText(15, TEXT_SECONDARY, '900')
  const tasks = Array.from({ length: 4 }, () => ({
    checkbox: createText(18, GOOD, '900'),
    title: createText(12, TEXT_PRIMARY, '900'),
    type: createText(10, TEXT_SECONDARY, '900'),
  }))

  titleText.style.wordWrap = true
  titleText.style.breakWords = true
  riskCaption.style.align = 'right'

  content.visible = false
  content.addChild(graphics, tabText, titleText, signal, riskTitle, riskCaption, tasksTitle)

  metrics.forEach((metric) => {
    content.addChild(metric.label, metric.value)
  })
  chips.forEach((chip) => {
    content.addChild(chip)
  })
  tasks.forEach((task) => {
    content.addChild(task.checkbox, task.title, task.type)
  })

  return {
    backdrop,
    content,
    graphics,
    tabText,
    titleText,
    signal,
    metrics,
    riskTitle,
    riskCaption,
    chips,
    tasksTitle,
    tasks,
  }
}

const drawSignal = (graphics: Graphics, details: CardDetailModel, x: number, y: number) => {
  graphics.clear()

  for (let index = 0; index < 3; index += 1) {
    const alpha = index === 0 ? 0.96 : index === 1 ? 0.72 : 0.24

    drawRoundRect(graphics, x + index * 16, y, 11, 11, 3, details.accent, alpha, TEXT_PRIMARY, 0.16, 1.5)
  }
}

const drawMetrics = (
  view: InspectorView,
  graphics: Graphics,
  details: CardDetailModel,
  left: number,
  top: number,
  width: number,
  compact: boolean,
  tight: boolean,
) => {
  const blockHeight = tight ? 140 : compact ? 164 : 184
  const columnGap = compact ? 14 : 20
  const columnWidth = (width - columnGap) / 2
  const rowHeight = tight ? 24 : compact ? 27 : 31
  const startY = top + (tight ? 12 : 16)
  const fontSize = tight ? 10 : compact ? 11 : 13
  const labelInset = compact ? 14 : 18
  const valueInset = compact ? 20 : 28

  drawRoundRect(graphics, left, top, width, blockHeight, 13, PANEL_CARD, 0.82, 0x433827, 0.24, 2)

  details.metrics.forEach((metric, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const columnLeft = left + column * (columnWidth + columnGap)
    const x = columnLeft + labelInset
    const y = startY + row * rowHeight
    const label = view.metrics[index].label
    const value = view.metrics[index].value
    const valueX = columnLeft + columnWidth - valueInset

    graphics
      .moveTo(x, y + rowHeight - 10)
      .lineTo(valueX, y + rowHeight - 10)
      .stroke({ color: 0xd8cdb2, alpha: 0.25, width: 1 })
    setText(label, metric.label)
    setFontSize(label, fontSize)
    label.x = x
    label.y = y
    label.alpha = 1
    setText(value, metric.value)
    setFontSize(value, fontSize)
    setTone(value, metric.tone)
    value.anchor.set(1, 0)
    value.x = valueX
    value.y = y
    value.alpha = 1
  })

  return blockHeight
}

const drawRisk = (
  view: InspectorView,
  graphics: Graphics,
  details: CardDetailModel,
  left: number,
  top: number,
  width: number,
  compact: boolean,
  tight: boolean,
) => {
  const height = tight ? 82 : compact ? 100 : 88
  const titleSize = tight ? 12 : compact ? 13 : 15
  const captionSize = tight ? 8 : compact ? 9 : 10
  const chipSize = tight ? 10 : compact ? 11 : 12
  const chipHeight = tight ? 22 : 27
  const chipGap = tight ? 6 : 8
  const chipTop = top + (tight ? 57 : compact ? 67 : 52)
  const sideInset = compact ? 14 : 17

  drawRoundRect(graphics, left, top, width, height, 13, 0xfff6d9, 0.72, 0xd6b56d, 0.96, 2)
  setText(view.riskTitle, details.risk.title)
  setFontSize(view.riskTitle, titleSize)
  view.riskTitle.x = left + 17
  view.riskTitle.y = top + 16
  setText(view.riskCaption, details.risk.caption)
  setFontSize(view.riskCaption, captionSize)

  if (compact) {
    view.riskCaption.anchor.set(0, 0)
    view.riskCaption.x = left + sideInset
    view.riskCaption.y = top + 37
  } else {
    view.riskCaption.anchor.set(1, 0)
    view.riskCaption.x = left + width - 24
    view.riskCaption.y = top + 17
  }

  let chipX = left + sideInset
  let chipY = chipTop

  view.chips.forEach((chip, index) => {
    const reason = details.risk.reasons[index]

    chip.visible = Boolean(reason)

    if (!reason) {
      return
    }

    setText(chip, reason)
    setFontSize(chip, chipSize)

    const maxChipWidth = width - sideInset * 2
    const chipWidth = Math.min(maxChipWidth, chip.width + 18)

    if (chipX + chipWidth > left + width - sideInset && chipX > left + sideInset) {
      chipX = left + sideInset
      chipY += chipHeight + chipGap
    }

    chip.x = chipX
    chip.y = chipY
    drawRoundRect(graphics, chip.x - 8, chip.y - 6, chipWidth, chipHeight, 8, PANEL_CARD, 0.72, 0xd6b56d, 0.92, 2)
    chipX += chipWidth + chipGap
  })

  return height
}

const drawTask = (
  graphics: Graphics,
  taskView: InspectorView['tasks'][number],
  task: CardDetailTask,
  x: number,
  y: number,
  width: number,
  compact: boolean,
  tight: boolean,
) => {
  const completed = task.completed
  const border = completed ? 0xd8cdb2 : 0xd9a591
  const fill = completed ? PANEL_CARD : 0xfff6ec
  const height = tight ? 31 : compact ? 36 : 40
  const titleSize = tight ? 9 : compact ? 10 : 12
  const checkboxSize = tight ? 14 : compact ? 16 : 18
  const typeSize = tight ? 8 : compact ? 9 : 10

  drawRoundRect(graphics, x, y, width, height, 10, fill, completed ? 0.78 : 0.82, border, completed ? 0.86 : 0.92, 2)
  setText(taskView.checkbox, completed ? '✓' : '□')
  setFontSize(taskView.checkbox, checkboxSize)
  taskView.checkbox.style.fill = completed ? GOOD : 0xb94735
  taskView.checkbox.x = x + 13
  taskView.checkbox.y = y + (tight ? 7 : 8)
  setText(taskView.title, task.title)
  setFontSize(taskView.title, titleSize)
  taskView.title.alpha = completed ? 0.58 : 1
  taskView.title.x = x + (tight ? 39 : 47)
  taskView.title.y = y + (tight ? 10 : compact ? 12 : 13)
  setText(taskView.type, task.typeLabel)
  setFontSize(taskView.type, typeSize)
  taskView.type.anchor.set(1, 0)
  taskView.type.x = x + width - 12
  taskView.type.y = y + (tight ? 11 : 14)

  return height
}

const drawTasks = (
  view: InspectorView,
  graphics: Graphics,
  details: CardDetailModel,
  left: number,
  top: number,
  width: number,
  compact: boolean,
  tight: boolean,
) => {
  const titleSize = tight ? 12 : compact ? 13 : 15
  const rowGap = tight ? 7 : 9
  const firstRowTop = top + (tight ? 27 : 34)

  setText(view.tasksTitle, 'ПОДЗАДАЧИ')
  setFontSize(view.tasksTitle, titleSize)
  view.tasksTitle.x = left
  view.tasksTitle.y = top

  view.tasks.forEach((taskView, index) => {
    const task = details.tasks[index]

    taskView.checkbox.visible = Boolean(task)
    taskView.title.visible = Boolean(task)
    taskView.type.visible = Boolean(task)

    if (!task) {
      return
    }

    const taskHeight = tight ? 31 : compact ? 36 : 40

    drawTask(graphics, taskView, task, left, firstRowTop + index * (taskHeight + rowGap), width, compact, tight)
  })
}

export const drawInspectorView = (
  view: InspectorView,
  layout: SceneLayout,
  card: CardView | null,
  details: CardDetailModel | null,
) => {
  view.backdrop.clear()
  view.content.visible = false

  if (!card || !details) {
    return
  }

  const backdropAlpha = Math.max(card.motion.backdropAlpha, card.motion.detailAlpha * 0.8)

  if (backdropAlpha > 0.01) {
    view.backdrop.rect(0, 0, layout.width, layout.height).fill({ color: 0xe9e1ce, alpha: 0.46 * backdropAlpha })
    view.backdrop.rect(0, 0, layout.width, layout.height).fill({ color: 0x33291b, alpha: 0.08 * backdropAlpha })
  }

  const alpha = card.motion.detailAlpha

  if (alpha <= 0.01) {
    return
  }

  const width = card.motion.inspectorWidth
  const height = card.motion.inspectorHeight
  const left = card.x - width / 2
  const top = card.y - height / 2
  const compact = width < 430
  const tight = height < 660
  const padding = tight ? 22 : compact ? 24 : 28
  const contentLeft = compact ? 22 : 24
  const contentWidth = width - contentLeft * 2
  const titleSize = tight ? 22 : compact ? 25 : 30

  view.content.visible = true
  view.content.alpha = alpha
  view.content.x = left
  view.content.y = top
  view.graphics.clear()

  drawRoundRect(view.graphics, padding, 14, compact ? 86 : 96, 36, 11, PANEL_INK, 1, PANEL_INK, 1, 3)
  setText(view.tabText, details.code)
  setFontSize(view.tabText, compact ? 12 : 13)
  view.tabText.x = padding + (compact ? 18 : 19)
  view.tabText.y = 25
  drawSignal(view.signal, details, width - (compact ? 74 : 75), 28)

  setText(view.titleText, details.title)
  setFontSize(view.titleText, titleSize)
  view.titleText.style.wordWrapWidth = Math.max(compact ? 220 : 260, width - padding * 2)
  view.titleText.x = padding
  view.titleText.y = tight ? 66 : compact ? 70 : 73

  const metricsTop = Math.max(tight ? 158 : compact ? 176 : 176, view.titleText.y + view.titleText.height + 20)
  const metricsHeight = drawMetrics(view, view.graphics, details, contentLeft, metricsTop, contentWidth, compact, tight)
  const riskTop = metricsTop + metricsHeight + (tight ? 12 : 14)
  const riskHeight = drawRisk(view, view.graphics, details, contentLeft, riskTop, contentWidth, compact, tight)
  const tasksTop = riskTop + riskHeight + (tight ? 16 : compact ? 20 : 24)

  drawTasks(view, view.graphics, details, contentLeft, tasksTop, contentWidth, compact, tight)
}

export const destroyInspectorView = (view: InspectorView) => {
  view.backdrop.destroy()
  view.content.destroy({ children: true })
}
