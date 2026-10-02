import { useState } from 'react'
import { OUTCOMES, TIMING } from '../../utils/gameStats'
import { useLanguage } from '../../context/LanguageContext'
import './ResultsDetails.css'

/**
 * Détail d'une partie, pour aller plus loin que la jauge :
 * répartition des notes, précision du rythme, partition note par note,
 * notes à retravailler. `stats` vient de computeGameStats().
 */
export default function ResultsDetails({ stats, songTitle }) {
  const { t, isEn } = useLanguage()

  return (
    <div className="gr-details">
      <div className="gr-columns">
        <Card title={t('results.noteDistribution')} subtitle={t('results.notesOfSong', stats.total, songTitle)}>
          <OutcomeBar stats={stats} t={t} />
          <Legend stats={stats} t={t} />
        </Card>

        <Card title={t('results.rhythmAccuracy')} subtitle={t('results.rhythmSubtitle')}>
          <TimingHistogram offsets={stats.offsets} average={stats.averageOffsetMs} t={t} />
          <p className="gr-note">{tendencySentence(stats, isEn)}</p>
        </Card>
      </div>

      <Card title={t('results.noteByNote')} subtitle={t('results.hoverNote')}>
        <NoteRibbon notes={stats.notes} t={t} />
        <Legend stats={stats} compact t={t} />
      </Card>

      {stats.troubleNotes.length > 0 && (
        <Card title={t('results.troubleNotes')} subtitle={t('results.troubleSubtitle')}>
          <TroubleNotes notes={stats.troubleNotes} t={t} />
          <p className="gr-tip">
            <span className="gr-tip__who">{t('results.reachyTip')}</span>
            {coachTip(stats, t)}
          </p>
        </Card>
      )}
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <section className="gr-card">
      <header className="gr-card__head">
        <h2 className="gr-card__title">{title}</h2>
        {subtitle && <p className="gr-card__subtitle">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

/* ---------- Infobulle partagée par les graphiques ---------- */

function useTooltip() {
  const [tip, setTip] = useState(null)
  const show = (e, content) => {
    const box = e.currentTarget.closest('[data-tooltip-host]').getBoundingClientRect()
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content })
  }
  const hide = () => setTip(null)
  return { tip, show, hide }
}

function Tooltip({ tip }) {
  if (!tip) return null
  return (
    <div className="gr-tooltip" style={{ left: tip.x, top: tip.y }} role="tooltip">
      {tip.content}
    </div>
  )
}

/* ---------- Barre de répartition ---------- */

function OutcomeBar({ stats, t }) {
  const tooltip = useTooltip()
  return (
    <div className="gr-bar-wrap" data-tooltip-host>
      <div className="gr-bar" role="img" aria-label={OUTCOMES.map((o) => `${t(`results.outcomes.${o.id}.label`)} : ${stats.counts[o.id]}`).join(', ')}>
        {OUTCOMES.filter((o) => stats.counts[o.id] > 0).map((o) => {
          const label = t(`results.outcomes.${o.id}.label`)
          return (
            <span
              key={o.id}
              className={`gr-bar__seg gr-fill--${o.id}`}
              style={{ flexGrow: stats.counts[o.id] }}
              onPointerMove={(e) =>
                tooltip.show(e, (
                  <>
                    <strong>{label}</strong> · {stats.counts[o.id]} notes ({percent(stats.counts[o.id] / stats.total)})
                  </>
                ))
              }
              onPointerLeave={tooltip.hide}
            />
          )
        })}
      </div>
      <Tooltip tip={tooltip.tip} />
    </div>
  )
}

function Legend({ stats, compact = false, t }) {
  return (
    <ul className={`gr-legend${compact ? ' gr-legend--compact' : ''}`}>
      {OUTCOMES.map((o) => (
        <li key={o.id} className="gr-legend__item">
          <span className={`gr-swatch gr-swatch--${o.id}`} aria-hidden="true" />
          <span className="gr-legend__label">{t(`results.outcomes.${o.id}.label`)}</span>
          {!compact && (
            <>
              <span className="gr-legend__hint">{t(`results.outcomes.${o.id}.hint`)}</span>
              <span className="gr-legend__count">{stats.counts[o.id]}</span>
              <span className="gr-legend__pct">{percent(stats.counts[o.id] / stats.total)}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

/* ---------- Histogramme des écarts de timing ---------- */

const RANGE_MS = 300
const BIN_MS = 30
const W = 560
const H = 220
const M = { top: 14, right: 12, bottom: 46, left: 34 }

function TimingHistogram({ offsets, average, t }) {
  const tooltip = useTooltip()
  const binCount = (RANGE_MS * 2) / BIN_MS
  const bins = Array.from({ length: binCount }, (_, i) => ({ from: -RANGE_MS + i * BIN_MS, count: 0 }))
  for (const ms of offsets) {
    const i = Math.min(binCount - 1, Math.max(0, Math.floor((ms + RANGE_MS) / BIN_MS)))
    bins[i].count++
  }
  const maxCount = Math.max(2, ...bins.map((b) => b.count))
  const yMax = Math.ceil(maxCount / 2) * 2
  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const x = (ms) => M.left + ((ms + RANGE_MS) / (RANGE_MS * 2)) * plotW
  const y = (count) => M.top + plotH - (count / yMax) * plotH
  const binW = plotW / binCount

  const zoneOf = (bin) => {
    const center = Math.abs(bin.from + BIN_MS / 2)
    return center <= TIMING.perfectMs ? 'perfect' : center <= TIMING.goodMs ? 'good' : 'offbeat'
  }

  return (
    <div className="gr-chart" data-tooltip-host>
      <svg viewBox={`0 0 ${W} ${H}`} className="gr-chart__svg" role="img" aria-label="Timing histogram">
        <rect className="gr-zone" x={x(-TIMING.goodMs)} y={M.top} width={x(TIMING.goodMs) - x(-TIMING.goodMs)} height={plotH} />
        <text className="gr-zone__label" x={x(0)} y={M.top + 12} textAnchor="middle">{t('results.inTempoZone')}</text>

        {[0, yMax / 2, yMax].map((tier) => (
          <g key={tier}>
            <line className="gr-grid" x1={M.left} x2={W - M.right} y1={y(tier)} y2={y(tier)} />
            <text className="gr-axis" x={M.left - 8} y={y(tier) + 4} textAnchor="end">{tier}</text>
          </g>
        ))}

        {bins.map((bin, i) =>
          bin.count > 0 ? (
            <path
              key={bin.from}
              className={`gr-fill--${zoneOf(bin)}`}
              d={roundedTopBar(M.left + i * binW + 1, y(bin.count), binW - 2, y(0) - y(bin.count), 4)}
            />
          ) : null,
        )}
        {bins.map((bin, i) => (
          <rect
            key={`hit-${bin.from}`}
            className="gr-hit"
            x={M.left + i * binW}
            y={M.top}
            width={binW}
            height={plotH}
            onPointerMove={(e) =>
              tooltip.show(e, (
                <>
                  <strong>{bin.count} {bin.count > 1 ? 'notes' : 'note'}</strong> · {signed(bin.from)} ~ {signed(bin.from + BIN_MS)} ms
                </>
              ))
            }
            onPointerLeave={tooltip.hide}
          />
        ))}

        <line className="gr-zero" x1={x(0)} x2={x(0)} y1={M.top + 18} y2={y(0)} />
        <g transform={`translate(${x(clamp(average))}, ${y(0)})`}>
          <path className="gr-avg" d="M0 -2 L-6 -11 L6 -11 Z" />
        </g>

        <line className="gr-baseline" x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} />
        {[-300, -150, 0, 150, 300].map((tier) => (
          <text key={tier} className="gr-axis" x={x(tier)} y={y(0) + 16} textAnchor="middle">
            {tier === 0 ? '0' : `${signed(tier)}`}
          </text>
        ))}
        <text className="gr-axis gr-axis--strong" x={M.left} y={H - 6}>{t('results.earlyZone')}</text>
        <text className="gr-axis gr-axis--strong" x={W - M.right} y={H - 6} textAnchor="end">{t('results.lateZone')}</text>
        <text className="gr-axis" x={x(0)} y={H - 6} textAnchor="middle">ms</text>
      </svg>
      <Tooltip tip={tooltip.tip} />
    </div>
  )
}

function roundedTopBar(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

/* ---------- Partition note par note ---------- */

function NoteRibbon({ notes, t }) {
  const tooltip = useTooltip()
  return (
    <div className="gr-ribbon-wrap" data-tooltip-host>
      <ol className="gr-ribbon">
        {notes.map((note) => (
          <li
            key={note.index}
            className={`gr-chip gr-fill--${note.outcome}`}
            tabIndex={0}
            aria-label={noteDetail(note, t)}
            onPointerMove={(e) => tooltip.show(e, noteDetail(note, t))}
            onPointerLeave={tooltip.hide}
            onFocus={(e) => {
              const box = e.currentTarget.getBoundingClientRect()
              tooltip.show({ currentTarget: e.currentTarget, clientX: box.left + box.width / 2, clientY: box.top }, noteDetail(note, t))
            }}
            onBlur={tooltip.hide}
          >
            {note.expected}
            {note.outcome === 'wrong' && <small className="gr-chip__played">{note.played}</small>}
          </li>
        ))}
      </ol>
      <Tooltip tip={tooltip.tip} />
    </div>
  )
}

function noteDetail(note, t) {
  const label = t(`results.outcomes.${note.outcome}.label`)
  const base = `Note ${note.index + 1} · ${note.expected} · ${label}`
  if (note.outcome === 'missed') return base
  if (note.outcome === 'wrong') return `${base} (jouée : ${note.played})`
  const offset = Math.round(note.offsetMs ?? 0)
  const when = offset === 0 ? 'pile à l’heure' : `${signed(offset)} ms, ${offset < 0 ? 'en avance' : 'en retard'}`
  return `${base} (${when})`
}

/* ---------- Notes à retravailler ---------- */

function TroubleNotes({ notes, t }) {
  return (
    <ul className="gr-trouble">
      {notes.map((n) => (
        <li key={n.note} className="gr-trouble__item">
          <span className="gr-trouble__note">{n.note}</span>
          <span className="gr-trouble__ratio">
            {t('results.errorCount', n.errors, n.attempts)}
          </span>
          <span className="gr-trouble__kinds">
            {n.wrong > 0 && <span className="gr-pill"><span className="gr-swatch gr-swatch--wrong" aria-hidden="true" />{t('results.wrongPill', n.wrong)}</span>}
            {n.missed > 0 && <span className="gr-pill"><span className="gr-swatch gr-swatch--missed" aria-hidden="true" />{t('results.missedPill', n.missed)}</span>}
            {n.offbeat > 0 && <span className="gr-pill"><span className="gr-swatch gr-swatch--offbeat" aria-hidden="true" />{t('results.offbeatPill', n.offbeat)}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Textes ---------- */

const percent = (ratio) => `${Math.round(ratio * 100)} %`
const signed = (ms) => (ms > 0 ? `+${ms}` : `${ms}`.replace('-', '−'))
const clamp = (ms) => Math.max(-RANGE_MS, Math.min(RANGE_MS, ms))

function tendencySentence(stats, isEn) {
  const avg = Math.round(Math.abs(stats.averageOffsetMs))
  if (isEn) {
    const inTempo = `${percent(stats.tempoAccuracy)} of your hits were in tempo.`
    if (stats.tendency === 'late') return `On average, you hit ${avg} ms late. ${inTempo}`
    if (stats.tendency === 'early') return `On average, you hit ${avg} ms early. ${inTempo}`
    return `Your rhythm is steady, with no marked rush or drag. ${inTempo}`
  }
  const inTempo = `${percent(stats.tempoAccuracy)} de tes bonnes notes sont dans le tempo.`
  if (stats.tendency === 'late') return `En moyenne, tu joues ${avg} ms en retard. ${inTempo}`
  if (stats.tendency === 'early') return `En moyenne, tu joues ${avg} ms en avance. ${inTempo}`
  return `Ton rythme est régulier, sans avance ni retard marqué. ${inTempo}`
}

function coachTip(stats, t) {
  if (stats.tendency === 'late') return t('results.coachTips.late')
  if (stats.tendency === 'early') return t('results.coachTips.early')
  if (stats.wrongNotes + stats.missedNotes > stats.counts.offbeat) return t('results.coachTips.wrongHeavy')
  return t('results.coachTips.steady')
}
