import { useState } from 'react'
import { getTheme, FONT } from './theme'
import type { IndicatorDef } from './worldTypes'

export function IndicatorInfoButton({ indicator, dark }: { indicator: IndicatorDef; dark: boolean }) {
  const [open, setOpen] = useState(false)
  const meta = indicator.meta
  if (!meta) return null
  const t = getTheme(dark)

  return (
    <>
      <button type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        style={{
          width: 16, height: 16, borderRadius: '50%', border: `1px solid ${t.border}`,
          background: 'transparent', color: t.muted, cursor: 'pointer',
          fontFamily: FONT.mono, fontSize: 8, fontWeight: 700, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0,
        }}
        title="Info"
      >i</button>
      {open && <IndicatorInfoModal indicator={indicator} dark={dark} onClose={() => setOpen(false)} />}
    </>
  )
}

function IndicatorInfoModal({ indicator, dark, onClose }: {
  indicator: IndicatorDef; dark: boolean; onClose: () => void
}) {
  const meta = indicator.meta!
  const t = getTheme(dark)
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: t.backdrop }} />
      <div style={{
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 51,
        width: 320, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
        background: t.cardBg, borderRadius: 10, border: `1px solid ${t.border}`,
        boxShadow: dark ? '0 12px 48px rgba(0,0,0,0.6)' : '0 12px 48px rgba(0,0,0,0.15)', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 17, color: t.ink, margin: 0, lineHeight: 1.2 }}>
              {indicator.name}<span style={{ color: t.red }}>.</span>
            </h3>
            <p style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted, margin: '4px 0 0' }}>
              {indicator.code}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            width: 24, height: 24, border: `1px solid ${t.border}`, borderRadius: 4,
            background: 'transparent', color: t.muted, cursor: 'pointer',
            fontFamily: FONT.mono, fontSize: 10, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>✕</button>
        </div>

        <InfoSection label="Description" dark={dark}>{meta.description}</InfoSection>
        <InfoSection label="Source" dark={dark}>{meta.source}</InfoSection>
        <InfoSection label="Interpretation" dark={dark}>{meta.interpretation}</InfoSection>

        <div style={{
          marginTop: 14, paddingTop: 10, borderTop: `1px solid ${t.border}`,
          display: 'flex', gap: 12, fontFamily: FONT.mono, fontSize: 9, color: t.muted,
        }}>
          <span>Unit: {indicator.unit}</span>
          <span>Years: {indicator.years[0]}–{indicator.years[indicator.years.length - 1]}</span>
        </div>
      </div>
    </>
  )
}

function InfoSection({ label, dark, children }: { label: string; dark: boolean; children: import('react').ReactNode }) {
  const t = getTheme(dark)
  return (
    <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${t.border}` }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 1.5, color: t.ink }}>
        {children}
      </div>
    </div>
  )
}
