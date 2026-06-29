import { gradientCss } from './worldColors'

export type LegendProps = {
  category: string
  vMin: number
  vMax: number
  indicatorName: string
  year: number
  formatValue: (v: number) => string
  dark: boolean
}

export function Legend({ category, vMin, vMax, indicatorName, year, formatValue, dark }: LegendProps) {
  const textColor = dark ? '#E8E4DC' : '#0F0F0F'
  const mutedColor = dark ? '#8B8B8B' : '#525960'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        background: dark ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.92)',
        borderRadius: 8,
        padding: '8px 14px',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${dark ? '#2D2D2D' : '#E8E4DC'}`,
        maxWidth: 320,
        width: 'max-content',
      }}
    >
      <div style={{
        fontFamily: "'Source Serif 4', serif, system-ui",
        fontSize: 11,
        fontWeight: 600,
        color: textColor,
        marginBottom: 4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {indicatorName}
        <span style={{ fontWeight: 400, color: mutedColor, marginLeft: 6 }}>{year}</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: gradientCss(category, dark),
          marginBottom: 3,
        }}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        color: mutedColor,
      }}>
        <span>{formatValue(vMin)}</span>
        <span>{formatValue(vMax)}</span>
      </div>
    </div>
  )
}
