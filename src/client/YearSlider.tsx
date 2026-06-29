export type YearSliderProps = {
  years: number[]
  selected: number
  onChange: (year: number) => void
  dark: boolean
}

export function YearSlider({ years, selected, onChange, dark }: YearSliderProps) {
  const bg = dark ? 'rgba(20,20,30,0.92)' : 'rgba(255,255,255,0.95)'
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const muted = dark ? '#8B8B8B' : '#525960'
  const active = '#3b82f6'

  const min = years[0]!
  const max = years[years.length - 1]!

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        background: bg,
        borderRadius: 8,
        padding: '6px 14px',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 200,
      }}
    >
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: muted,
          flexShrink: 0,
        }}
      >
        {min}
      </span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        {years.map((y) => (
          <button
            key={y}
            onClick={() => onChange(y)}
            style={{
              flex: 1,
              height: y === selected ? 24 : 16,
              border: 'none',
              borderRadius: 3,
              background: y === selected ? active : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
              cursor: 'pointer',
              transition: 'height 0.15s, background 0.15s',
              position: 'relative',
            }}
            title={String(y)}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: muted,
          flexShrink: 0,
        }}
      >
        {max}
      </span>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          color: dark ? '#fff' : '#111',
          minWidth: 32,
          textAlign: 'center',
        }}
      >
        {selected}
      </span>
    </div>
  )
}
