import { COLUMN_IDS, type CardId, type ColumnId } from '../model/boardTypes'
import type { SceneLayout } from '../layout/boardLayout'
import type { Polygon, Vec2 } from '../layout/projection'

export type HitCardLike = {
  id: CardId
  hitPolygon: Polygon
  root: {
    zIndex: number
  }
  phase: string
}

export type HitCardInfoLike = HitCardLike & {
  infoHitPolygon: Polygon
}

export const pointInPolygon = (point: Vec2, polygon: Polygon) => {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const current = polygon[i]
    const previous = polygon[j]
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

export const columnAtPoint = (layout: SceneLayout, point: Vec2) => {
  for (const id of COLUMN_IDS) {
    if (pointInPolygon(point, layout.dropColumnPolygons[id])) {
      return id
    }
  }

  return null
}

export const validAdjacentDropColumn = (layout: SceneLayout, point: Vec2, sourceColumnId: ColumnId) => {
  const targetColumnId = columnAtPoint(layout, point)

  if (!targetColumnId || targetColumnId === sourceColumnId) {
    return null
  }

  const sourceIndex = COLUMN_IDS.indexOf(sourceColumnId)
  const targetIndex = COLUMN_IDS.indexOf(targetColumnId)

  return Math.abs(targetIndex - sourceIndex) === 1 ? targetColumnId : null
}

const hitTopIdleCard = <TCard extends HitCardLike>(
  cards: Iterable<TCard>,
  point: Vec2,
  getPolygon: (card: TCard) => Polygon,
) => {
  let hit: TCard | null = null

  for (const card of cards) {
    if (card.phase !== 'idle' || !pointInPolygon(point, getPolygon(card))) {
      continue
    }

    if (!hit || card.root.zIndex > hit.root.zIndex) {
      hit = card
    }
  }

  return hit
}

export const hitCard = <TCard extends HitCardLike>(cards: Iterable<TCard>, point: Vec2) =>
  hitTopIdleCard(cards, point, (card) => card.hitPolygon)

export const hitCardInfoIcon = <TCard extends HitCardInfoLike>(cards: Iterable<TCard>, point: Vec2) =>
  hitTopIdleCard(cards, point, (card) => card.infoHitPolygon)
