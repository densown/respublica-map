import { useState, useCallback } from 'react'
import { formatValue } from './formatValue'
import { IndicatorInfoButton } from './IndicatorInfo'
import { getTheme, FONT } from './theme'
import type { IndicatorDef, MapRow } from './worldTypes'

function fmtForIndicator(v: number, ind: IndicatorDef): string {
  return formatValue(v, ind.unit, ind.code)
}

function getTimeSeries(ind: IndicatorDef, iso3: string): { year: number; value: number }[] {
  const series: { year: number; value: number }[] = []
  for (const y of ind.years) {
    const v = ind.data[y]?.[iso3]
    if (v != null && !Number.isNaN(v)) series.push({ year: y, value: v })
  }
  return series
}

function computeRank(ind: IndicatorDef, iso3: string, year: number): { rank: number; total: number } | null {
  const yearData = ind.data[year] ?? ind.data[ind.latestYear]
  if (!yearData) return null
  const v = yearData[iso3]
  if (v == null) return null
  const vals = Object.values(yearData).filter((x): x is number => x != null && !Number.isNaN(x))
  vals.sort((a, b) => b - a)
  return { rank: vals.indexOf(v) + 1, total: vals.length }
}

function computeRegionAvg(
  ind: IndicatorDef, iso3: string, year: number, regions: Record<string, string>,
): number | null {
  const region = regions[iso3]
  if (!region) return null
  const yearData = ind.data[year] ?? ind.data[ind.latestYear]
  if (!yearData) return null
  const regionIsos = Object.entries(regions).filter(([, r]) => r === region).map(([i]) => i)
  const vals = regionIsos.map((i) => yearData[i]).filter((x): x is number => x != null && !Number.isNaN(x))
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/* ── Sparkline ── */

function MiniSparkline({ series, regionAvg, dark }: {
  series: { year: number; value: number }[]
  regionAvg?: number | null
  dark: boolean
}) {
  if (series.length < 2) return null
  const w = 120, h = 32, pad = 3
  const vals = series.map((s) => s.value)
  let min = Math.min(...vals), max = Math.max(...vals)
  if (regionAvg != null) { min = Math.min(min, regionAvg); max = Math.max(max, regionAvg) }
  const range = max - min || 1
  const points = series.map((s, i) => {
    const x = pad + (i / (series.length - 1)) * (w - 2 * pad)
    const y = h - pad - ((s.value - min) / range) * (h - 2 * pad)
    return [x, y] as const
  })
  const color = dark ? '#3b82f6' : '#2563eb'
  const regionColor = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      {regionAvg != null && (
        <line x1={pad} x2={w - pad}
          y1={h - pad - ((regionAvg - min) / range) * (h - 2 * pad)}
          y2={h - pad - ((regionAvg - min) / range) * (h - 2 * pad)}
          stroke={regionColor} strokeWidth={1} strokeDasharray="3,2" />
      )}
      <polyline points={points.map((p) => `${p[0]},${p[1]}`).join(' ')}
        fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1]![0]} cy={points[points.length - 1]![1]} r={2.5} fill={color} />
    </svg>
  )
}

/* ── Percentile bar ── */

function PercentileBar({ rank, total, dark }: { rank: number; total: number; dark: boolean }) {
  const pct = ((total - rank) / (total - 1)) * 100
  const t = getTheme(dark)
  const fill = pct > 66 ? (dark ? '#3DA85A' : '#2D7D46') : pct > 33 ? '#f59e0b' : t.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.border, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: fill, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted, flexShrink: 0 }}>
        #{rank}/{total}
      </span>
    </div>
  )
}

/* ── Copy-link button ── */

function CopyLinkButton({ label, url, variant, dark }: {
  label: string; url: string; variant: 'primary' | 'secondary'; dark: boolean
}) {
  const [copied, setCopied] = useState(false)
  const t = getTheme(dark)
  const handleClick = useCallback(() => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [url])
  const isPrimary = variant === 'primary'
  return (
    <button type="button" onClick={handleClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '8px 12px', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.02em',
      background: isPrimary ? t.red : 'transparent',
      color: isPrimary ? '#fff' : t.muted,
      border: isPrimary ? 'none' : `1px solid ${t.border}`,
      fontFamily: isPrimary ? FONT.body : FONT.mono,
      fontSize: isPrimary ? 12 : 10,
      fontWeight: isPrimary ? 600 : 400,
    }}>
      {copied ? 'Link copied!' : label}
    </button>
  )
}

/* ── Indicator row ── */

