import type { IndicatorDef, MapRow } from './worldTypes'

export type CountryConsoleProps = {
  iso3: string
  countryName: string
  data: MapRow[]
  indicators: IndicatorDef[]
  selectedCode: string
  formatValue: (v: number) => string
  dark: boolean
  onClose: () => void
}

function StatRow({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: `1px solid ${dark ? '#2D2D2D' : '#E8E4DC'}`,
      }}
    >
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: dark ? '#8B8B8B' : '#525960',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          color: dark ? '#E8E4DC' : '#0F0F0F',
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function CountryConsole({
  iso3,
  countryName,
  data,
  indicators,
  selectedCode,
  formatValue,
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
    row?.value != null && !Number.isNaN(row.value) ? formatValue(row.value) : 'No data'

  const otherIndicators = indicators
    .filter((i) => i.code !== selectedCode)
    .map((ind) => {
      const v = ind.data[iso3]
      return {
        name: ind.name,
        year: ind.year,
        value: v != null && !Number.isNaN(v) ? formatValue(v) : '—',
      }
    })

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
          {activeIndicator?.code} · {activeIndicator?.year}
        </div>
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
          <StatRow key={ind.name} label={ind.name} value={ind.value} dark={dark} />
        ))}
      </div>
    </div>
  )
}
