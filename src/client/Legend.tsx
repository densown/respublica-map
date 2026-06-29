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
  const textColor = dark ? '#e0e0e0' : '#222'
  const mutedColor = dark ? '#888' : '#999'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        background: dark ? 'rgba(20,20,30,0.88)' : 'rgba(255,255,255,0.92)',
        borderRadius: 8,
        padding: '8px 14px',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        maxWidth: 320,
        width: 'max-content',
      }}
    >
      <div style={{
        fontFamily: 'system-ui, sans-serif',
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
        fontFamily: 'monospace',
        fontSize: 10,
        color: mutedColor,
      }}>
        <span>{formatValue(vMin)}</span>
        <span>{formatValue(vMax)}</span>
      </div>
    </div>
  )
}
