import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../../store/gameStore'
import { getCardDetailModel, type CardDetailMetric, type CardDetailModel } from '../../engine/model/cardDetails'
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

type CardInspectorProps = {
  onRightInsetChange?: (rightInset: number) => void
}

export function CardInspector({ onRightInsetChange }: CardInspectorProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const { cards, columns, placements, inspectedCardId } = useGameStore(
    useShallow((state) => ({
      cards: state.cards,
      columns: state.columns,
      placements: state.placements,
      inspectedCardId: state.inspectedCardId,
    })),
  )
  const details = useMemo(
    () => getCardDetailModel({ cards, columns, placements, drag: null }, inspectedCardId),
    [cards, columns, inspectedCardId, placements],
  )
  const [visibleDetails, setVisibleDetails] = useState<CardDetailModel | null>(details)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (details) {
      setVisibleDetails(details)
      setIsExiting(false)
      return
    }

    if (!visibleDetails) {
      return
    }

    setIsExiting(true)
    const exitTimer = window.setTimeout(() => {
      setVisibleDetails(null)
      setIsExiting(false)
    }, 280)

    return () => {
      window.clearTimeout(exitTimer)
    }
  }, [details, visibleDetails])

  useLayoutEffect(() => {
    if (!visibleDetails || isExiting) {
      onRightInsetChange?.(0)
      return
    }

    const panel = panelRef.current

    if (!panel) {
      return
    }

    let frame = 0

    const measure = () => {
      const isBottomSheet = window.matchMedia('(max-width: 760px)').matches

      if (isBottomSheet) {
        onRightInsetChange?.(0)
        return
      }

      const styles = window.getComputedStyle(panel)
      const rightOffset = Number.parseFloat(styles.right)
      const rightInset = panel.offsetWidth + (Number.isFinite(rightOffset) ? rightOffset : 0) + 28

      onRightInsetChange?.(rightInset)
    }
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(measure)
    }
    const resizeObserver = new ResizeObserver(scheduleMeasure)

    resizeObserver.observe(panel)
    window.addEventListener('resize', scheduleMeasure)
    scheduleMeasure()

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [isExiting, onRightInsetChange, visibleDetails])

  if (!visibleDetails) {
    return null
  }

  const accent = colorToCss(visibleDetails.accent)
  const motionClass = isExiting ? 'motion-spring-slide-right' : 'motion-spring-slide-left'

  return (
    <aside ref={panelRef} className={`card-inspector ${motionClass}`} aria-label="Card details">
      <div className="card-inspector__tab">{visibleDetails.code}</div>
      <div className="card-inspector__signal" aria-hidden="true">
        <span style={{ background: accent }} />
        <span style={{ background: accent }} />
        <span style={{ background: accent }} />
      </div>

      <h2>{visibleDetails.title}</h2>

      <section className="card-inspector__metrics card-inspector__block">
        {visibleDetails.metrics.map((metric) => (
          <Metric key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="card-inspector__risk card-inspector__block">
        <div>
          <h3>{visibleDetails.risk.title}</h3>
          <span>{visibleDetails.risk.caption}</span>
        </div>
        <div className="card-inspector__chips">
          {visibleDetails.risk.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      </section>

      <section className="card-inspector__tasks">
        <h3>ПОДЗАДАЧИ</h3>
        {visibleDetails.tasks.map((task) => (
          <div className="card-inspector__task motion-spring-pop" data-completed={task.completed} key={task.id}>
            <span className="card-inspector__checkbox">{task.completed ? '✓' : '□'}</span>
            <strong>{task.title}</strong>
            <small>{task.typeLabel}</small>
          </div>
        ))}
      </section>
    </aside>
  )
}
