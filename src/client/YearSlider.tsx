import { useEffect, useRef, useState } from 'react'

export type YearSliderProps = {
  years: number[]
  selected: number
  onChange: (year: number) => void
  dark: boolean
}

export function YearSlider({ years, selected, onChange, dark }: YearSliderProps) {
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedRef = useRef(selected)

  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }
    intervalRef.current = setInterval(() => {
      const idx = years.indexOf(selectedRef.current)
      if (idx >= years.length - 1) {
        setPlaying(false)
        return
      }
      onChange(years[idx + 1]!)
    }, 1200)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, years, onChange])

  const bg = dark ? 'rgba(20,20,30,0.92)' : 'rgba(255,255,255,0.95)'
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const muted = dark ? '#8B8B8B' : '#525960'
  const active = '#3b82f6'

  const handlePlay = () => {
    if (playing) {
      setPlaying(false)
    } else {
      if (selected === years[years.length - 1]) {
        onChange(years[0]!)
      }
      setPlaying(true)
    }
  }

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
        padding: '5px 10px',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      <button
        onClick={handlePlay}
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          border: `1px solid ${border}`,
          background: playing ? active : 'transparent',
          color: playing ? '#fff' : muted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          flexShrink: 0,
        }}
        title={playing ? 'Pause' : 'Play time-lapse'}
      >
        {playing ? '||' : '▶'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
        {years.map((y) => {
          const isActive = y === selected
          return (
            <button
              key={y}
              onClick={() => {
                setPlaying(false)
                onChange(y)
              }}
              style={{
                padding: '3px 6px',
                borderRadius: 4,
                border: 'none',
                background: isActive ? active : 'transparent',
                color: isActive ? '#fff' : muted,
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                fontWeight: isActive ? 700 : 400,
                transition: 'background 0.15s, color 0.15s',
                flexShrink: 0,
              }}
            >
              {y}
            </button>
          )
        })}
      </div>
    </div>
  )
}