function IndicatorRow({ ind, iso3, year, regions, dark }: {
  ind: IndicatorDef; iso3: string; year: number; regions: Record<string, string>; dark: boolean
}) {
  const t = getTheme(dark)
  const yearData = ind.data[year] ?? ind.data[ind.latestYear]
  const v = yearData?.[iso3]
  const formatted = v != null && !Number.isNaN(v) ? fmtForIndicator(v, ind) : '—'
  const series = getTimeSeries(ind, iso3)
  const regionAvg = computeRegionAvg(ind, iso3, year, regions)
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: t.muted, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{ind.name}</span>
        <IndicatorInfoButton indicator={ind} dark={dark} />
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.ink, fontWeight: 600, flexShrink: 0 }}>
          {formatted}
        </span>
      </div>
      {series.length >= 2 && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MiniSparkline series={series} regionAvg={regionAvg} dark={dark} />
          {regionAvg != null && (
            <span style={{ fontFamily: FONT.mono, fontSize: 7, color: t.muted }}>--- Ø region</span>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main console ── */

export type CountryConsoleProps = {
  iso3: string
  countryName: string
  data: MapRow[]
  indicators: IndicatorDef[]
  selectedCode: string
  selectedYear: number
  regions: Record<string, string>
  dark: boolean
  onClose: () => void
}

export function CountryConsole({
  iso3, countryName, data, indicators, selectedCode, selectedYear, regions, dark, onClose,
}: CountryConsoleProps) {
  const [expanded, setExpanded] = useState(false)
  const t = getTheme(dark)
  const activeIndicator = indicators.find((i) => i.code === selectedCode) ?? indicators[0]
  const row = data.find((r) => r.country_code.toUpperCase() === iso3)
  const region = regions[iso3]

  const mainValue = row?.value != null && !Number.isNaN(row.value) && activeIndicator
    ? fmtForIndicator(row.value, activeIndicator) : 'No data'

  const activeSeries = activeIndicator ? getTimeSeries(activeIndicator, iso3) : []
  const activeRank = activeIndicator ? computeRank(activeIndicator, iso3, selectedYear) : null
  const activeRegionAvg = activeIndicator ? computeRegionAvg(activeIndicator, iso3, selectedYear, regions) : null
  const otherIndicators = indicators.filter((i) => i.code !== selectedCode)

  return (
    <>
      <div className="atlas-console-backdrop" onClick={onClose}
        style={{ position: 'absolute', inset: 0, zIndex: 29, background: 'rgba(0,0,0,0.3)' }} />

      <div className={`atlas-console${expanded ? ' atlas-console-expanded' : ''}`}
        style={{ position: 'absolute', zIndex: 30, background: t.cardBg,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: t.shadow }}>

        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div className="atlas-console-handle"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', cursor: 'pointer' }}
            onClick={() => setExpanded(!expanded)}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <h2 style={{
                fontFamily: FONT.display, fontWeight: 900, fontSize: 20, color: t.ink,
                lineHeight: 1.1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {countryName}<span style={{ color: t.red }}>.</span>
              </h2>
              <p style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, margin: '3px 0 0' }}>
                {iso3}{region ? ` · ${region}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <ConsoleButton label={expanded ? '↓' : '↑'} className="atlas-console-expand-btn"
                title={expanded ? 'Collapse' : 'Expand'} dark={dark} onClick={() => setExpanded(!expanded)} />
              <ConsoleButton label="✕" dark={dark} onClick={onClose} />
            </div>
          </div>
        </div>

        {/* Active indicator detail */}
        <div style={{ padding: 14, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: t.muted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeIndicator?.name ?? 'Indicator'}
            </span>
            {activeIndicator && <IndicatorInfoButton indicator={activeIndicator} dark={dark} />}
          </div>
          <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 32, color: t.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {mainValue}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted, marginTop: 4, letterSpacing: '0.05em' }}>
            {activeIndicator?.code} · {selectedYear}
          </div>
          {activeRank && <PercentileBar rank={activeRank.rank} total={activeRank.total} dark={dark} />}
          {activeSeries.length >= 2 && (
            <div style={{ marginTop: 10 }}>
              <MiniSparkline series={activeSeries} regionAvg={activeRegionAvg} dark={dark} />
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: FONT.mono, fontSize: 8, color: t.muted, marginTop: 2,
              }}>
                <span>{activeSeries[0]!.year}</span>
                {activeRegionAvg != null && <span>--- Ø {region}</span>}
                <span>{activeSeries[activeSeries.length - 1]!.year}</span>
              </div>
            </div>
          )}
        </div>

        {/* All indicators + promo footer */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 14px 24px', scrollbarWidth: 'thin' }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: t.muted, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${t.border}`,
          }}>
            All indicators
          </div>
          {otherIndicators.map((ind) => (
            <IndicatorRow key={ind.code} ind={ind} iso3={iso3} year={selectedYear} regions={regions} dark={dark} />
          ))}

          <div style={{ marginTop: 16, padding: '12px 0 4px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CopyLinkButton label="r/Res_Publica_DE" url="https://www.reddit.com/r/Res_Publica_DE/" variant="primary" dark={dark} />
            <CopyLinkButton label="Full dashboard: app.respublica.media" url="https://app.respublica.media" variant="secondary" dark={dark} />
          </div>
        </div>
      </div>
    </>
  )
}

function ConsoleButton({ label, className, title, dark, onClick }: {
  label: string; className?: string; title?: string; dark: boolean; onClick: () => void
}) {
  const t = getTheme(dark)
  return (
    <button type="button" className={className} onClick={onClick} title={title} style={{
      width: 28, height: 28, border: `1px solid ${t.border}`, borderRadius: 4,
      background: 'transparent', color: t.muted, cursor: 'pointer',
      fontFamily: FONT.mono, fontSize: 11, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {label}
    </button>
  )
}
