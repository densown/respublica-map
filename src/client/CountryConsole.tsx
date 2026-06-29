import { useState, useCallback, useId, useMemo } from 'react'
import { formatValue } from './formatValue'
import { IndicatorInfoButton } from './IndicatorInfo'
import { getTheme, FONT } from './theme'
import type { IndicatorDef, MapRow, WorldGeoJson } from './worldTypes'

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

/* ── Enhanced Chart (red, area fill, data points, year labels) ── */

function EnhancedChart({ series, regionAvg, dark, height = 64, compact = false }: {
  series: { year: number; value: number }[]
  regionAvg?: number | null
  dark: boolean
  height?: number
  compact?: boolean
}) {
  const rawId = useId()
  const gradId = rawId.replace(/:/g, '_')
  if (series.length < 2) return null
  const t = getTheme(dark)
  const w = 240, h = height, padX = 6, padY = 4
  const labelH = compact ? 0 : 14

  const vals = series.map((s) => s.value)
  let min = Math.min(...vals), max = Math.max(...vals)
  if (regionAvg != null) { min = Math.min(min, regionAvg); max = Math.max(max, regionAvg) }
  const range = max - min || 1

  const points = series.map((s, i) => ({
    x: padX + (i / (series.length - 1)) * (w - 2 * padX),
    y: padY + (1 - (s.value - min) / range) * (h - 2 * padY),
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaD = pathD + ` L${points[points.length - 1]!.x},${h} L${points[0]!.x},${h} Z`

  const yearLabels = compact ? [] : [0, Math.floor(series.length / 2), series.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i)

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + labelH}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.red} stopOpacity={0.2} />
          <stop offset="100%" stopColor={t.red} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {regionAvg != null && (() => {
        const ry = padY + (1 - (regionAvg - min) / range) * (h - 2 * padY)
        return (
          <line x1={padX} x2={w - padX} y1={ry} y2={ry}
            stroke={dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}
            strokeWidth={1} strokeDasharray="4,3" />
        )
      })()}
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={t.red} strokeWidth={compact ? 1.2 : 1.5}
        strokeLinecap="round" strokeLinejoin="round" />
      {!compact && points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={series.length > 15 ? 1.2 : 2}
          fill={i === points.length - 1 ? t.red : t.cardBg} stroke={t.red} strokeWidth={1} />
      ))}
      {compact && (
        <circle cx={points[points.length - 1]!.x} cy={points[points.length - 1]!.y}
          r={2} fill={t.red} />
      )}
      {yearLabels.map((idx) => (
        <text key={idx} x={points[idx]!.x} y={h + labelH - 1}
          textAnchor={idx === 0 ? 'start' : idx === series.length - 1 ? 'end' : 'middle'}
          fill={t.muted} fontSize={7} fontFamily={FONT.mono}>
          {series[idx]!.year}
        </text>
      ))}
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

/* ── Year Navigator ── */

function YearNav({ years, selected, onChange, dark }: {
  years: number[]; selected: number; onChange: (y: number) => void; dark: boolean
}) {
  const t = getTheme(dark)
  const idx = years.indexOf(selected)
  const canPrev = idx > 0
  const canNext = idx < years.length - 1
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <button type="button" onClick={() => canPrev && onChange(years[idx - 1]!)}
        disabled={!canPrev}
        style={{
          width: 18, height: 18, border: 'none', borderRadius: 3, cursor: canPrev ? 'pointer' : 'default',
          background: 'transparent', color: canPrev ? t.muted : t.border,
          fontFamily: FONT.mono, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}>&#9664;</button>
      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.ink, fontWeight: 600, minWidth: 28, textAlign: 'center' }}>
        {selected}
      </span>
      <button type="button" onClick={() => canNext && onChange(years[idx + 1]!)}
        disabled={!canNext}
        style={{
          width: 18, height: 18, border: 'none', borderRadius: 3, cursor: canNext ? 'pointer' : 'default',
          background: 'transparent', color: canNext ? t.muted : t.border,
          fontFamily: FONT.mono, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}>&#9654;</button>
    </div>
  )
}

