import type { BoardCard, CardCategory, CardDomain, CardStats, SubtaskType } from './boardTypes'

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  feature: 'ФИЧА',
  bug: 'БАГ',
  incident: 'ИНЦИДЕНТ',
  performance: 'ПРОИЗВ',
  compliance: 'РЕГУЛ',
}

export const CATEGORY_ACCENTS: Record<CardCategory, number> = {
  feature: 0x2bbf7f,
  bug: 0xc9702a,
  incident: 0xf0526b,
  performance: 0x3478f6,
  compliance: 0x9c6ade,
}

export const DOMAIN_LABELS: Record<CardDomain, string> = {
  PAY: 'Платежи',
  AUTH: 'Авторизация',
  ADM: 'Админка',
  SRCH: 'Поиск',
  REP: 'Отчеты',
  NTF: 'Уведомления',
}

export const SUBTASK_TYPE_LABELS: Record<SubtaskType, string> = {
  backend: 'BE',
  frontend: 'FE',
  SRE: 'SRE',
  QA: 'QA',
}

export const getCardAccent = (card: BoardCard) => CATEGORY_ACCENTS[card.category]

export const getCardKicker = (card: BoardCard) => `${card.domain} · ${card.category.toUpperCase()}`

export const getCardCode = (card: BoardCard) => `${card.domain}-${String(card.id).padStart(3, '0')}`

export const getQualityLabel = (stats: CardStats) => (stats.qa >= 70 ? 'ПРОЙДЕН' : 'НЕ ПРОЙДЕН')

export const getImpactLabel = (impact: number) => {
  if (impact >= 75) {
    return 'ВЫСОКИЙ'
  }

  if (impact >= 45) {
    return 'СРЕДНИЙ'
  }

  return 'НИЗКИЙ'
}

export const getRiskSummary = (card: BoardCard) => {
  const reasons: string[] = []

  if (card.stats.qa < 70) {
    reasons.push('QA не пройден')
  }

  if (card.stats.bugs >= 35) {
    reasons.push(`${Math.ceil(card.stats.bugs / 20)} дефекта`)
  }

  if (card.stats.clarity < 55) {
    reasons.push('Нужен анализ')
  }

  if (card.deadline >= 75) {
    reasons.push('Срок горит')
  }

  if (card.stats.pressure >= 75) {
    reasons.push('Высокое давление')
  }

  return {
    title: reasons.length > 0 ? 'РИСКОВАННЫЙ РЕЛИЗ' : 'ГОТОВО К РАБОТЕ',
    reasons: reasons.slice(0, 3),
  }
}
