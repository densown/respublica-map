import { formatValue } from './formatValue'
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

function MiniSparkline({ series, dark }: { series: { year: number; value: number }[]; dark: boolean }) {
  if (series.length < 2) return null

  const w = 80
  const h = 24
  const pad = 2
  const vals = series.map((s) => s.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1

  const points = series.map((s, i) => {
    const x = pad + (i / (series.length - 1)) * (w - 2 * pad)
    const y = h - pad - ((s.value - min) / range) * (h - 2 * pad)
    return `${x},${y}`
  })

  const color = dark ? '#3b82f6' : '#2563eb'

  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={Number(points[points.length - 1]!.split(',')[0])}
        cy={Number(points[points.length - 1]!.split(',')[1])}
        r={2}
        fill={color}
      />
    </svg>
  )
}

export type CountryConsoleProps = {
  iso3: string
  countryName: string
  data: MapRow[]
  indicators: IndicatorDef[]
  selectedCode: string
  selectedYear: number
  dark: boolean
  onClose: () => void
}

function IndicatorRow({
  ind,
  iso3,
  dark,
}: {
  ind: IndicatorDef
  iso3: string
  dark: boolean
}) {
  const border = dark ? '#2D2D2D' : '#E8E4DC'
  const muted = dark ? '#8B8B8B' : '#525960'
  const ink = dark ? '#E8E4DC' : '#0F0F0F'

  const latestData = ind.data[ind.latestYear]
  const v = latestData?.[iso3]
  const formatted = v != null && !Number.isNaN(v) ? fmtForIndicator(v, ind) : '—'
  const series = getTimeSeries(ind, iso3)

  return (
    <div
      style={{
        padding: '8px 0',
        borderBottom: `1px solid ${border}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <span
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13,
            color: ink,
            fontWeight: 600,
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {formatted}
        </span>
      </div>
      {series.length >= 2 && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MiniSparkline series={series} dark={dark} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: muted }}>
            {series[0]!.year}–{series[series.length - 1]!.year}
          </span>
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
  dark,
  onClose,
}: CountryConsoleProps) {
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

  const otherIndicators = indicators.filter((i) => i.code !== selectedCode)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        maxWidth: '85vw',
        zIndex: 30,
        background: cardBg,
        borderLeft: `1px solid ${border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: shadow,
        animation: 'atlas-console-in 0.25s ease-out',
      }}
    >
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}
      >
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
              {iso3}
            </p>
          </div>
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
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
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
          }}
        >
          {activeIndicator?.name ?? 'Indicator'}
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif, system-ui",
            fontWeight: 900,
            fontSize: 36,
            color: ink,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {mainValue}
        </div>
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 11,
            color: muted,
            marginTop: 4,
          }}
        >
          {activeIndicator?.code} · {selectedYear}
        </div>
        {activeSeries.length >= 2 && (
          <div style={{ marginTop: 10 }}>
            <MiniSparkline series={activeSeries} dark={dark} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                color: muted,
                marginTop: 2,
              }}
            >
              <span>{activeSeries[0]!.year}</span>
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
          padding: '12px 16px 24px',
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
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: `1px solid ${border}`,
          }}
        >
          All indicators
        </div>
        {otherIndicators.map((ind) => (
          <IndicatorRow key={ind.code} ind={ind} iso3={iso3} dark={dark} />
        ))}
      </div>
    </div>
  )
}
