import { useState } from 'react'
import { formatValue } from './formatValue'
import { IndicatorInfoButton } from './IndicatorInfo'
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
  const rank = vals.indexOf(v) + 1
  return { rank, total: vals.length }
}

function computeRegionAvg(
  ind: IndicatorDef,
  iso3: string,
  year: number,
  regions: Record<string, string>,
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

function MiniSparkline({
  series,
  regionAvg,
  dark,
}: {
  series: { year: number; value: number }[]
  regionAvg?: number | null
  dark: boolean
}) {
  if (series.length < 2) return null

  const w = 120
  const h = 32
  const pad = 3
  const vals = series.map((s) => s.value)
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (regionAvg != null) {
    min = Math.min(min, regionAvg)
    max = Math.max(max, regionAvg)
  }
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
        <line
          x1={pad}
          x2={w - pad}
          y1={h - pad - ((regionAvg - min) / range) * (h - 2 * pad)}
          y2={h - pad - ((regionAvg - min) / range) * (h - 2 * pad)}
          stroke={regionColor}
          strokeWidth={1}
          strokeDasharray="3,2"
        />
      )}
      <polyline
        points={points.map((p) => `${p[0]},${p[1]}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={points[points.length - 1]![0]} cy={points[points.length - 1]![1]} r={2.5} fill={color} />
    </svg>
  )
}

function PercentileBar({ rank, total, dark }: { rank: number; total: number; dark: boolean }) {
  const pct = ((total - rank) / (total - 1)) * 100
  const bg = dark ? '#2D2D2D' : '#E8E4DC'
  const fill = pct > 66 ? (dark ? '#3DA85A' : '#2D7D46') : pct > 33 ? '#f59e0b' : (dark ? '#E8384F' : '#C8102E')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: bg, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: fill, transition: 'width 0.3s' }} />
      </div>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9,
        color: dark ? '#8B8B8B' : '#525960',
        flexShrink: 0,
      }}>
        #{rank}/{total}
      </span>
    </div>
  )
}

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

function IndicatorRow({
  ind,
  iso3,
  year,
  regions,
  dark,
}: {
  ind: IndicatorDef
  iso3: string
  year: number
  regions: Record<string, string>
  dark: boolean
}) {
  const border = dark ? '#2D2D2D' : '#E8E4DC'
  const muted = dark ? '#8B8B8B' : '#525960'
  const ink = dark ? '#E8E4DC' : '#0F0F0F'

  const yearData = ind.data[year] ?? ind.data[ind.latestYear]
  const v = yearData?.[iso3]
  const formatted = v != null && !Number.isNaN(v) ? fmtForIndicator(v, ind) : '—'
  const series = getTimeSeries(ind, iso3)
  const regionAvg = computeRegionAvg(ind, iso3, year, regions)

  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: muted,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {ind.name}
        </span>
        <IndicatorInfoButton indicator={ind} dark={dark} />
        <span
          style={{
            fontFamily: "'Source Serif 4', serif, system-ui",
            fontSize: 13,
            color: ink,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {formatted}
        </span>
      </div>
      {series.length >= 2 && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MiniSparkline series={series} regionAvg={regionAvg} dark={dark} />
          {regionAvg != null && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: muted }}>
              --- Ø region
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function CountryConsole({
  iso3,
  countryName,
  data,
  indicators,
  selectedCode,
  selectedYear,
  regions,
  dark,
  onClose,
}: CountryConsoleProps) {
  const [expanded, setExpanded] = useState(false)
  const activeIndicator = indicators.find((i) => i.code === selectedCode) ?? indicators[0]
  const row = data.find((r) => r.country_code.toUpperCase() === iso3)

  const cardBg = dark ? '#1A1A1A' : '#FFFFFF'
  const border = dark ? '#2D2D2D' : '#E8E4DC'
  const ink = dark ? '#E8E4DC' : '#0F0F0F'
  const muted = dark ? '#8B8B8B' : '#525960'
  const red = dark ? '#E8384F' : '#C8102E'
  const shadow = dark
    ? '0 8px 32px rgba(0,0,0,0.5)'
    : '0 8px 32px rgba(0,0,0,0.12)'

  const mainValue =
    row?.value != null && !Number.isNaN(row.value) && activeIndicator
      ? fmtForIndicator(row.value, activeIndicator)
      : 'No data'

  const activeSeries = activeIndicator ? getTimeSeries(activeIndicator, iso3) : []
  const activeRank = activeIndicator ? computeRank(activeIndicator, iso3, selectedYear) : null
  const activeRegionAvg = activeIndicator ? computeRegionAvg(activeIndicator, iso3, selectedYear, regions) : null
  const region = regions[iso3]

  const otherIndicators = indicators.filter((i) => i.code !== selectedCode)

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="atlas-console-backdrop"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 29,
          background: 'rgba(0,0,0,0.3)',
        }}
      />
      <div
        className={`atlas-console${expanded ? ' atlas-console-expanded' : ''}`}
        style={{
          position: 'absolute',
          zIndex: 30,
          background: cardBg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: shadow,
        }}
      >
        <div
          style={{
            padding: '14px 14px 10px',
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}
        >
          <div className="atlas-console-handle" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            cursor: 'pointer',
          }} onClick={() => setExpanded(!expanded)}>
            <div style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif, system-ui",
                  fontWeight: 900,
                  fontSize: 20,
                  color: ink,
                  lineHeight: 1.1,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {countryName}
                <span style={{ color: red }}>.</span>
              </h2>
              <p
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: muted,
                  margin: 0,
                  marginTop: 3,
                }}
              >
                {iso3}{region ? ` · ${region}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                className="atlas-console-expand-btn"
                onClick={() => setExpanded(!expanded)}
                style={{
                  width: 28,
                  height: 28,
                  border: `1px solid ${border}`,
                  borderRadius: 4,
                  background: 'transparent',
                  color: muted,
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? '↓' : '↑'}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  border: `1px solid ${border}`,
                  borderRadius: 4,
                  background: 'transparent',
                  color: muted,
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px',
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: muted,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeIndicator?.name ?? 'Indicator'}
            </span>
            {activeIndicator && <IndicatorInfoButton indicator={activeIndicator} dark={dark} />}
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif, system-ui",
              fontWeight: 900,
              fontSize: 32,
              color: ink,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {mainValue}
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              color: muted,
              marginTop: 4,
              letterSpacing: '0.05em',
            }}
          >
            {activeIndicator?.code} · {selectedYear}
          </div>
          {activeRank && <PercentileBar rank={activeRank.rank} total={activeRank.total} dark={dark} />}
          {activeSeries.length >= 2 && (
            <div style={{ marginTop: 10 }}>
              <MiniSparkline series={activeSeries} regionAvg={activeRegionAvg} dark={dark} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 8,
                  color: muted,
                  marginTop: 2,
                }}
              >
                <span>{activeSeries[0]!.year}</span>
                {activeRegionAvg != null && <span>--- Ø {region}</span>}
                <span>{activeSeries[activeSeries.length - 1]!.year}</span>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 14px 24px',
            scrollbarWidth: 'thin',
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: muted,
              marginBottom: 6,
              paddingBottom: 4,
              borderBottom: `1px solid ${border}`,
            }}
          >
            All indicators
          </div>
          {otherIndicators.map((ind) => (
            <IndicatorRow key={ind.code} ind={ind} iso3={iso3} year={selectedYear} regions={regions} dark={dark} />
          ))}
        </div>
      </div>
    </>
  )
}
