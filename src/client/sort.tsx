import './index.css'
import './atlas.css'

import { StrictMode, useState, useEffect, useMemo, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { formatValue } from './formatValue'
import { getTheme, FONT } from './theme'
import type { WorldGeoJson, IndicatorsFile, IndicatorDef } from './worldTypes'

const ROUNDS = 10
const ITEMS_PER_ROUND = 4

type SortCountry = {
  iso3: string
  name: string
  value: number
  formatted: string
}

type SortRound = {
  indicator: IndicatorDef
  countries: SortCountry[]
  correctOrder: string[]
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function shuffleWith<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

function generateRounds(
  indicators: IndicatorDef[],
  geojson: WorldGeoJson,
): SortRound[] {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate() + 7777
  const rng = seededRandom(seed)

  const usableIndicators = indicators.filter((ind) => {
    const yearData = ind.data[ind.latestYear]
    if (!yearData) return false
    let count = 0
    for (const f of geojson.features) {
      const iso = f.properties.iso3.toUpperCase()
      if (yearData[iso] != null) count++
    }
    return count >= 20
  })

  const pickedInds = shuffleWith(usableIndicators, rng).slice(0, ROUNDS)

  return pickedInds.map((ind) => {
    const yearData = ind.data[ind.latestYear]!
    const entries: SortCountry[] = []
    for (const f of geojson.features) {
      const iso = f.properties.iso3.toUpperCase()
      const v = yearData[iso]
      if (v != null && !Number.isNaN(v)) {
        entries.push({
          iso3: iso,
          name: f.properties.name,
          value: v,
          formatted: formatValue(v, ind.unit, ind.code),
        })
      }
    }

    const picked = shuffleWith(entries, rng).slice(0, ITEMS_PER_ROUND * 3)
    picked.sort((a, b) => b.value - a.value)

    const spaced: SortCountry[] = []
    const step = Math.max(1, Math.floor(picked.length / ITEMS_PER_ROUND))
    for (let i = 0; i < ITEMS_PER_ROUND && i * step < picked.length; i++) {
      spaced.push(picked[i * step]!)
    }
    while (spaced.length < ITEMS_PER_ROUND && picked.length >= ITEMS_PER_ROUND) {
      const fallback = picked.find((p) => !spaced.includes(p))
      if (fallback) spaced.push(fallback)
      else break
    }

    const correctOrder = [...spaced].sort((a, b) => b.value - a.value).map((c) => c.iso3)
    const countries = shuffleWith(spaced, rng)

    return { indicator: ind, countries, correctOrder }
  })
}

function SortApp() {
  const [indicators, setIndicators] = useState<IndicatorDef[] | null>(null)
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [roundScores, setRoundScores] = useState<number[]>([])
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

  const rounds = useMemo(() => {
    if (!indicators || !geojson) return []
    return generateRounds(indicators, geojson)
  }, [indicators, geojson])

  const currentRound = rounds[round] ?? null
  const isFinished = round >= rounds.length && rounds.length > 0
  const totalScore = roundScores.reduce((a, b) => a + b, 0)
  const maxScore = ROUNDS * ITEMS_PER_ROUND

  const handlePick = useCallback((iso3: string) => {
    if (showResult || !currentRound) return

    if (picks.includes(iso3)) {
      setPicks(picks.filter((p) => p !== iso3))
      return
    }

    const newPicks = [...picks, iso3]
    setPicks(newPicks)

    if (newPicks.length === ITEMS_PER_ROUND) {
      let score = 0
      for (let i = 0; i < ITEMS_PER_ROUND; i++) {
        if (newPicks[i] === currentRound.correctOrder[i]) score++
      }
      setRoundScores((prev) => [...prev, score])
      setShowResult(true)
    }
  }, [showResult, currentRound, picks])

  const handleNext = useCallback(() => {
    setRound((prev) => prev + 1)
    setPicks([])
    setShowResult(false)
  }, [])

  const handleRestart = useCallback(() => {
    setRound(0)
    setPicks([])
    setShowResult(false)
    setRoundScores([])
  }, [])

  const handleShare = useCallback(() => {
    const blocks = roundScores.map((s) => {
      if (s === ITEMS_PER_ROUND) return '🟩'
      if (s >= ITEMS_PER_ROUND - 1) return '🟨'
      return '🟥'
    }).join('')
    const text = `Rank It: ${totalScore}/${maxScore}\n${blocks}\nWorld Atlas by r/Res_Publica_DE`
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [roundScores, totalScore, maxScore])

  if (error) {
    return (
      <div className="atlas-root atlas-error">
        <p>Failed to load data</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
      </div>
    )
  }

  if (!indicators || !geojson || rounds.length === 0) {
    return (
      <div className="atlas-root atlas-loading" data-dark="true">
        <div className="atlas-spinner" />
        <span>Loading...</span>
      </div>
    )
  }

  if (isFinished) {
    const pct = Math.round((totalScore / maxScore) * 100)
    const verdict = pct >= 80 ? 'Ranking master!' : pct >= 50 ? 'Solid knowledge!' : 'Keep exploring!'
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#111111', color: '#E8E4DC', padding: 24, gap: 16,
      }}>
        <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 900 }}>
          Rank Complete<span style={{ color: t.red }}>.</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 56, fontWeight: 900, color: t.red, lineHeight: 1 }}>
          {totalScore}/{maxScore}
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 14, color: t.muted }}>
          {verdict}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, letterSpacing: 3, margin: '8px 0' }}>
          {roundScores.map((s, i) => (
            <span key={i}>{s === ITEMS_PER_ROUND ? '🟩' : s >= ITEMS_PER_ROUND - 1 ? '🟨' : '🟥'}</span>
          ))}
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#111111', color: '#E8E4DC', padding: 20,
    }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, width: '100%', maxWidth: 320 }}>
        {Array.from({ length: ROUNDS }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < round
              ? (roundScores[i] === ITEMS_PER_ROUND ? '#3DA85A' : roundScores[i]! >= ITEMS_PER_ROUND - 1 ? '#D4A843' : t.red)
              : i === round ? t.ink : t.border,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <div style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted, letterSpacing: '0.1em', marginBottom: 8 }}>
        ROUND {round + 1}/{ROUNDS}
      </div>

      <div style={{
        fontFamily: FONT.mono, fontSize: 9, color: t.muted, textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 6,
      }}>
        {currentRound!.indicator.name}
      </div>

      <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 900, marginBottom: 6, textAlign: 'center' }}>
        Rank highest to lowest<span style={{ color: t.red }}>.</span>
      </div>

      <div style={{
        fontFamily: FONT.mono, fontSize: 10, color: t.muted, marginBottom: 16,
      }}>
        {picks.length < ITEMS_PER_ROUND
          ? `Tap #${picks.length + 1} of ${ITEMS_PER_ROUND}`
          : 'Done!'}
      </div>

      {/* Country buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
        {currentRound!.countries.map((country) => {
          const pickIndex = picks.indexOf(country.iso3)
          const isPicked = pickIndex !== -1
          const correctIndex = currentRound!.correctOrder.indexOf(country.iso3)

          let bg = 'transparent'
          let borderCol = t.border
          let textCol = t.ink
          let badge = ''

          if (showResult) {
            const isCorrectPosition = pickIndex === correctIndex
            if (isCorrectPosition) {
              bg = 'rgba(61,168,90,0.12)'
              borderCol = '#3DA85A'
              textCol = '#3DA85A'
            } else {
              bg = 'rgba(232,56,79,0.08)'
              borderCol = t.red
              textCol = t.red
            }
            badge = country.formatted
          } else if (isPicked) {
            bg = 'rgba(232,56,79,0.08)'
            borderCol = t.red
            textCol = t.ink
          }

          return (
            <button
              key={country.iso3}
              type="button"
              onClick={() => handlePick(country.iso3)}
              disabled={showResult}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10,
                border: `1.5px solid ${borderCol}`,
                background: bg, color: textCol,
                fontFamily: FONT.body, fontSize: 15, fontWeight: 600,
                cursor: showResult ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isPicked && (
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 11, fontWeight: 700,
                    color: showResult
                      ? (pickIndex === correctIndex ? '#3DA85A' : t.red)
                      : t.red,
                    minWidth: 18,
                  }}>
                    {pickIndex + 1}.
                  </span>
                )}
                {!isPicked && <span style={{ minWidth: 18 }} />}
                {country.name}
              </span>
              {showResult && (
                <span style={{
                  fontFamily: FONT.mono, fontSize: 12, fontWeight: 700,
                  color: pickIndex === correctIndex ? '#3DA85A' : t.red,
                }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Result + Next */}
      {showResult && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{
            fontFamily: FONT.body, fontSize: 15, fontWeight: 600, marginBottom: 14,
            color: roundScores[round] === ITEMS_PER_ROUND
              ? '#3DA85A'
              : roundScores[round]! >= ITEMS_PER_ROUND - 1
                ? '#D4A843'
                : t.red,
          }}>
            {roundScores[round] === ITEMS_PER_ROUND
              ? 'Perfect!'
              : `${roundScores[round]}/${ITEMS_PER_ROUND} correct`}
          </div>
          <button type="button" onClick={handleNext} style={{
            padding: '10px 28px', borderRadius: 20, border: 'none', background: t.red,
            color: '#fff', fontFamily: FONT.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {round + 1 < ROUNDS ? 'Next' : 'See Results'}
          </button>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><SortApp /></StrictMode>,
)
