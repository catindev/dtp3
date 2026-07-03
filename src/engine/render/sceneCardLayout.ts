import { hopCardToRest } from '../animation/cardMotion'
import { getSlotPose, type SceneLayout } from '../layout/boardLayout'
import { getCardIds, type BoardState, type CardId } from '../model/boardTypes'
import { getCompactPlacements } from '../model/placementRules'
import type { CardView } from './cardView'

type RelayoutCardViewsOptions = {
  state: BoardState
  cardViews: Map<CardId, CardView>
  layout: SceneLayout
  onCardMotion: () => void
}

export const relayoutCardViews = ({
  state,
  cardViews,
  layout,
  onCardMotion,
}: RelayoutCardViewsOptions) => {
  const visualPlacements = getCompactPlacements(state)

  getCardIds(state.cards).forEach((cardId) => {
    const card = cardViews.get(cardId)

    if (!card) {
      return
    }

    const slotId = visualPlacements[cardId] ?? state.placements[cardId]
    const previousSlotId = card.slotId
    const shouldHop = previousSlotId !== null && previousSlotId !== slotId && card.phase === 'idle'
    const pose = getSlotPose(layout, slotId)

    card.restX = pose.x
    card.restY = pose.y
    card.restU = pose.u
    card.restV = pose.v
    card.slotId = slotId

    if (card.phase === 'landing' && card.flight) {
      card.flight.toX = pose.x
      card.flight.toY = pose.y
    }

    if (card.phase === 'idle' && !shouldHop) {
      card.x = pose.x
      card.y = pose.y
      card.rotation = 0
      card.tiltVelocity = 0
    } else if (card.x === 0 && card.y === 0) {
      card.x = pose.x
      card.y = pose.y
    }

    if (shouldHop) {
      hopCardToRest(card, layout)
      onCardMotion()
    }
  })
}
