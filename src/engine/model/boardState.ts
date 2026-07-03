import type { BoardCard, BoardColumn, BoardState, CardId } from './boardTypes'
import { makeSlotId } from './placementRules'

export const cards: Record<CardId, BoardCard> = {
  'card-1': {
    id: 'card-1',
    title: 'Оптимизировать воркер уведомлений',
    kicker: 'interaction',
    accent: 0xf28c28,
  },
  'card-2': {
    id: 'card-2',
    title: 'Экспортировать данные пользователя по запросу',
    kicker: 'visual',
    accent: 0x2bbf7f,
  },
  'card-3': {
    id: 'card-3',
    title: 'Закешировать админский дашборд',
    kicker: 'rules',
    accent: 0x3478f6,
  },
  'card-4': {
    id: 'card-4',
    title: 'Импортировать каталог партнера',
    kicker: 'feel',
    accent: 0xf0526b,
  },
}

export const columns: BoardColumn[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in-progress', title: 'In progress' },
  { id: 'done', title: 'Done' },
]

export const initialBoardState: BoardState = {
  cards,
  columns,
  placements: {
    'card-1': makeSlotId('backlog', 0),
    'card-2': makeSlotId('backlog', 1),
    'card-3': makeSlotId('backlog', 2),
    'card-4': makeSlotId('backlog', 3),
  },
  drag: null,
}
