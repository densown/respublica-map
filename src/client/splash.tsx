import './index.css'
import './atlas.css'

import { requestExpandedMode } from '@devvit/web/client'
import { StrictMode, useState, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { WorldGlobe } from './WorldGlobe'
import type { WorldGeoJson, IndicatorsFile, IndicatorDef, MapRow } from './worldTypes'

function indicatorToRows(ind: IndicatorDef, geojson: WorldGeoJson): MapRow[] {
  const yearData = ind.data[ind.latestYear] ?? {}
  return geojson.features.map((f) => {
    const iso = f.properties.iso3.toUpperCase()
    return { country_code: iso, country_name: f.properties.name, value: yearData[iso] ?? null, region: null }
  })
}

function Splash() {
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [indicators, setIndicators] = useState<IndicatorDef[] | null>(null)
  const [globeReady, setGlobeReady] = useState(false)
  const [followState, setFollowState] = useState<'idle' | 'busy' | 'done'>('idle')

  const handleFollow = () => {
    if (followState !== 'idle') return
    setFollowState('busy')
    void fetch('/api/subscribe', { method: 'POST' })
      .then((r) => setFollowState(r.ok ? 'done' : 'idle'))
      .catch(() => setFollowState('idle'))
  }

  useEffect(() => {
    void Promise.all([
      fetch('/data/world.geojson').then((r) => { if (!r.ok) throw new Error(`GeoJSON: ${r.status}`); return r.json() }),
      fetch('/data/indicators.json').then((r) => { if (!r.ok) throw new Error(`Indicators: ${r.status}`); return r.json() }),
    ])
      .then(([gj, ind]) => {
        setGeojson(gj as WorldGeoJson)
        const file = ind as IndicatorsFile
        setIndicators(file.indicators)
        setGlobeReady(true)
      })
      .catch(() => setGlobeReady(false))
  }, [])

  const defaultIndicator = useMemo(
    () => indicators?.find((i) => i.code === 'NY.GDP.PCAP.CD') ?? indicators?.[0] ?? null,
    [indicators],
  )

  const rows = useMemo(
    () => (defaultIndicator && geojson ? indicatorToRows(defaultIndicator, geojson) : []),
    [defaultIndicator, geojson],
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#0A0A0A' }}>
      {/* Zoom-Buttons auf dem Splash ausblenden, der Globus ist hier Kulisse */}
      <style>{'.maplibregl-ctrl-top-right { display: none; }'}</style>
      {/* Globe background */}
      {globeReady && geojson && defaultIndicator && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <WorldGlobe
            geojson={geojson}
            data={rows}
            category={defaultIndicator.category ?? 'economy'}
            unit={defaultIndicator.unit ?? ''}
            indicatorName={defaultIndicator.name ?? ''}
            formatValue={(v) => String(v)}
            dark={true}
            nightMode={true}
            autoRotate={true}
            interactive={false}
          />
        </div>
      )}

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.75) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif, system-ui",
            fontSize: 32, fontWeight: 900, letterSpacing: -0.5,
            color: '#E8E4DC',
            textShadow: '0 2px 20px rgba(0,0,0,0.6)',
          }}>
            World Atlas<span style={{ color: '#E8384F' }}>.</span>
          </div>
          <div style={{
            fontSize: 13, color: 'rgba(232,228,220,0.7)',
            maxWidth: 260, textAlign: 'center',
            fontFamily: "'Source Serif 4', serif, system-ui",
            textShadow: '0 1px 8px rgba(0,0,0,0.5)',
          }}>
            Explore global indicators on an interactive globe
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
                style={{
                  padding: '10px 28px', borderRadius: 20, border: 'none',
                  background: '#E8384F', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Source Serif 4', serif, system-ui",
                  boxShadow: '0 4px 20px rgba(232,56,79,0.4)',
                }}
              >
                Open Globe
              </button>
              <button
                onClick={(e) => requestExpandedMode(e.nativeEvent, 'world')}
                style={{
                  padding: '10px 28px', borderRadius: 20,
                  border: '1px solid rgba(212,168,67,0.6)',
                  background: 'rgba(212,168,67,0.12)', color: '#D4A843',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Source Serif 4', serif, system-ui",
                  backdropFilter: 'blur(8px)',
                }}
              >
                World Game
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={(e) => requestExpandedMode(e.nativeEvent, 'quiz')}
                style={{
                  padding: '8px 18px', borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(8px)',
                  color: '#E8E4DC', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                Guess Country
              </button>
              <button
                onClick={(e) => requestExpandedMode(e.nativeEvent, 'higher')}
                style={{
                  padding: '8px 18px', borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(8px)',
                  color: '#E8E4DC', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                Higher or Lower
              </button>
              <button
                onClick={(e) => requestExpandedMode(e.nativeEvent, 'sort')}
                style={{
                  padding: '8px 18px', borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(8px)',
                  color: '#E8E4DC', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                Rank It
              </button>
            </div>

            <button
              onClick={handleFollow}
              disabled={followState !== 'idle'}
              style={{
                marginTop: 6, padding: '7px 18px', borderRadius: 16,
                border: `1px solid ${followState === 'done' ? 'rgba(61,168,90,0.6)' : 'rgba(232,56,79,0.5)'}`,
                background: followState === 'done' ? 'rgba(61,168,90,0.12)' : 'rgba(232,56,79,0.1)',
                backdropFilter: 'blur(8px)',
                color: followState === 'done' ? '#3DA85A' : '#F0808F',
                fontSize: 11, fontWeight: 600,
                cursor: followState === 'idle' ? 'pointer' : 'default',
                fontFamily: "'IBM Plex Mono', monospace",
                transition: 'all 0.25s',
              }}
            >
              {followState === 'done' ? 'Following r/Res_Publica_DE ✓'
                : followState === 'busy' ? 'Following...'
                : '+ Follow r/Res_Publica_DE'}
            </button>
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 12, pointerEvents: 'none',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(82,89,96,0.8)',
        }}>
          r/Res_Publica_DE
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
)
