import './index.css'
import './atlas.css'

import { StrictMode, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { formatValue } from './formatValue'
import { getTheme, FONT } from './theme'
import { RulesOverlay, RulesButton } from './RulesOverlay'
import { ResultScreen } from './ResultScreen'
import { earnInfluence } from './earnInfluence'
import { seededRandom, dailySeed, shuffleWith, pickDistractors } from './gameKit'
import type { DistractorCandidate } from './gameKit'
import type { WorldGeoJson, IndicatorsFile, IndicatorDef } from './worldTypes'

const ROUNDS = 10
const CLUE_COUNT = 4
const REF_INDICATOR = 'NY.GDP.PCAP.CD'

type QuizQuestion = {
  iso3: string
  name: string
  clues: { name: string; value: string }[]
  options: { iso3: string; name: string }[]
}

function generateQuiz(
  indicators: IndicatorDef[],
  geojson: WorldGeoJson,
  regions: Record<string, string>,
  attempt: number,
): QuizQuestion[] {
  const rng = seededRandom(dailySeed(attempt))

  const refInd = indicators.find((i) => i.code === REF_INDICATOR)
  const refData = refInd?.data[refInd.latestYear] ?? {}

  const candidates: DistractorCandidate[] = []
  for (const f of geojson.features) {
    const iso = f.properties.iso3.toUpperCase()
    let coverage = 0
    for (const ind of indicators) {
      const yearData = ind.data[ind.latestYear]
      if (yearData?.[iso] != null) coverage++
    }
    if (coverage >= 6) {
      candidates.push({
        iso3: iso,
        name: f.properties.name,
        region: regions[iso],
        refValue: refData[iso] ?? null,
      })
    }
  }

  const picked = shuffleWith(candidates, rng).slice(0, ROUNDS)

  return picked.map((country) => {
    const available = indicators.filter((ind) => {
      const yearData = ind.data[ind.latestYear]
      return yearData?.[country.iso3] != null
    })
    const selectedInds = shuffleWith(available, rng).slice(0, CLUE_COUNT)

    const clues = selectedInds.map((ind) => {
      const yearData = ind.data[ind.latestYear]!
      const v = yearData[country.iso3]!
      return { name: ind.name, value: formatValue(v, ind.unit, ind.code) }
    })

    // Aehnliche Laender (Region + Wohlstandsniveau) als falsche Optionen
    const wrongPool = pickDistractors(country, candidates, 3, rng)

    const options = shuffleWith([
      { iso3: country.iso3, name: country.name },
      ...wrongPool.map((c) => ({ iso3: c.iso3, name: c.name })),
    ], rng)

    return { iso3: country.iso3, name: country.name, clues, options }
  })
}

function QuizApp() {
  const [indicators, setIndicators] = useState<IndicatorDef[] | null>(null)
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [regions, setRegions] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [showRules, setShowRules] = useState(true)
  const [earnedInfluence, setEarnedInfluence] = useState(0)
  const earnReported = useRef(false)
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
        setRegions(file.regions)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const questions = useMemo(() => {
    if (!indicators || !geojson) return []
    return generateQuiz(indicators, geojson, regions, attempt)
  }, [indicators, geojson, regions, attempt])

  const currentQ = questions[round] ?? null
  const isFinished = round >= questions.length && questions.length > 0
  const score = answers.filter((a) => a).length

  useEffect(() => {
    if (!isFinished || earnReported.current) return
    earnReported.current = true
    void earnInfluence('quiz', score).then((res) => {
      if (res) setEarnedInfluence(res.earned)
    })
  }, [isFinished, score])

  const handleAnswer = useCallback((iso3: string) => {
    if (showResult || !currentQ) return
    const correct = iso3 === currentQ.iso3
    setSelected(iso3)
    setShowResult(true)
    setAnswers((prev) => [...prev, correct])
  }, [showResult, currentQ])

  const handleNext = useCallback(() => {
    setRound((prev) => prev + 1)
    setSelected(null)
    setShowResult(false)
  }, [])

  const handleRestart = useCallback(() => {
    setRound(0)
    setAnswers([])
    setSelected(null)
    setShowResult(false)
    setAttempt((prev) => prev + 1)
    setEarnedInfluence(0)
    earnReported.current = false
  }, [])


  if (error) {
    return (
      <div className="atlas-root atlas-error">
        <p>Failed to load quiz data</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
      </div>
    )
  }

  if (!indicators || !geojson || questions.length === 0) {
    return (
      <div className="atlas-root atlas-loading" data-dark="true">
        <div className="atlas-spinner" />
        <span>Loading Quiz...</span>
      </div>
    )
  }

  if (isFinished) {
    const pct = Math.round((score / ROUNDS) * 100)
    const verdict = pct >= 80 ? 'Geography expert!' : pct >= 50 ? 'Well played!' : 'Keep exploring!'
    const emojiRow = answers.map((a) => a ? '🟩' : '🟥').join('')
    return (
      <ResultScreen
        title="Quiz Complete"
        score={score}
        maxScore={ROUNDS}
        verdict={verdict}
        emojiRow={emojiRow}
        shareText={`World Atlas Quiz: ${score}/${ROUNDS}\n${emojiRow}\nr/Res_Publica_DE`}
        earnedInfluence={earnedInfluence}
        onRestart={handleRestart}
      />
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#111111', color: '#E8E4DC', padding: 20,
    }}>
      <RulesButton onClick={() => setShowRules(true)} />
      {showRules && (
        <RulesOverlay
          title="Guess Country"
          rules={[
            'You are shown 4 statistics of a mystery country.',
            'Pick the correct country from 4 options.',
            '10 rounds — all players get the same questions today.',
            'Share your score at the end!',
          ]}
          onClose={() => setShowRules(false)}
        />
      )}
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, width: '100%', maxWidth: 320 }}>
        {Array.from({ length: ROUNDS }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < round
              ? (answers[i] ? '#3DA85A' : t.red)
              : i === round ? t.ink : t.border,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <div style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
        ROUND {round + 1}/{ROUNDS}
      </div>

      <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 900, marginBottom: 20, textAlign: 'center' }}>
        Which country is this<span style={{ color: t.red }}>?</span>
      </div>

      {/* Clues card */}
      <div style={{
        width: '100%', maxWidth: 320,
        background: 'rgba(255,255,255,0.03)', borderRadius: 10,
        border: `1px solid ${t.border}`, padding: '4px 16px', marginBottom: 20,
      }}>
        {currentQ!.clues.map((clue, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < currentQ!.clues.length - 1 ? `1px solid ${t.border}` : 'none',
          }}>
            <span style={{
              fontFamily: FONT.mono, fontSize: 9, color: t.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {clue.name}
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 16, fontWeight: 700, color: t.ink }}>
              {clue.value}
            </span>
          </div>
        ))}
      </div>

      {/* Answer options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 320 }}>
        {currentQ!.options.map((opt) => {
          const isCorrect = opt.iso3 === currentQ!.iso3
          const isSelected = opt.iso3 === selected

          let bg: string = 'transparent'
          let borderCol: string = t.border
          let textCol: string = t.ink

          if (showResult) {
            if (isCorrect) {
              bg = 'rgba(61,168,90,0.15)'
              borderCol = '#3DA85A'
              textCol = '#3DA85A'
            } else if (isSelected) {
              bg = 'rgba(232,56,79,0.15)'
              borderCol = t.red
              textCol = t.red
            } else {
              textCol = t.muted
            }
          }

          return (
            <button key={opt.iso3} type="button" onClick={() => handleAnswer(opt.iso3)}
              style={{
                padding: '14px 8px', borderRadius: 8, border: `1.5px solid ${borderCol}`,
                background: bg, color: textCol, fontFamily: FONT.body, fontSize: 14, fontWeight: 600,
                cursor: showResult ? 'default' : 'pointer', textAlign: 'center',
                transition: 'all 0.15s',
                minHeight: 48,
              }}>
              {opt.name}
            </button>
          )
        })}
      </div>

      {/* Result feedback + Next button */}
      {showResult && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{
            fontFamily: FONT.body, fontSize: 15, fontWeight: 600, marginBottom: 14,
            color: selected === currentQ!.iso3 ? '#3DA85A' : t.red,
          }}>
            {selected === currentQ!.iso3 ? 'Correct!' : `It was ${currentQ!.name}`}
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
  <StrictMode><QuizApp /></StrictMode>,
)
