import { useState } from 'react'
import type { IndicatorDef } from './worldTypes'

export type IndicatorInfoProps = {
  indicator: IndicatorDef
  dark: boolean
}

export function IndicatorInfoButton({ indicator, dark }: IndicatorInfoProps) {
  const [open, setOpen] = useState(false)
  const meta = indicator.meta
  if (!meta) return null

  const muted = dark ? '#8B8B8B' : '#525960'
  const border = dark ? '#2D2D2D' : '#E8E4DC'

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `1px solid ${border}`,
          background: 'transparent',
          color: muted,
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8,
          fontWeight: 700,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: 0,
        }}
        title="Info"
      >
        i
      </button>
      {open && (
        <IndicatorInfoModal indicator={indicator} dark={dark} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function IndicatorInfoModal({
  indicator,
  dark,
  onClose,
}: {
  indicator: IndicatorDef
  dark: boolean
  onClose: () => void
}) {
  const meta = indicator.meta!
  const cardBg = dark ? '#1A1A1A' : '#FFFFFF'
  const ink = dark ? '#E8E4DC' : '#0F0F0F'
  const muted = dark ? '#8B8B8B' : '#525960'
  const border = dark ? '#2D2D2D' : '#E8E4DC'
  const red = dark ? '#E8384F' : '#C8102E'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 51,
          width: 320,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: cardBg,
          borderRadius: 10,
          border: `1px solid ${border}`,
          boxShadow: dark ? '0 12px 48px rgba(0,0,0,0.6)' : '0 12px 48px rgba(0,0,0,0.15)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{
              fontFamily: "'Playfair Display', serif, system-ui",
              fontWeight: 900,
              fontSize: 17,
              color: ink,
              margin: 0,
              lineHeight: 1.2,
            }}>
              {indicator.name}
              <span style={{ color: red }}>.</span>
            </h3>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: muted,
              margin: '4px 0 0',
            }}>
              {indicator.code}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              border: `1px solid ${border}`,
              borderRadius: 4,
              background: 'transparent',
              color: muted,
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
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

        <Section label="Description" dark={dark}>
          {meta.description}
        </Section>
        <Section label="Source" dark={dark}>
          {meta.source}
        </Section>
        <Section label="Interpretation" dark={dark}>
          {meta.interpretation}
        </Section>

        <div style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: `1px solid ${border}`,
          display: 'flex',
          gap: 12,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          color: muted,
        }}>
          <span>Unit: {indicator.unit}</span>
          <span>Years: {indicator.years[0]}–{indicator.years[indicator.years.length - 1]}</span>
        </div>
      </div>
    </>
  )
}

function Section({ label, dark, children }: { label: string; dark: boolean; children: React.ReactNode }) {
  const muted = dark ? '#8B8B8B' : '#525960'
  const ink = dark ? '#E8E4DC' : '#0F0F0F'
  const border = dark ? '#2D2D2D' : '#E8E4DC'
  return (
    <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${border}` }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 8,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: muted,
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Source Serif 4', serif, system-ui",
        fontSize: 12,
        lineHeight: 1.5,
        color: ink,
      }}>
        {children}
      </div>
    </div>
  )
}
