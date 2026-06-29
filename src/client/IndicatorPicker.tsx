import type { IndicatorDef } from './worldTypes'

const CATEGORY_LABELS: Record<string, string> = {
  economy: 'Economy',
  democracy: 'Democracy',
  health: 'Health',
  environment: 'Environment',
  inequality: 'Inequality',
  security: 'Security',
  technology: 'Technology',
  military: 'Military',
}

const CATEGORY_ICONS: Record<string, string> = {
  economy: '$',
  democracy: 'D',
  health: '+',
  environment: 'C',
  inequality: 'G',
  security: 'S',
  technology: 'W',
  military: 'M',
}

export type IndicatorPickerProps = {
  indicators: IndicatorDef[]
  selected: string
  onSelect: (code: string) => void
  dark: boolean
}

export function IndicatorPicker({ indicators, selected, onSelect, dark }: IndicatorPickerProps) {
  const bg = dark ? 'rgba(20,20,30,0.88)' : 'rgba(255,255,255,0.92)'
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const text = dark ? '#e0e0e0' : '#222'
  const muted = dark ? '#888' : '#999'
  const activeBg = dark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)'
  const activeBorder = '#3b82f6'

  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        left: 10,
        zIndex: 20,
        background: bg,
        borderRadius: 10,
        padding: '6px',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      {indicators.map((ind) => {
        const isActive = ind.code === selected
        const cat = CATEGORY_LABELS[ind.category] ?? ind.category
        const icon = CATEGORY_ICONS[ind.category] ?? '?'
        return (
          <button
            key={ind.code}
            onClick={() => onSelect(ind.code)}
            title={`${ind.name} (${cat}, ${ind.year})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 6,
              border: isActive ? `1px solid ${activeBorder}` : '1px solid transparent',
              background: isActive ? activeBg : 'transparent',
              color: isActive ? (dark ? '#fff' : '#111') : text,
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 12,
              textAlign: 'left',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                background: isActive ? activeBorder : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                color: isActive ? '#fff' : muted,
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ind.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