/* ── Radar Chart for Compare Mode ── */

function RadarChart({ countries, indicators, year, dark }: {
  countries: { iso3: string; name: string }[]
  indicators: IndicatorDef[]
  year: number
  dark: boolean
}) {
  const t = getTheme(dark)
  const size = 240
  const cx = size / 2, cy = size / 2 + 4
  const r = 72
  const n = indicators.length
  if (n < 3) return null

  const angles = indicators.map((_, i) => (i * 2 * Math.PI / n) - Math.PI / 2)

  const ranges = useMemo(() => indicators.map((ind) => {
    const allVals: number[] = []
    for (const yd of Object.values(ind.data)) {
      for (const v of Object.values(yd)) {
        if (v != null && !Number.isNaN(v)) allVals.push(v as number)
      }
    }
    return { min: Math.min(...allVals), max: Math.max(...allVals) }
  }), [indicators])

  const normalized = countries.map((country) =>
    indicators.map((ind, ii) => {
      const yearData = ind.data[year] ?? ind.data[ind.latestYear]
      const v = yearData?.[country.iso3]
      if (v == null) return 0.05
      const { min, max } = ranges[ii]!
      return Math.max(0.05, (v - min) / (max - min || 1))
    })
  )

  const colors = [t.red, dark ? '#3DA85A' : '#2D7D46']

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon key={level}
            points={angles.map((a) => `${cx + Math.cos(a) * r * level},${cy + Math.sin(a) * r * level}`).join(' ')}
            fill="none" stroke={t.border} strokeWidth={0.5} />
        ))}
        {angles.map((a, i) => (
          <line key={i} x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
            stroke={t.border} strokeWidth={0.5} />
        ))}
        {normalized.map((vals, ci) => (
          <polygon key={ci}
            points={vals.map((v, i) => `${cx + Math.cos(angles[i]!) * r * v},${cy + Math.sin(angles[i]!) * r * v}`).join(' ')}
            fill={colors[ci]} fillOpacity={0.12}
            stroke={colors[ci]} strokeWidth={1.5} strokeLinejoin="round" />
        ))}
        {normalized.map((vals, ci) => vals.map((v, i) => (
          <circle key={`${ci}-${i}`}
            cx={cx + Math.cos(angles[i]!) * r * v}
            cy={cy + Math.sin(angles[i]!) * r * v}
            r={2.5} fill={colors[ci]} />
        )))}
        {indicators.map((ind, i) => {
          const labelR = r + 22
          const x = cx + Math.cos(angles[i]!) * labelR
          const y = cy + Math.sin(angles[i]!) * labelR
          const cosA = Math.cos(angles[i]!)
          const anchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle'
          const label = ind.name.length > 14 ? ind.name.slice(0, 13) + '…' : ind.name
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
              fill={t.muted} fontSize={7} fontFamily={FONT.mono}>
              {label}
            </text>
          )
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
        {countries.map((c, i) => (
          <div key={c.iso3} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i] }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: t.ink }}>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Country Search (for compare mode) ── */

function CountrySearchInline({ geojson, dark, onSelect }: {
  geojson: WorldGeoJson; dark: boolean
  onSelect: (iso3: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const t = getTheme(dark)
  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return geojson.features
      .filter((f) => f.properties.name.toLowerCase().includes(q) || f.properties.iso3.toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, geojson])

  return (
    <div style={{ position: 'relative' }}>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Search country..."
        style={{
          width: '100%', padding: '6px 10px', borderRadius: 6,
          border: `1px solid ${t.border}`, background: dark ? '#222' : '#F5F0E8',
          color: t.ink, fontFamily: FONT.mono, fontSize: 10, outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5,
          background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 6,
          marginTop: 2, maxHeight: 150, overflowY: 'auto', boxShadow: t.shadow,
        }}>
          {results.map((f) => (
            <button key={f.properties.iso3} type="button"
              onClick={() => { onSelect(f.properties.iso3.toUpperCase(), f.properties.name); setQuery('') }}
              style={{
                display: 'block', width: '100%', padding: '6px 10px', border: 'none',
                background: 'transparent', color: t.ink, fontFamily: FONT.body, fontSize: 11,
                textAlign: 'left', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverBg }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontWeight: 600 }}>{f.properties.name}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted, marginLeft: 6 }}>
                {f.properties.iso3.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}
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

/* ── Indicator row (clickable to switch globe indicator) ── */

function IndicatorRow({ ind, iso3, year, regions, dark, isActive, onSelect }: {
  ind: IndicatorDef; iso3: string; year: number; regions: Record<string, string>
  dark: boolean; isActive: boolean; onSelect: () => void
}) {
  const t = getTheme(dark)
  const yearData = ind.data[year] ?? ind.data[ind.latestYear]
  const v = yearData?.[iso3]
  const formatted = v != null && !Number.isNaN(v) ? fmtForIndicator(v, ind) : '—'
  const series = getTimeSeries(ind, iso3)
  const regionAvg = computeRegionAvg(ind, iso3, year, regions)
  return (
    <div onClick={onSelect} role="button" tabIndex={0} style={{
      padding: '8px 0', borderBottom: `1px solid ${t.border}`,
      background: isActive ? (dark ? 'rgba(232,56,79,0.08)' : 'rgba(200,16,46,0.05)') : 'transparent',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
          {isActive && <div style={{ width: 3, height: 14, borderRadius: 2, background: t.red, flexShrink: 0 }} />}
          <span style={{
            fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: isActive ? t.ink : t.muted, flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{ind.name}</span>
        </div>
        <IndicatorInfoButton indicator={ind} dark={dark} />
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.ink, fontWeight: 600, flexShrink: 0 }}>
          {formatted}
        </span>
      </div>
      {series.length >= 2 && (
        <div style={{ marginTop: 2 }}>
          <EnhancedChart series={series} regionAvg={regionAvg} dark={dark} height={36} compact />
        </div>
      )}
    </div>
  )
}

/* ── Compare Values Table ── */

function CompareTable({ countries, indicators, year, dark }: {
  countries: { iso3: string; name: string }[]
  indicators: IndicatorDef[]
  year: number
  dark: boolean
}) {
  const t = getTheme(dark)
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 10px',
        fontFamily: FONT.mono, fontSize: 9, color: t.muted, textTransform: 'uppercase',
        letterSpacing: '0.08em', paddingBottom: 6, borderBottom: `1px solid ${t.border}`,
        marginBottom: 4,
      }}>
        <span>Indicator</span>
        <span style={{ textAlign: 'right' }}>{countries[0]?.iso3}</span>
        <span style={{ textAlign: 'right' }}>{countries[1]?.iso3}</span>
      </div>
      {indicators.map((ind) => {
        const yearData = ind.data[year] ?? ind.data[ind.latestYear]
        const vals = countries.map((c) => {
          const v = yearData?.[c.iso3]
          return v != null && !Number.isNaN(v) ? fmtForIndicator(v, ind) : '—'
        })
        return (
          <div key={ind.code} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 10px',
            padding: '5px 0', borderBottom: `1px solid ${t.border}`,
          }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{ind.name}</span>
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: t.ink, fontWeight: 600, textAlign: 'right' }}>
              {vals[0]}
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: dark ? '#3DA85A' : '#2D7D46', fontWeight: 600, textAlign: 'right' }}>
              {vals[1]}
            </span>
          </div>
        )
      })}
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
  geojson: WorldGeoJson
  dark: boolean
  onClose: () => void
  onSelectCode: (code: string) => void
  onSelectYear: (year: number) => void
}

