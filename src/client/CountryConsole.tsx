import { useState, useCallback, useId, useMemo } from 'react'
import type { ReactNode } from 'react'
import { formatValue } from './formatValue'
import { IndicatorInfoButton } from './IndicatorInfo'
import { CompareView } from './CompareView'
import { Flag } from './Flag'
import { groupByCategory } from './categories'
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

/* ── Story facts ── */
// Automatisch generierte Einordnung: wo sticht das Land heraus,
// wo faellt es zurueck. Reine Rang-Aussagen, keine Wertung.

function ordinal(n: number): string {
  const rem10 = n % 10
  const rem100 = n % 100
  if (rem10 === 1 && rem100 !== 11) return `${n}st`
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`
  return `${n}th`
}

function StoryFacts({ iso3, indicators, year, dark, onSelectCode }: {
  iso3: string; indicators: IndicatorDef[]; year: number
  dark: boolean; onSelectCode: (code: string) => void
}) {
  const t = getTheme(dark)

  const facts = useMemo(() => {
    const ranked: { ind: IndicatorDef; rank: number; total: number }[] = []
    for (const ind of indicators) {
      const r = computeRank(ind, iso3, year)
      if (r && r.total >= 30) ranked.push({ ind, rank: r.rank, total: r.total })
    }
    if (ranked.length < 2) return []
    const best = ranked.reduce((a, b) => (a.rank <= b.rank ? a : b))
    const worst = ranked.reduce((a, b) => (a.rank / a.total >= b.rank / b.total ? a : b))
    if (best.ind.code === worst.ind.code) return [best]
    return [best, worst]
  }, [iso3, indicators, year])

  if (facts.length === 0) return null

  return (
    <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
      <div style={{
        fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: t.muted, marginBottom: 6,
      }}>
        Stands out
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {facts.map(({ ind, rank, total }, i) => (
          <button key={ind.code} type="button" onClick={() => onSelectCode(ind.code)} style={{
            display: 'flex', alignItems: 'baseline', gap: 8, width: '100%',
            padding: '5px 8px', borderRadius: 6, border: `1px solid ${t.border}`,
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{
              fontFamily: FONT.display, fontSize: 15, fontWeight: 900,
              color: i === 0 ? (dark ? '#3DA85A' : '#2D7D46') : t.red, flexShrink: 0,
            }}>
              {ordinal(rank)}
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: t.ink, flex: 1, minWidth: 0 }}>
              of {total} in {ind.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Quick facts (Overview) ── */
// Die Basiszahlen, die jeder als erstes sucht.

const QUICK_FACT_CODES = ['SP.POP.TOTL', 'NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN']

function QuickFacts({ iso3, indicators, year, dark }: {
  iso3: string; indicators: IndicatorDef[]; year: number; dark: boolean
}) {
  const t = getTheme(dark)
  const facts = QUICK_FACT_CODES
    .map((code) => indicators.find((i) => i.code === code))
    .filter((i): i is IndicatorDef => i != null)
    .map((ind) => {
      const yearData = ind.data[year] ?? ind.data[ind.latestYear]
      const v = yearData?.[iso3]
      return {
        code: ind.code,
        label: ind.code === 'SP.POP.TOTL' ? 'Population' : ind.code === 'NY.GDP.PCAP.CD' ? 'GDP p.c.' : 'Life exp.',
        value: v != null && !Number.isNaN(v) ? formatValue(v, ind.unit, ind.code) : '—',
      }
    })

  if (facts.length === 0) return null

  return (
    <div style={{
      display: 'flex', borderBottom: `1px solid ${t.border}`,
    }}>
      {facts.map((f, i) => (
        <div key={f.code} style={{
          flex: 1, padding: '10px 8px', textAlign: 'center',
          borderLeft: i > 0 ? `1px solid ${t.border}` : 'none',
        }}>
          <div style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 900, color: t.ink }}>
            {f.value}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted, letterSpacing: '0.06em', marginTop: 2, textTransform: 'uppercase' }}>
            {f.label}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Collapsible category section (Data tab) ── */

function CategorySection({ label, color, count, defaultOpen, dark, children }: {
  label: string; color: string; count: number; defaultOpen: boolean
  dark: boolean; children: ReactNode
}) {
  const t = getTheme(dark)
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
        <span style={{
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: t.ink, fontWeight: 700, flex: 1, textAlign: 'left',
        }}>
          {label}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted }}>
          {count} · {open ? '−' : '+'}
        </span>
      </button>
      {open && children}
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
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'compare'>('overview')
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
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Flag iso3={iso3} height={15} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {countryName}<span style={{ color: t.red }}>.</span>
                </span>
              </h2>
              <p style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, margin: '3px 0 0' }}>
                {iso3}{region ? ` · ${region}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <ConsoleButton label={expanded ? '↓' : '↑'} className="atlas-console-expand-btn"
                title={expanded ? 'Collapse' : 'Expand'} dark={dark} onClick={() => setExpanded(!expanded)} />
              <ConsoleButton label="✕" dark={dark} onClick={onClose} />
            </div>
          </div>

          {/* Year nav */}
          {availableYears.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <YearNav years={availableYears} selected={selectedYear} onChange={onSelectYear} dark={dark} />
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 2, marginTop: 10, padding: 2, borderRadius: 8,
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }}>
            {([['overview', 'Overview'], ['data', 'Data'], ['compare', 'Compare']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setActiveTab(id)} style={{
                flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: activeTab === id ? t.cardBg : 'transparent',
                color: activeTab === id ? t.ink : t.muted,
                fontFamily: FONT.body, fontSize: 12, fontWeight: activeTab === id ? 700 : 500,
                boxShadow: activeTab === id ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
                transition: 'all 0.15s',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Compare */}
        {activeTab === 'compare' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px 24px', scrollbarWidth: 'thin' }}>
            {!compareCountry ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted, textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: 8 }}>
                  Select country to compare
                </div>
                <CountrySearchInline geojson={geojson} dark={dark} onSelect={handleCompareSelect} />
              </div>
            ) : (
              <CompareView
                a={{ iso3, name: countryName }}
                b={compareCountry}
                indicators={indicators}
                year={selectedYear}
                dark={dark}
                onChangeCountry={() => setCompareCountry(null)}
              />
            )}
          </div>
        )}

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            <div style={{ padding: 14, borderBottom: `1px solid ${t.border}` }}>
              <div style={{
                fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: t.muted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeIndicator?.name ?? 'Indicator'}
                </span>
                {activeIndicator && <IndicatorInfoButton indicator={activeIndicator} dark={dark} />}
              </div>
              <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 34, color: t.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {mainValue}
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted, marginTop: 4, letterSpacing: '0.05em' }}>
                {activeIndicator?.code} · {selectedYear}
              </div>
              {activeRank && <PercentileBar rank={activeRank.rank} total={activeRank.total} dark={dark} />}
              {activeSeries.length >= 2 && (
                <div style={{ marginTop: 10 }}>
                  <EnhancedChart series={activeSeries} regionAvg={activeRegionAvg} dark={dark} height={56} />
                  {activeRegionAvg != null && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: FONT.mono, fontSize: 8, color: t.muted, marginTop: 1 }}>
                      <span>--- Ø {region}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <QuickFacts iso3={iso3} indicators={indicators} year={selectedYear} dark={dark} />

            <StoryFacts iso3={iso3} indicators={indicators} year={selectedYear}
              dark={dark} onSelectCode={(code) => { onSelectCode(code) }} />

            <div style={{ padding: '12px 14px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CopyLinkButton label="r/Res_Publica_DE" url="https://www.reddit.com/r/Res_Publica_DE/" variant="primary" dark={dark} />
              <CopyLinkButton label="Full dashboard: app.respublica.media" url="https://app.respublica.media" variant="secondary" dark={dark} />
            </div>
          </div>
        )}

        {/* Tab: Data */}
        {activeTab === 'data' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 14px 24px', scrollbarWidth: 'thin' }}>
            {groupByCategory(indicators).map((group) => (
              <CategorySection
                key={group.meta.id}
                label={group.meta.label}
                color={group.meta.color}
                count={group.items.length}
                defaultOpen={group.items.some((i) => i.code === selectedCode)}
                dark={dark}
              >
                {group.items.map((ind) => (
                  <IndicatorRow key={ind.code} ind={ind} iso3={iso3} year={selectedYear}
                    regions={regions} dark={dark} isActive={ind.code === selectedCode}
                    onSelect={() => onSelectCode(ind.code)} />
                ))}
              </CategorySection>
            ))}
          </div>
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
