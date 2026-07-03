import { useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import { getCardDetailModel, type CardDetailMetric } from '../../engine/model/cardDetails'
import './CardInspector.css'

const colorToCss = (color: number) => `#${color.toString(16).padStart(6, '0')}`

function Metric({ metric }: { metric: CardDetailMetric }) {
  return (
    <div className="card-inspector__metric">
      <span>{metric.label}</span>
      <strong data-tone={metric.tone}>{metric.value}</strong>
    </div>
  )
}

export function CardInspector() {
  const hoveredCardId = useGameStore((state) => state.hoveredCardId)
  const cards = useGameStore((state) => state.cards)
  const columns = useGameStore((state) => state.columns)
  const placements = useGameStore((state) => state.placements)
  const details = useMemo(
    () => getCardDetailModel({ cards, columns, placements, drag: null }, hoveredCardId),
    [cards, columns, hoveredCardId, placements],
  )

  if (!details) {
    return null
  }

  const accent = colorToCss(details.accent)

  return (
    <aside className="card-inspector" aria-label="Card details">
      <header className="card-inspector__header">
        <div className="card-inspector__meta">
          <span className="card-inspector__case" aria-hidden="true" />
          <span>{details.code}</span>
          <span>·</span>
          <span>{details.categoryLabel}</span>
        </div>
        <div className="card-inspector__signal" aria-hidden="true">
          <span style={{ background: accent }} />
          <span style={{ background: accent }} />
          <span style={{ background: accent }} />
        </div>
      </header>

      <h2>{details.title}</h2>

      <section className="card-inspector__metrics">
        {details.metrics.map((metric) => (
          <Metric key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="card-inspector__risk">
        <div>
          <h3>{details.risk.title}</h3>
          <span>{details.risk.caption}</span>
        </div>
        <div className="card-inspector__chips">
          {details.risk.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      </section>

      <section className="card-inspector__tasks">
        <h3>ПОДЗАДАЧИ</h3>
        {details.tasks.map((task) => (
          <div className="card-inspector__task" data-completed={task.completed} key={task.id}>
            <span className="card-inspector__checkbox">{task.completed ? '✓' : '□'}</span>
            <strong>{task.title}</strong>
            <small>{task.typeLabel}</small>
          </div>
        ))}
      </section>
    </aside>
  )
}
