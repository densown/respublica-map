import './index.css'
import './atlas.css'

import { StrictMode, useState, useEffect, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { RegionMap } from './RegionMap'
import { RulesOverlay } from './RulesOverlay'
import { FONT } from './theme'
import { FACTIONS, FACTION_BY_ID, REGION_BY_ID } from '../shared/world'
import type {
  FactionId,
  RegionState,
  WorldStateResponse,
  JoinResponse,
  InvestResponse,
} from '../shared/world'
import type { WorldGeoJson } from './worldTypes'

const INK = '#E8E4DC'
const MUTED = '#8B8B8B'
const BORDER = '#2D2D2D'
const RED = '#E8384F'

// ---------- kleine Helfer ----------

function useCountUp(target: number): number {
  const [display, setDisplay] = useState(target)
  const raf = useRef(0)
  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const from = display
    const diff = target - from
    if (diff === 0) return
    const start = performance.now()
    const dur = Math.min(700, 220 + Math.abs(diff) * 14)
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + diff * eased))
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return display
}

type ToastMsg = { id: number; text: string; color?: string | undefined }

function Toasts({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div style={{
      position: 'absolute', top: 64, left: 0, right: 0, zIndex: 60,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} className="wg-toast" style={{
          padding: '8px 18px', borderRadius: 18,
          background: 'rgba(20,20,20,0.92)', border: `1px solid ${t.color ?? BORDER}`,
          color: t.color ?? INK, fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
          boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
        }}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

// ---------- Fraktionswahl ----------

function FactionPick({
  memberCounts,
  onJoin,
  joining,
}: {
  memberCounts: Record<string, number>
  onJoin: (f: FactionId) => void
  joining: boolean
}) {
  const [selected, setSelected] = useState<FactionId | null>(null)
  const sel = selected ? FACTION_BY_ID[selected] : null

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50, overflowY: 'auto',
      background: 'radial-gradient(ellipse at 50% 30%, #181818 0%, #0D0D0D 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px 32px',
    }}>
      <div style={{ fontFamily: FONT.mono, fontSize: 10, color: MUTED, letterSpacing: '0.14em', marginBottom: 10 }}>
        WORLD GAME · SEASON 1
      </div>
      <div style={{
        fontFamily: FONT.display, fontSize: 30, fontWeight: 900, color: INK,
        textAlign: 'center', lineHeight: 1.15, marginBottom: 6,
      }}>
        Choose your side<span style={{ color: RED }}>.</span>
      </div>
      <div style={{
        fontFamily: FONT.body, fontSize: 13, color: MUTED, textAlign: 'center',
        maxWidth: 300, marginBottom: 26,
      }}>
        Earn influence by playing, then claim regions for your team. Your choice is permanent for this season.
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        width: '100%', maxWidth: 360,
      }}>
        {FACTIONS.map((f) => {
          const isSel = selected === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f.id)}
              className="wg-press"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5,
                padding: '14px 14px 12px', borderRadius: 14, textAlign: 'left',
                border: `1.5px solid ${isSel ? f.color : BORDER}`,
                background: isSel ? `${f.color}1F` : 'rgba(255,255,255,0.025)',
                cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s, transform 0.12s',
              }}
            >
              <span style={{
                width: 12, height: 12, borderRadius: 6, background: f.color,
                boxShadow: isSel ? `0 0 10px ${f.color}` : 'none', transition: 'box-shadow 0.25s',
              }} />
              <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 900, color: INK }}>
                {f.name}
              </span>
              <span style={{ fontFamily: FONT.body, fontSize: 11, color: MUTED, lineHeight: 1.3 }}>
                {f.motto}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: isSel ? f.color : '#525960', letterSpacing: '0.08em' }}>
                {(memberCounts[f.id] ?? 0)} MEMBERS
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ height: 76 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px 22px',
        display: 'flex', justifyContent: 'center',
        background: 'linear-gradient(transparent, rgba(10,10,10,0.92) 40%)',
        pointerEvents: 'none',
      }}>
        <button
          type="button"
          disabled={!sel || joining}
          onClick={() => sel && onJoin(sel.id)}
          className="wg-press"
          style={{
            pointerEvents: 'auto',
            padding: '13px 44px', borderRadius: 24, border: 'none',
            background: sel ? sel.color : '#2A2A2A',
            color: sel ? '#0D0D0D' : '#5A5A5A',
            fontFamily: FONT.body, fontSize: 15, fontWeight: 700,
            cursor: sel ? 'pointer' : 'default',
            transition: 'background 0.25s, color 0.25s, transform 0.12s',
            boxShadow: sel ? `0 6px 28px ${sel.color}55` : 'none',
          }}
        >
          {joining ? 'Joining...' : sel ? `Join ${sel.name}` : 'Pick a faction'}
        </button>
      </div>
    </div>
  )
}

