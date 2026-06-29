import { useEffect, useRef, useState } from 'react'
import { getTheme, FONT } from './theme'

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
  const t = getTheme(dark)

  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }
    intervalRef.current = setInterval(() => {
      const idx = years.indexOf(selectedRef.current)
      if (idx >= years.length - 1) { setPlaying(false); return }
      onChange(years[idx + 1]!)
    }, 800)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, years, onChange])

  const handlePlay = () => {
    if (playing) {
      setPlaying(false)
    } else {
      if (selected === years[years.length - 1]) onChange(years[0]!)
      setPlaying(true)
    }
  }

  const idx = years.indexOf(selected)

  return (
    <div style={{
      position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
      background: t.bg, borderRadius: 8, padding: '6px 14px', backdropFilter: 'blur(8px)',
      border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10,
      width: 320, maxWidth: 'calc(100vw - 40px)',
    }}>
      <button onClick={handlePlay} style={{
        width: 24, height: 24, borderRadius: 4, border: `1px solid ${t.border}`,
        background: playing ? t.red : 'transparent', color: playing ? '#fff' : t.muted,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, flexShrink: 0,
      }} title={playing ? 'Pause' : 'Play time-lapse'}>
        {playing ? '||' : '▶'}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <input type="range" min={0} max={years.length - 1} value={idx >= 0 ? idx : 0}
          onChange={(e) => { setPlaying(false); onChange(years[Number(e.target.value)]!) }}
          className="atlas-year-range"
          style={{ width: '100%', accentColor: t.red, cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 9, color: t.muted }}>
          <span>{years[0]}</span>
          <span style={{ fontWeight: 700, color: t.ink, fontSize: 11 }}>{selected}</span>
          <span>{years[years.length - 1]}</span>
        </div>
      </div>
    </div>
  )
}
