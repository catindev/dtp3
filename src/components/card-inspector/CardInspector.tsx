import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useShallow } from 'zustand/react/shallow'
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

const getMotionStyle = (sourceRect: { x: number; y: number; width: number; height: number }, target: DOMRect) =>
  ({
    '--from-dx': `${sourceRect.x + sourceRect.width / 2 - window.innerWidth / 2}px`,
    '--from-dy': `${sourceRect.y + sourceRect.height / 2 - window.innerHeight / 2}px`,
    '--from-scale-x': `${sourceRect.width / target.width}`,
    '--from-scale-y': `${sourceRect.height / target.height}`,
  }) as CSSProperties

export function CardInspector() {
  const panelRef = useRef<HTMLElement | null>(null)
  const { cards, columns, placements, inspector, requestCloseCardInspector, finishCloseCardInspector } = useGameStore(
    useShallow((state) => ({
      cards: state.cards,
      columns: state.columns,
      placements: state.placements,
      inspector: state.inspector,
      requestCloseCardInspector: state.requestCloseCardInspector,
      finishCloseCardInspector: state.finishCloseCardInspector,
    })),
  )
  const details = useMemo(
    () => getCardDetailModel({ cards, columns, placements, drag: null }, inspector?.cardId ?? null),
    [cards, columns, inspector?.cardId, placements],
  )
  const [motionStyle, setMotionStyle] = useState<CSSProperties | null>(null)

  useEffect(() => {
    setMotionStyle(null)
  }, [inspector?.cardId, inspector?.sourceRect])

  useLayoutEffect(() => {
    if (!inspector || !details) {
      return
    }

    const panel = panelRef.current

    if (!panel) {
      return
    }

    let frame = 0

    const measure = () => {
      const target = panel.getBoundingClientRect()

      if (target.width <= 0 || target.height <= 0) {
        return
      }

      setMotionStyle(getMotionStyle(inspector.sourceRect, target))
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
  }, [details, inspector])

  useEffect(() => {
    if (!inspector) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestCloseCardInspector()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [inspector, requestCloseCardInspector])

  useEffect(() => {
    if (!inspector?.isClosing || motionStyle) {
      return
    }

    const timeout = window.setTimeout(finishCloseCardInspector, 0)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [finishCloseCardInspector, inspector?.isClosing, motionStyle])

  if (!inspector || !details) {
    return null
  }

  const accent = colorToCss(details.accent)
  const modalClass = inspector.isClosing ? 'card-inspector-modal is-closing' : 'card-inspector-modal'
  const panelClass = [
    'card-inspector',
    motionStyle ? 'is-motion-ready' : 'is-preparing',
    inspector.isClosing ? 'is-closing' : 'is-opening',
  ].join(' ')

  return createPortal(
    <div
      className={modalClass}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestCloseCardInspector()
        }
      }}
    >
      <aside
        ref={panelRef}
        aria-label="Card details"
        aria-modal="true"
        className={panelClass}
        onAnimationEnd={(event) => {
          if (event.animationName === 'cardInspectorClose' && inspector.isClosing) {
            finishCloseCardInspector()
          }
        }}
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
        role="dialog"
        style={motionStyle ?? undefined}
      >
        <div className="card-inspector__content">
          <div className="card-inspector__tab">{details.code}</div>
          <div className="card-inspector__signal" aria-hidden="true">
            <span style={{ background: accent }} />
            <span style={{ background: accent }} />
            <span style={{ background: accent }} />
          </div>

          <h2>{details.title}</h2>

          <section className="card-inspector__metrics card-inspector__block">
            {details.metrics.map((metric) => (
              <Metric key={metric.label} metric={metric} />
            ))}
          </section>

          <section className="card-inspector__risk card-inspector__block">
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
              <div className="card-inspector__task motion-spring-pop" data-completed={task.completed} key={task.id}>
                <span className="card-inspector__checkbox">{task.completed ? '✓' : '□'}</span>
                <strong>{task.title}</strong>
                <small>{task.typeLabel}</small>
              </div>
            ))}
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
