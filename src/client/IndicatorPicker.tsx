import { useState, useRef, useEffect } from 'react'
import { getTheme, FONT } from './theme'
import type { IndicatorDef } from './worldTypes'

const CATEGORY_LABELS: Record<string, string> = {
  economy: 'Economy', democracy: 'Democracy', health: 'Health',
  environment: 'Environment', inequality: 'Inequality', security: 'Security',
  technology: 'Technology', military: 'Military',
}

const CATEGORY_ICONS: Record<string, string> = {
  economy: '$', democracy: 'D', health: '+', environment: 'C',
  inequality: 'G', security: 'S', technology: 'W', military: 'M',
}

export type IndicatorPickerProps = {
  indicators: IndicatorDef[]
  selected: string
  onSelect: (code: string) => void
  dark: boolean
}

export function IndicatorPicker({ indicators, selected, onSelect, dark }: IndicatorPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = indicators.find((i) => i.code === selected)
  const t = getTheme(dark)
  const activeBg = dark ? 'rgba(232,56,79,0.15)' : 'rgba(200,16,46,0.1)'

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'absolute', top: 52, left: 10, zIndex: 20 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8,
        border: `1px solid ${t.border}`, background: t.bg, backdropFilter: 'blur(8px)',
        color: t.ink, cursor: 'pointer', fontFamily: FONT.body, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, background: t.red, color: '#fff', flexShrink: 0,
        }}>
          {CATEGORY_ICONS[active?.category ?? ''] ?? '?'}
        </span>
        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {active?.name ?? 'Select'}
        </span>
        <span style={{ fontSize: 9, color: t.muted, marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 4, background: t.bg, borderRadius: 10, padding: 4, backdropFilter: 'blur(12px)',
          border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 1,
          maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', minWidth: 220, boxShadow: t.shadow,
        }}>
          {indicators.map((ind) => {
            const isActive = ind.code === selected
            const icon = CATEGORY_ICONS[ind.category] ?? '?'
            return (
              <button key={ind.code}
                onClick={() => { onSelect(ind.code); setOpen(false) }}
                title={`${ind.name} (${CATEGORY_LABELS[ind.category] ?? ind.category}, ${ind.latestYear})`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6,
                  border: isActive ? `1px solid ${t.red}` : '1px solid transparent',
                  background: isActive ? activeBg : 'transparent',
                  color: isActive ? (dark ? '#fff' : '#111') : t.ink,
                  cursor: 'pointer', fontFamily: FONT.body, fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.hoverBg }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: isActive ? t.red : dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: isActive ? '#fff' : t.muted, flexShrink: 0,
                }}>
                  {icon}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ind.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
