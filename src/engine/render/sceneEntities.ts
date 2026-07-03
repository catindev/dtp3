import { Container } from 'pixi.js'
import type { Text } from 'pixi.js'
import type { BoardCard, BoardColumn, CardId, ColumnId } from '../model/boardTypes'
import { getCardIds } from '../model/boardTypes'
import { getCardKicker } from '../model/cardPresentation'
import { formatCardTitle } from './cardTypography'
import { createColumnLabel } from './boardRenderer'
import { createCardView, type CardView } from './cardView'

type SyncCardViewsOptions = {
  onRemove?: (card: CardView) => void
}

export const syncColumnLabels = (
  labels: Map<ColumnId, Text>,
  boardLayer: Container,
  columns: BoardColumn[],
) => {
  const currentColumnIds = new Set(columns.map((column) => column.id))

  labels.forEach((label, columnId) => {
    if (currentColumnIds.has(columnId)) {
      return
    }

    label.removeFromParent()
    label.destroy()
    labels.delete(columnId)
  })

  columns.forEach((column) => {
    const existing = labels.get(column.id)

    if (existing) {
      existing.text = column.title
      existing.zIndex = 20
      return
    }

    const label = createColumnLabel(column.title)

    label.zIndex = 20
    labels.set(column.id, label)
    boardLayer.addChild(label)
  })
}

export const syncCardViews = (
  cardViews: Map<CardId, CardView>,
  cardLayer: Container,
  cards: Record<CardId, BoardCard>,
  { onRemove }: SyncCardViewsOptions = {},
) => {
  const nextIds = new Set(getCardIds(cards))

  cardViews.forEach((card, cardId) => {
    if (nextIds.has(cardId)) {
      return
    }

    onRemove?.(card)
    card.root.removeFromParent()
    card.root.destroy({ children: true })
    cardViews.delete(cardId)
  })

  getCardIds(cards).forEach((cardId) => {
    const data = cards[cardId]
    const existing = cardViews.get(cardId)

    if (existing) {
      existing.data = data
      existing.title.text = formatCardTitle(data.title)
      existing.kicker.text = getCardKicker(data)
      return
    }

    const view = createCardView(data)

    cardViews.set(cardId, view)
    cardLayer.addChild(view.root)
  })
}

export const destroyCardViews = (cardViews: Map<CardId, CardView>) => {
  cardViews.forEach((card) => {
    card.root.removeFromParent()
    card.root.destroy({ children: true })
  })
  cardViews.clear()
}

export const destroyColumnLabels = (labels: Map<ColumnId, Text>) => {
  labels.forEach((label) => {
    label.removeFromParent()
    label.destroy()
  })
  labels.clear()
}
