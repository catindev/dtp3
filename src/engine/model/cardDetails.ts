import type { BoardState, CardId } from './boardTypes'
import {
  CATEGORY_LABELS,
  SUBTASK_TYPE_LABELS,
  getCardAccent,
  getCardCode,
  getImpactLabel,
  getQualityLabel,
  getRiskSummary,
} from './cardPresentation'
import { getColumnIdForCard } from './placementRules'

export type CardDetailTone = 'plain' | 'danger' | 'good'

export type CardDetailMetric = {
  label: string
  value: string
  tone: CardDetailTone
}

export type CardDetailTask = {
  id: number
  title: string
  completed: boolean
  typeLabel: string
}

export type CardDetailModel = {
  id: CardId
  title: string
  accent: number
  code: string
  categoryLabel: string
  columnTitle: string
  metrics: CardDetailMetric[]
  risk: {
    title: string
    caption: string
    reasons: string[]
  }
  tasks: CardDetailTask[]
}

const getStatTone = (value: number, dangerHigh = true): CardDetailTone => {
  if (dangerHigh && value >= 70) {
    return 'danger'
  }

  if (!dangerHigh && value < 55) {
    return 'danger'
  }

  if (!dangerHigh && value >= 75) {
    return 'good'
  }

  return 'plain'
}

const metric = (label: string, value: string, tone: CardDetailTone = 'plain'): CardDetailMetric => ({
  label,
  value,
  tone,
})

export const getCardDetailModel = (state: BoardState, cardId: CardId | null): CardDetailModel | null => {
  if (cardId === null) {
    return null
  }

  const card = state.cards[cardId]

  if (!card) {
    return null
  }

  const columnId = getColumnIdForCard(state, card.id)
  const columnTitle = state.columns.find((column) => column.id === columnId)?.title ?? columnId
  const risk = getRiskSummary(card)

  return {
    id: card.id,
    title: card.title,
    accent: getCardAccent(card),
    code: getCardCode(card),
    categoryLabel: CATEGORY_LABELS[card.category],
    columnTitle,
    metrics: [
      metric('КОЛОНКА', columnTitle.toUpperCase()),
      metric('ДАВЛЕНИЕ', `${card.stats.pressure}%`, getStatTone(card.stats.pressure)),
      metric('СЛОЖНОСТЬ', `${card.stats.complexity}%`, getStatTone(card.stats.complexity)),
      metric('VALUE', `${card.stats.value}%`),
      metric('ЯСНОСТЬ', `${card.stats.clarity}%`, getStatTone(card.stats.clarity, false)),
      metric('КАЧЕСТВО', `${card.stats.quality}%`, getStatTone(card.stats.quality, false)),
      metric('QA', getQualityLabel(card.stats), card.stats.qa >= 70 ? 'good' : 'danger'),
      metric('БАГИ', `${card.stats.bugs}%`, getStatTone(card.stats.bugs)),
    ],
    risk: {
      title: risk.title,
      caption: `IMPACT ${getImpactLabel(card.stats.impact)} · СРОК ${card.deadline}/100`,
      reasons: risk.reasons.length > 0 ? risk.reasons : ['Риск низкий'],
    },
    tasks: card.subtasks.slice(0, 4).map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      typeLabel: SUBTASK_TYPE_LABELS[task.type],
    })),
  }
}