export function CountryConsole({
  iso3, countryName, data, indicators, selectedCode, selectedYear, regions, geojson, dark,
  onClose, onSelectCode, onSelectYear,
}: CountryConsoleProps) {
  const [expanded, setExpanded] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareCountry, setCompareCountry] = useState<{ iso3: string; name: string } | null>(null)
  const t = getTheme(dark)
  const activeIndicator = indicators.find((i) => i.code === selectedCode) ?? indicators[0]!
  const row = data.find((r) => r.country_code.toUpperCase() === iso3)
  const region = regions[iso3]
  const availableYears = activeIndicator?.years ?? []

  const mainValue = row?.value != null && !Number.isNaN(row.value) && activeIndicator
    ? fmtForIndicator(row.value, activeIndicator) : 'No data'

  const activeSeries = activeIndicator ? getTimeSeries(activeIndicator, iso3) : []
  const activeRank = activeIndicator ? computeRank(activeIndicator, iso3, selectedYear) : null
  const activeRegionAvg = activeIndicator ? computeRegionAvg(activeIndicator, iso3, selectedYear, regions) : null

  const handleCompareSelect = useCallback((cIso3: string, name: string) => {
    setCompareCountry({ iso3: cIso3, name })
  }, [])

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

          {/* Year nav + Compare toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
            {availableYears.length > 1 && (
              <YearNav years={availableYears} selected={selectedYear} onChange={onSelectYear} dark={dark} />
            )}
            <button type="button" onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareCountry(null) }}
              style={{
                padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                background: compareMode ? t.red : 'transparent',
                color: compareMode ? '#fff' : t.muted,
                border: compareMode ? 'none' : `1px solid ${t.border}`,
                fontFamily: FONT.mono, fontSize: 9, fontWeight: 600,
                letterSpacing: '0.05em',
              }}>
              {compareMode ? 'Exit compare' : 'Compare'}
            </button>
          </div>
        </div>

        {/* Compare mode */}
        {compareMode ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 14px 24px', scrollbarWidth: 'thin' }}>
            {!compareCountry ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted, textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: 8 }}>
                  Select country to compare
                </div>
                <CountrySearchInline geojson={geojson} dark={dark} onSelect={handleCompareSelect} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 15, color: t.ink }}>
                      {countryName}
                    </span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, color: t.muted, margin: '0 6px' }}>vs</span>
                    <span style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 15, color: dark ? '#3DA85A' : '#2D7D46' }}>
                      {compareCountry.name}
                    </span>
                  </div>
                  <button type="button" onClick={() => setCompareCountry(null)} style={{
                    border: 'none', background: 'transparent', color: t.muted, cursor: 'pointer',
                    fontFamily: FONT.mono, fontSize: 9, textDecoration: 'underline',
                  }}>Change</button>
                </div>

                <RadarChart
                  countries={[{ iso3, name: countryName }, compareCountry]}
                  indicators={indicators}
                  year={selectedYear}
                  dark={dark}
                />

                <div style={{ marginTop: 14 }}>
                  <CompareTable
                    countries={[{ iso3, name: countryName }, compareCountry]}
                    indicators={indicators}
                    year={selectedYear}
                    dark={dark}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <>
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
                  <EnhancedChart series={activeSeries} regionAvg={activeRegionAvg} dark={dark} height={56} />
                  {activeRegionAvg != null && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: FONT.mono, fontSize: 7, color: t.muted, marginTop: 1 }}>
                      <span>--- Ø {region}</span>
                    </div>
                  )}
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
              {indicators.map((ind) => (
                <IndicatorRow key={ind.code} ind={ind} iso3={iso3} year={selectedYear}
                  regions={regions} dark={dark} isActive={ind.code === selectedCode}
                  onSelect={() => onSelectCode(ind.code)} />
              ))}

              <div style={{ marginTop: 16, padding: '12px 0 4px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CopyLinkButton label="r/Res_Publica_DE" url="https://www.reddit.com/r/Res_Publica_DE/" variant="primary" dark={dark} />
                <CopyLinkButton label="Full dashboard: app.respublica.media" url="https://app.respublica.media" variant="secondary" dark={dark} />
              </div>
            </div>
          </>
        )}
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