// ---------- Region-Sheet ----------

function RegionSheet({
  region,
  faction,
  points,
  onInvest,
  onClose,
  investing,
}: {
  region: RegionState
  faction: FactionId
  points: number
  onInvest: (amount: number) => void
  onClose: () => void
  investing: boolean
}) {
  const def = REGION_BY_ID[region.id]
  // Komponente wird pro Region neu gemountet (key), Initialwert reicht.
  const [rawAmount, setAmount] = useState<number>(() => Math.min(5, points))
  const amount = Math.min(rawAmount, points)

  const entries = Object.entries(region.influence)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const max = entries.length ? entries[0]![1] : 0
  const controller = region.controller ? FACTION_BY_ID[region.controller] : null
  const myFaction = FACTION_BY_ID[faction]!

  const presets = [5, 25, points].filter((v, i, a) => v > 0 && a.indexOf(v) === i)

  return (
    <div className="wg-sheet" style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      background: 'rgba(18,18,18,0.97)', borderTop: `1px solid ${BORDER}`,
      borderRadius: '18px 18px 0 0', padding: '14px 18px 22px',
      boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
      maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#3A3A3A' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
        <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 900, color: INK }}>
          {def?.name ?? region.id}
        </div>
        <button type="button" onClick={onClose} style={{
          border: 'none', background: 'transparent', color: MUTED,
          fontFamily: FONT.mono, fontSize: 11, cursor: 'pointer', padding: 4,
        }}>
          CLOSE
        </button>
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.08em', marginBottom: 12, color: controller ? controller.color : MUTED }}>
        {controller ? `CONTROLLED BY ${controller.name.toUpperCase()}` : 'UNCLAIMED TERRITORY'}
      </div>

      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
          {entries.map(([fid, val]) => {
            const fdef = FACTION_BY_ID[fid]
            if (!fdef) return null
            return (
              <div key={fid} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: MUTED, width: 92, letterSpacing: '0.04em' }}>
                  {fdef.name.toUpperCase()}
                </span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#242424', overflow: 'hidden' }}>
                  <div style={{
                    width: `${max > 0 ? Math.max(4, (val / max) * 100) : 0}%`,
                    height: '100%', borderRadius: 3, background: fdef.color,
                    transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                  }} />
                </div>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: INK, minWidth: 34, textAlign: 'right' }}>
                  {val}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {entries.length === 0 && (
        <div style={{ fontFamily: FONT.body, fontSize: 13, color: MUTED, marginBottom: 14 }}>
          No influence here yet. Be the first to plant your flag.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {presets.map((v, i) => {
            const label = i === presets.length - 1 && v === points && points !== 5 && points !== 25 ? 'ALL' : String(v)
            const active = amount === v
            return (
              <button key={`${v}-${label}`} type="button" onClick={() => setAmount(v)}
                className="wg-press"
                disabled={v > points}
                style={{
                  padding: '8px 14px', borderRadius: 14,
                  border: `1.5px solid ${active ? myFaction.color : BORDER}`,
                  background: active ? `${myFaction.color}22` : 'transparent',
                  color: v > points ? '#4A4A4A' : active ? myFaction.color : INK,
                  fontFamily: FONT.mono, fontSize: 12, fontWeight: 700,
                  cursor: v > points ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                }}>
                {label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          disabled={investing || amount < 1 || amount > points}
          onClick={() => onInvest(amount)}
          className="wg-press"
          style={{
            flex: 1, padding: '11px 0', borderRadius: 18, border: 'none',
            background: amount >= 1 && amount <= points ? myFaction.color : '#2A2A2A',
            color: amount >= 1 && amount <= points ? '#0D0D0D' : '#5A5A5A',
            fontFamily: FONT.body, fontSize: 14, fontWeight: 700,
            cursor: amount >= 1 && amount <= points ? 'pointer' : 'default',
            transition: 'background 0.2s, transform 0.12s',
          }}
        >
          {investing ? '...' : 'Invest'}
        </button>
      </div>
      {points === 0 && (
        <div style={{ fontFamily: FONT.body, fontSize: 12, color: MUTED, marginTop: 10, textAlign: 'center' }}>
          Out of influence. Play Guess Country, Higher or Lower, or Rank It to earn more.
        </div>
      )}
    </div>
  )
}

// ---------- Haupt-App ----------

function WorldApp() {
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [state, setState] = useState<WorldStateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [investing, setInvesting] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const toastId = useRef(0)

  const pushToast = useCallback((text: string, color?: string) => {
    const id = ++toastId.current
    setToasts((prev) => [...prev.slice(-2), { id, text, color }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2400)
  }, [])

  useEffect(() => {
    void Promise.all([
      fetch('/data/world.geojson').then((r) => { if (!r.ok) throw new Error(`GeoJSON: ${r.status}`); return r.json() }),
      fetch('/api/world/state').then((r) => { if (!r.ok) throw new Error(`State: ${r.status}`); return r.json() }),
    ])
      .then(([gj, st]) => {
        setGeojson(gj as WorldGeoJson)
        setState(st as WorldStateResponse)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const points = useCountUp(state?.points ?? 0)
  const myFaction = state?.faction ? FACTION_BY_ID[state.faction] : null

  const handleJoin = useCallback(async (factionId: FactionId) => {
    setJoining(true)
    try {
      const res = await fetch('/api/world/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faction: factionId }),
      })
      if (!res.ok) throw new Error(`Join failed: ${res.status}`)
      const data = (await res.json()) as JoinResponse
      setState((prev) => prev ? {
        ...prev,
        faction: data.faction,
        points: data.points,
        memberCounts: {
          ...prev.memberCounts,
          [data.faction]: (prev.memberCounts[data.faction] ?? 0) + (data.ok ? 1 : 0),
        },
      } : prev)
      if (data.ok) {
        pushToast(`Welcome to ${FACTION_BY_ID[data.faction]!.name}. +25 influence`, FACTION_BY_ID[data.faction]!.color)
        setShowRules(true)
      }
    } catch (e) {
      pushToast('Could not join. Try again.', RED)
    } finally {
      setJoining(false)
    }
  }, [pushToast])

  const handleInvest = useCallback(async (amount: number) => {
    if (!selectedRegion || !state?.faction) return
    setInvesting(true)
    try {
      const res = await fetch('/api/world/invest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: selectedRegion, amount }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? `Invest failed: ${res.status}`)
      }
      const data = (await res.json()) as InvestResponse
      setState((prev) => {
        if (!prev) return prev
        const regions = prev.regions.map((r) => (r.id === data.region.id ? data.region : r))
        const factionTotals: Record<string, number> = {}
        for (const f of FACTIONS) factionTotals[f.id] = 0
        for (const r of regions) {
          for (const [f, v] of Object.entries(r.influence)) factionTotals[f] = (factionTotals[f] ?? 0) + v
        }
        return { ...prev, points: data.points, regions, factionTotals }
      })
      pushToast(`+${amount} influence in ${REGION_BY_ID[selectedRegion]?.name}`, myFaction?.color)
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Invest failed', RED)
    } finally {
      setInvesting(false)
    }
  }, [selectedRegion, state?.faction, myFaction, pushToast])

  if (error) {
    return (
      <div className="atlas-root atlas-error">
        <p>Failed to load World Game</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
      </div>
    )
  }

  if (!geojson || !state) {
    return (
      <div className="atlas-root atlas-loading" data-dark="true">
        <div className="atlas-spinner" />
        <span>Loading World Game...</span>
      </div>
    )
  }

  const selected = selectedRegion ? state.regions.find((r) => r.id === selectedRegion) ?? null : null
  const latestEvent = state.events[0] ?? null

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A', overflow: 'hidden' }}>
      <style>{`
        .wg-press:active:not(:disabled) { transform: scale(0.96); }
        .wg-sheet { animation: wg-slide-up 0.38s cubic-bezier(0.32, 0.72, 0, 1); }
        .wg-toast { animation: wg-drop-in 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes wg-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes wg-drop-in { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .wg-sheet, .wg-toast { animation: none; }
        }
      `}</style>

      <RegionMap
        geojson={geojson}
        regions={state.regions}
        selectedRegion={selectedRegion}
        onRegionClick={(id) => setSelectedRegion((prev) => (prev === id ? null : id))}
      />

      {/* HUD */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px',
        background: 'linear-gradient(rgba(10,10,10,0.85), transparent)',
        pointerEvents: 'none',
      }}>
        {myFaction ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 12px', borderRadius: 16,
            background: 'rgba(20,20,20,0.85)', border: `1px solid ${myFaction.color}55`,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: myFaction.color }} />
            <span style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: INK }}>
              {myFaction.name}
            </span>
          </div>
        ) : <div />}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 5,
          padding: '6px 12px', borderRadius: 16,
          background: 'rgba(20,20,20,0.85)', border: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 15, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>
            {points}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>
            INFLUENCE
          </span>
        </div>
      </div>

      {/* Event-Ticker */}
      {latestEvent && !selected && (
        <div style={{
          position: 'absolute', top: 54, left: 0, right: 0, zIndex: 25,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, color: MUTED,
            padding: '4px 12px', borderRadius: 12, background: 'rgba(15,15,15,0.75)',
            letterSpacing: '0.02em',
          }}>
            {latestEvent.text}
          </div>
        </div>
      )}

      {/* Hinweis unten, wenn nichts ausgewaehlt */}
      {state.faction && !selected && (
        <div style={{
          position: 'absolute', bottom: 22, left: 0, right: 0, zIndex: 20,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: FONT.body, fontSize: 12, color: MUTED,
            padding: '8px 18px', borderRadius: 18,
            background: 'rgba(18,18,18,0.85)', border: `1px solid ${BORDER}`,
          }}>
            Tap a region to invest your influence
          </div>
        </div>
      )}

      {/* Region-Sheet */}
      {selected && state.faction && (
        <RegionSheet
          key={selected.id}
          region={selected}
          faction={state.faction}
          points={state.points}
          investing={investing}
          onInvest={handleInvest}
          onClose={() => setSelectedRegion(null)}
        />
      )}

      <Toasts toasts={toasts} />

      {/* Fraktionswahl (ueberdeckt alles) */}
      {!state.faction && (
        <FactionPick memberCounts={state.memberCounts} onJoin={handleJoin} joining={joining} />
      )}

      {showRules && (
        <RulesOverlay
          title="World Game"
          rules={[
            'Play Guess Country, Higher or Lower and Rank It to earn influence points.',
            'Invest influence in regions to claim them for your faction.',
            'The faction with the most influence controls a region.',
            'Influence decays 5% daily, so keep your empire alive.',
          ]}
          onClose={() => setShowRules(false)}
        />
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><WorldApp /></StrictMode>,
)
