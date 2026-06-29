import './index.css'
import './atlas.css'

import { StrictMode, useState, useEffect, useMemo, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { formatValue } from './formatValue'
import { getTheme, FONT } from './theme'
import type { WorldGeoJson, IndicatorsFile, IndicatorDef } from './worldTypes'

type CountryValue = {
  iso3: string
  name: string
  value: number
  formatted: string
}

type GameRound = {
  indicator: IndicatorDef
  left: CountryValue
  right: CountryValue
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

function pickRound(
  indicators: IndicatorDef[],
  geojson: WorldGeoJson,
  excludeIso?: string,
): GameRound | null {
  const ind = indicators[Math.floor(Math.random() * indicators.length)]!
  const yearData = ind.data[ind.latestYear]
  if (!yearData) return null

  const entries: CountryValue[] = []
  for (const f of geojson.features) {
    const iso = f.properties.iso3.toUpperCase()
    const v = yearData[iso]
    if (v != null && !Number.isNaN(v)) {
      entries.push({ iso3: iso, name: f.properties.name, value: v, formatted: formatValue(v, ind.unit, ind.code) })
    }
  }

  if (entries.length < 10) return null

  const shuffled = shuffleArray(entries.filter((e) => e.iso3 !== excludeIso))
  const left = excludeIso
    ? entries.find((e) => e.iso3 === excludeIso) ?? shuffled[0]!
    : shuffled[0]!
  let right = shuffled.find((e) => e.iso3 !== left.iso3 && Math.abs(e.value - left.value) > 0)
  if (!right) right = shuffled.find((e) => e.iso3 !== left.iso3)!

  return { indicator: ind, left, right }
}

type GameState = 'playing' | 'revealing' | 'gameover'

function HigherLowerApp() {
  const [indicators, setIndicators] = useState<IndicatorDef[] | null>(null)
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState>('playing')
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const t = getTheme(true)

  useEffect(() => {
    void Promise.all([
      fetch('/data/world.geojson').then((r) => { if (!r.ok) throw new Error(`GeoJSON: ${r.status}`); return r.json() }),
      fetch('/data/indicators.json').then((r) => { if (!r.ok) throw new Error(`Indicators: ${r.status}`); return r.json() }),
    ])
      .then(([gj, ind]) => {
        setGeojson(gj as WorldGeoJson)
        const file = ind as IndicatorsFile
        setIndicators(file.indicators)
      })
      .catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    if (indicators && geojson && !currentRound) {
      setCurrentRound(pickRound(indicators, geojson))
    }
  }, [indicators, geojson, currentRound])

  const handleGuess = useCallback((guess: 'higher' | 'lower') => {
    if (gameState !== 'playing' || !currentRound || !indicators || !geojson) return

    const diff = currentRound.right.value - currentRound.left.value
    const correct = (guess === 'higher' && diff >= 0) || (guess === 'lower' && diff < 0)

    setLastCorrect(correct)
    setGameState('revealing')

    setTimeout(() => {
      if (correct) {
        const newStreak = streak + 1
        setStreak(newStreak)
        setBestStreak((prev) => Math.max(prev, newStreak))
        const nextRound = pickRound(indicators, geojson, currentRound.right.iso3)
        if (nextRound) {
          nextRound.left = currentRound.right
        }
        setCurrentRound(nextRound)
        setGameState('playing')
        setLastCorrect(null)
      } else {
        setBestStreak((prev) => Math.max(prev, streak))
        setGameState('gameover')
      }
    }, 1500)
  }, [gameState, currentRound, streak, indicators, geojson])

  const handleRestart = useCallback(() => {
    if (!indicators || !geojson) return
    setStreak(0)
    setLastCorrect(null)
    setCurrentRound(pickRound(indicators, geojson))
    setGameState('playing')
  }, [indicators, geojson])

  const handleShare = useCallback(() => {
    const s = Math.max(bestStreak, streak)
    const text = `Higher or Lower: ${s} streak!\nWorld Atlas by r/Res_Publica_DE`
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [bestStreak, streak])

  if (error) {
    return (
      <div className="atlas-root atlas-error">
        <p>Failed to load data</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
      </div>
    )
  }

  if (!indicators || !geojson || !currentRound) {
    return (
      <div className="atlas-root atlas-loading" data-dark="true">
        <div className="atlas-spinner" />
        <span>Loading...</span>
      </div>
    )
  }

  if (gameState === 'gameover') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#111111', color: '#E8E4DC', padding: 24, gap: 16,
      }}>
        <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 900 }}>
          Game Over<span style={{ color: t.red }}>.</span>
        </div>

        {/* Show the final answer */}
        <div style={{
          width: '100%', maxWidth: 320, background: 'rgba(255,255,255,0.03)',
          borderRadius: 10, border: `1px solid ${t.border}`, padding: 16, marginBottom: 4,
        }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            {currentRound.indicator.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 600, color: t.ink }}>{currentRound.left.name}</div>
              <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 900, color: t.ink, marginTop: 4 }}>{currentRound.left.formatted}</div>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: t.muted, margin: '0 8px' }}>vs</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 600, color: t.red }}>{currentRound.right.name}</div>
              <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 900, color: t.red, marginTop: 4 }}>{currentRound.right.formatted}</div>
            </div>
          </div>
        </div>

        <div style={{ fontFamily: FONT.display, fontSize: 48, fontWeight: 900, color: t.red, lineHeight: 1 }}>
          {streak}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 11, color: t.muted, letterSpacing: '0.1em' }}>
          STREAK {bestStreak > streak ? `· BEST: ${bestStreak}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={handleShare} style={{
            padding: '10px 24px', borderRadius: 20, border: 'none', background: t.red,
            color: '#fff', fontFamily: FONT.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {copied ? 'Copied!' : 'Share Score'}
          </button>
          <button type="button" onClick={handleRestart} style={{
            padding: '10px 24px', borderRadius: 20, border: `1px solid ${t.border}`,
            background: 'transparent', color: t.muted, fontFamily: FONT.mono, fontSize: 12, cursor: 'pointer',
          }}>
            Play Again
          </button>
        </div>
        <div style={{
          position: 'absolute', bottom: 12,
          fontFamily: FONT.mono, fontSize: 10, color: '#525960',
        }}>
          r/Res_Publica_DE
        </div>
      </div>
    )
  }

  const isRevealing = gameState === 'revealing'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#111111', color: '#E8E4DC', padding: 20,
    }}>
      {/* Streak counter */}
      <div style={{
        fontFamily: FONT.mono, fontSize: 10, color: t.muted, letterSpacing: '0.1em',
        marginBottom: 16,
      }}>
        STREAK: <span style={{ color: streak > 0 ? '#3DA85A' : t.muted, fontWeight: 700 }}>{streak}</span>
      </div>

      {/* Indicator label */}
      <div style={{
        fontFamily: FONT.mono, fontSize: 9, color: t.muted, textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 6,
      }}>
        {currentRound.indicator.name}
      </div>

      <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 900, marginBottom: 20, textAlign: 'center' }}>
        Higher or lower<span style={{ color: t.red }}>?</span>
      </div>

      {/* Two country cards */}
      <div style={{
        display: 'flex', width: '100%', maxWidth: 360, gap: 12, marginBottom: 24,
        alignItems: 'stretch',
      }}>
        {/* Left: known */}
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          border: `1px solid ${t.border}`, padding: 16, textAlign: 'center',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 600, color: t.ink, marginBottom: 8 }}>
            {currentRound.left.name}
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 900, color: t.ink, lineHeight: 1 }}>
            {currentRound.left.formatted}
          </div>
        </div>

        {/* VS divider */}
        <div style={{
          display: 'flex', alignItems: 'center',
          fontFamily: FONT.mono, fontSize: 11, color: t.muted,
        }}>
          vs
        </div>

        {/* Right: hidden or revealed */}
        <div style={{
          flex: 1, borderRadius: 10, padding: 16, textAlign: 'center',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          background: isRevealing
            ? (lastCorrect ? 'rgba(61,168,90,0.1)' : 'rgba(232,56,79,0.1)')
            : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isRevealing
            ? (lastCorrect ? '#3DA85A' : t.red)
            : t.border}`,
          transition: 'all 0.3s',
        }}>
          <div style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: 600, color: t.ink, marginBottom: 8 }}>
            {currentRound.right.name}
          </div>
          {isRevealing ? (
            <div style={{
              fontFamily: FONT.display, fontSize: 28, fontWeight: 900, lineHeight: 1,
              color: lastCorrect ? '#3DA85A' : t.red,
            }}>
              {currentRound.right.formatted}
            </div>
          ) : (
            <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 900, color: t.muted, lineHeight: 1 }}>
              ?
            </div>
          )}
        </div>
      </div>

      {/* Guess buttons */}
      {!isRevealing && (
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 320 }}>
          <button type="button" onClick={() => handleGuess('higher')} style={{
            flex: 1, padding: '14px 8px', borderRadius: 10,
            border: `1.5px solid #3DA85A`, background: 'rgba(61,168,90,0.08)',
            color: '#3DA85A', fontFamily: FONT.body, fontSize: 16, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
          }}>
            ▲ Higher
          </button>
          <button type="button" onClick={() => handleGuess('lower')} style={{
            flex: 1, padding: '14px 8px', borderRadius: 10,
            border: `1.5px solid ${t.red}`, background: 'rgba(232,56,79,0.08)',
            color: t.red, fontFamily: FONT.body, fontSize: 16, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
          }}>
            ▼ Lower
          </button>
        </div>
      )}

      {/* Reveal feedback */}
      {isRevealing && (
        <div style={{
          fontFamily: FONT.body, fontSize: 18, fontWeight: 700,
          color: lastCorrect ? '#3DA85A' : t.red,
          animation: 'atlas-console-up 0.3s ease-out',
        }}>
          {lastCorrect ? 'Correct!' : 'Wrong!'}
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><HigherLowerApp /></StrictMode>,
)
