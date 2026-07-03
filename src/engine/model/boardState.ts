import type { BoardCard, BoardColumn, BoardState, CardId } from './boardTypes'
import { makeSlotId } from './placementRules'

export const cards: Record<CardId, BoardCard> = {
  100: {
    id: 100,
    title: 'Оптимизировать воркер уведомлений',
    category: 'performance',
    deadline: 68,
    domain: 'NTF',
    stats: {
      pressure: 72,
      complexity: 64,
      value: 58,
      clarity: 71,
      quality: 62,
      qa: 55,
      bugs: 38,
      impact: 73,
    },
    subtasks: [
      { id: 1001, title: 'Проверить очередь отправки', completed: true, type: 'backend' },
      { id: 1002, title: 'Снять метрики задержек', completed: false, type: 'SRE' },
      { id: 1003, title: 'Обновить e2e уведомлений', completed: false, type: 'QA' },
    ],
  },
  101: {
    id: 101,
    title: 'Экспортировать данные пользователя по запросу',
    category: 'compliance',
    deadline: 84,
    domain: 'REP',
    stats: {
      pressure: 81,
      complexity: 57,
      value: 76,
      clarity: 68,
      quality: 70,
      qa: 74,
      bugs: 18,
      impact: 66,
    },
    subtasks: [
      { id: 1011, title: 'Собрать поля выгрузки', completed: true, type: 'backend' },
      { id: 1012, title: 'Добавить аудит запроса', completed: true, type: 'backend' },
      { id: 1013, title: 'Проверить сценарий удаления', completed: false, type: 'QA' },
    ],
  },
  102: {
    id: 102,
    title: 'Закешировать админский дашборд',
    category: 'performance',
    deadline: 42,
    domain: 'ADM',
    stats: {
      pressure: 48,
      complexity: 52,
      value: 69,
      clarity: 74,
      quality: 64,
      qa: 61,
      bugs: 22,
      impact: 59,
    },
    subtasks: [
      { id: 1021, title: 'Выделить cache key', completed: true, type: 'backend' },
      { id: 1022, title: 'Сделать инвалидацию', completed: false, type: 'backend' },
      { id: 1023, title: 'Померить TTI после кеша', completed: false, type: 'frontend' },
    ],
  },
  103: {
    id: 103,
    title: 'Импортировать каталог партнера',
    category: 'feature',
    deadline: 31,
    domain: 'SRCH',
    stats: {
      pressure: 43,
      complexity: 71,
      value: 82,
      clarity: 46,
      quality: 58,
      qa: 34,
      bugs: 44,
      impact: 78,
    },
    subtasks: [
      { id: 1031, title: 'Сверить формат CSV', completed: true, type: 'backend' },
      { id: 1032, title: 'Починить маппинг брендов', completed: false, type: 'backend' },
      { id: 1033, title: 'Добавить экран ошибок', completed: false, type: 'frontend' },
      { id: 1034, title: 'Прогнать импорт на стенде', completed: false, type: 'QA' },
    ],
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
    100: makeSlotId('backlog', 0),
    101: makeSlotId('backlog', 1),
    102: makeSlotId('backlog', 2),
    103: makeSlotId('backlog', 3),
  },
  drag: null,
}
