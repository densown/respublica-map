import { useMemo, useState } from 'react'
import { getTheme, FONT } from './theme'
import { formatValue } from './formatValue'
import { Flag } from './Flag'
import { groupByCategory, CORE_RADAR_CODES } from './categories'
import type { IndicatorDef } from './worldTypes'

// Neu gedachter Compare-Mode: erzaehlt den Vergleich in drei Ebenen.
// 1. Biggest Gaps: wo unterscheiden sich die Laender am staerksten
// 2. Duell-Balken: alle Indikatoren scanbar, nach Kategorie gruppiert
// 3. Trend-Race: beide Zeitreihen uebereinander

type Country = { iso3: string; name: string }

type Duel = {
  ind: IndicatorDef
  valueA: number | null
  valueB: number | null
  pctA: number | null
  pctB: number | null
  gap: number
}

function percentileOf(v: number, sorted: number[]): number {
  if (sorted.length <= 1) return 0.5
  let lo = 0, hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid]! < v) lo = mid + 1
    else hi = mid
  }
  return lo / (sorted.length - 1)
}

function buildDuels(indicators: IndicatorDef[], a: Country, b: Country, year: number): Duel[] {
  return indicators.map((ind) => {
    const yearData = ind.data[year] ?? ind.data[ind.latestYear] ?? {}
    const sorted = Object.values(yearData)
      .filter((v): v is number => v != null && !Number.isNaN(v))
      .sort((x, y) => x - y)
    const va = yearData[a.iso3] ?? null
    const vb = yearData[b.iso3] ?? null
    const pa = va != null ? percentileOf(va, sorted) : null
    const pb = vb != null ? percentileOf(vb, sorted) : null
    const gap = pa != null && pb != null ? Math.abs(pa - pb) : -1
    return { ind, valueA: va, valueB: vb, pctA: pa, pctB: pb, gap }
  })
}

function ratioLabel(va: number, vb: number): string | null {
  const lo = Math.min(Math.abs(va), Math.abs(vb))
  const hi = Math.max(Math.abs(va), Math.abs(vb))
  if (lo <= 0 || va * vb < 0) return null
  const ratio = hi / lo
  if (ratio < 1.15) return null
  if (ratio >= 100) return `${Math.round(ratio)}x`
  return `${ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}x`
}

// ---------- Biggest Gaps ----------

function GapCards({ duels, a, b, colorA, colorB, dark }: {
  duels: Duel[]; a: Country; b: Country; colorA: string; colorB: string; dark: boolean
}) {
  const t = getTheme(dark)
  const top = duels.filter((d) => d.gap >= 0).sort((x, y) => y.gap - x.gap).slice(0, 3)
  if (top.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: t.muted,
      }}>
        Biggest differences
      </div>
      {top.map((d) => {
        const aHigher = (d.valueA ?? 0) >= (d.valueB ?? 0)
        const ratio = d.valueA != null && d.valueB != null ? ratioLabel(d.valueA, d.valueB) : null
        return (
          <div key={d.ind.code} style={{
            padding: '10px 12px', borderRadius: 10, border: `1px solid ${t.border}`,
            background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 700, color: t.ink }}>
                {d.ind.name}
              </span>
              {ratio && (
                <span style={{
                  fontFamily: FONT.mono, fontSize: 11, fontWeight: 700,
                  color: aHigher ? colorA : colorB,
                  padding: '2px 8px', borderRadius: 10,
                  background: `${aHigher ? colorA : colorB}1A`,
                }}>
                  {ratio}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 900, color: colorA }}>
                {d.valueA != null ? formatValue(d.valueA, d.ind.unit, d.ind.code) : '—'}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, color: t.muted }}>
                {a.iso3} vs {b.iso3}
              </span>
              <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 900, color: colorB }}>
                {d.valueB != null ? formatValue(d.valueB, d.ind.unit, d.ind.code) : '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Duell-Balken ----------

function DuelBar({ duel, colorA, colorB, dark }: {
  duel: Duel; colorA: string; colorB: string; dark: boolean
}) {
  const t = getTheme(dark)
  const { pctA, pctB } = duel
  // Balkenlaenge = Percentil-Differenz, Richtung = wer hoeher liegt
  const diff = pctA != null && pctB != null ? pctA - pctB : 0
  const width = Math.min(50, Math.abs(diff) * 50 + (diff !== 0 ? 4 : 0))
  const aSide = diff >= 0

  return (
    <div style={{ padding: '7px 0', borderBottom: `1px solid ${t.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted }}>
          {duel.valueA != null ? formatValue(duel.valueA, duel.ind.unit, duel.ind.code) : '—'}
        </span>
        <span style={{
          fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color: t.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 8px', textAlign: 'center', flex: 1, minWidth: 0,
        }}>
          {duel.ind.name}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted }}>
          {duel.valueB != null ? formatValue(duel.valueB, duel.ind.unit, duel.ind.code) : '—'}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: dark ? '#242424' : '#EDE8DF' }}>
        <div style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: 1, background: t.border }} />
        {duel.gap >= 0 && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            borderRadius: 3,
            background: aSide ? colorA : colorB,
            left: aSide ? `${50 - width}%` : '50%',
            width: `${width}%`,
            transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }} />
        )}
      </div>
    </div>
  )
}

function DuelSection({ label, color, duels, colorA, colorB, dark, defaultOpen }: {
  label: string; color: string; duels: Duel[]
  colorA: string; colorB: string; dark: boolean; defaultOpen: boolean
}) {
  const t = getTheme(dark)
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 4 }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '9px 0', border: 'none', background: 'transparent', cursor: 'pointer',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
        <span style={{
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: t.ink, fontWeight: 700, flex: 1, textAlign: 'left',
        }}>
          {label}
        </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 10, color: t.muted }}>
          {duels.length} · {open ? '−' : '+'}
        </span>
      </button>
      {open && duels.map((d) => (
        <DuelBar key={d.ind.code} duel={d} colorA={colorA} colorB={colorB} dark={dark} />
      ))}
    </div>
  )
}

// ---------- 8-Achsen-Radar ----------

function CoreRadar({ a, b, indicators, year, colorA, colorB, dark }: {
  a: Country; b: Country; indicators: IndicatorDef[]; year: number
  colorA: string; colorB: string; dark: boolean
}) {
  const t = getTheme(dark)
  const core = useMemo(
    () => CORE_RADAR_CODES
      .map((code) => indicators.find((i) => i.code === code))
      .filter((i): i is IndicatorDef => i != null),
    [indicators],
  )

  const size = 250
  const cx = size / 2, cy = size / 2 + 2
  const r = 76
  const n = core.length

  const ranges = useMemo(() => core.map((ind) => {
    const allVals: number[] = []
    for (const yd of Object.values(ind.data)) {
      for (const v of Object.values(yd)) {
        if (v != null && !Number.isNaN(v)) allVals.push(v as number)
      }
    }
    return { min: Math.min(...allVals), max: Math.max(...allVals) }
  }), [core])

  if (n < 3) return null

  const angles = core.map((_, i) => (i * 2 * Math.PI / n) - Math.PI / 2)

  const normalized = [a, b].map((country) =>
    core.map((ind, ii) => {
      const yearData = ind.data[year] ?? ind.data[ind.latestYear]
      const v = yearData?.[country.iso3]
      if (v == null) return 0.05
      const { min, max } = ranges[ii]!
      // Log-Skala fuer log-Indikatoren, sonst versinken kleine Laender im Zentrum
      if (ind.scale === 'log' && min > 0 && v > 0) {
        return Math.max(0.05, (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min) || 1))
      }
      return Math.max(0.05, (v - min) / (max - min || 1))
    })
  )

  const colors = [colorA, colorB]

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon key={level}
          points={angles.map((ang) => `${cx + Math.cos(ang) * r * level},${cy + Math.sin(ang) * r * level}`).join(' ')}
          fill="none" stroke={t.border} strokeWidth={0.5} />
      ))}
      {angles.map((ang, i) => (
        <line key={i} x1={cx} y1={cy}
          x2={cx + Math.cos(ang) * r} y2={cy + Math.sin(ang) * r}
          stroke={t.border} strokeWidth={0.5} />
      ))}
      {normalized.map((vals, ci) => (
        <polygon key={ci}
          points={vals.map((v, i) => `${cx + Math.cos(angles[i]!) * r * v},${cy + Math.sin(angles[i]!) * r * v}`).join(' ')}
          fill={colors[ci]} fillOpacity={0.14}
          stroke={colors[ci]} strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      {core.map((ind, i) => {
        const labelR = r + 20
        const x = cx + Math.cos(angles[i]!) * labelR
        const y = cy + Math.sin(angles[i]!) * labelR
        const cosA = Math.cos(angles[i]!)
        const anchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle'
        const short: Record<string, string> = {
          'NY.GDP.PCAP.CD': 'GDP',
          'SP.DYN.LE00.IN': 'Life exp.',
          'SP.URB.TOTL.IN.ZS': 'Urban',
          'v2x_libdem': 'Democracy',
          'IT.NET.USER.ZS': 'Internet',
          'EN.ATM.CO2E.PC': 'CO2',
          'MS.MIL.XPND.GD.ZS': 'Military',
          'ST.INT.ARVL': 'Tourism',
        }
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
            fill={t.muted} fontSize={9} fontFamily={FONT.mono}>
            {short[ind.code] ?? ind.name.slice(0, 10)}
          </text>
        )
      })}
    </svg>
  )
}

// ---------- Trend-Race ----------

function TrendRace({ a, b, indicators, colorA, colorB, dark }: {
  a: Country; b: Country; indicators: IndicatorDef[]
  colorA: string; colorB: string; dark: boolean
}) {
  const t = getTheme(dark)
  const [code, setCode] = useState('NY.GDP.PCAP.CD')
  const ind = indicators.find((i) => i.code === code) ?? indicators[0]
  if (!ind) return null

  const series = [a, b].map((country) => {
    const points: { year: number; value: number }[] = []
    for (const y of ind.years) {
      const v = ind.data[y]?.[country.iso3]
      if (v != null && !Number.isNaN(v)) points.push({ year: y, value: v })
    }
    return points
  })

  const all = series.flat()
  if (all.length < 4) return null
  const minY = Math.min(...all.map((p) => p.value))
  const maxY = Math.max(...all.map((p) => p.value))
  const minX = Math.min(...all.map((p) => p.year))
  const maxX = Math.max(...all.map((p) => p.year))
  const w = 300, h = 110, pad = 8

  const toX = (yr: number) => pad + ((yr - minX) / (maxX - minX || 1)) * (w - 2 * pad)
  const toY = (v: number) => pad + (1 - (v - minY) / (maxY - minY || 1)) * (h - 2 * pad)

  const colors = [colorA, colorB]

  // Auswahl auf gut abgedeckte, spannende Indikatoren begrenzen
  const options = indicators.filter((i) =>
    ['NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN', 'EN.ATM.CO2E.PC', 'IT.NET.USER.ZS', 'v2x_libdem',
      'SP.DYN.TFRT.IN', 'MS.MIL.XPND.GD.ZS', 'SP.URB.TOTL.IN.ZS'].includes(i.code))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: t.muted,
        }}>
          Trend race
        </span>
        <select value={code} onChange={(e) => setCode(e.target.value)} style={{
          fontFamily: FONT.mono, fontSize: 10, color: t.ink,
          background: dark ? '#222' : '#F5F0E8', border: `1px solid ${t.border}`,
          borderRadius: 5, padding: '3px 6px', maxWidth: 150,
        }}>
          {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
        </select>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        {series.map((points, si) => points.length >= 2 && (
          <polyline key={si}
            points={points.map((p) => `${toX(p.year)},${toY(p.value)}`).join(' ')}
            fill="none" stroke={colors[si]} strokeWidth={1.8} strokeLinejoin="round" />
        ))}
        {series.map((points, si) => {
          const last = points[points.length - 1]
          return last ? (
            <circle key={si} cx={toX(last.year)} cy={toY(last.value)} r={3} fill={colors[si]} />
          ) : null
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 9, color: t.muted }}>
        <span>{minX}</span>
        <span>{maxX}</span>
      </div>
    </div>
  )
}

// ---------- Hauptansicht ----------

export type CompareViewProps = {
  a: Country
  b: Country
  indicators: IndicatorDef[]
  year: number
  dark: boolean
  onChangeCountry: () => void
}

export function CompareView({ a, b, indicators, year, dark, onChangeCountry }: CompareViewProps) {
  const t = getTheme(dark)
  const colorA = t.red
  const colorB = dark ? '#3DA85A' : '#2D7D46'

  const duels = useMemo(() => buildDuels(indicators, a, b, year), [indicators, a, b, year])
  const groups = useMemo(() => {
    const byCode = new Map(duels.map((d) => [d.ind.code, d]))
    return groupByCategory(indicators).map((g) => ({
      meta: g.meta,
      duels: g.items.map((i) => byCode.get(i.code)!).filter((d) => d.valueA != null || d.valueB != null),
    })).filter((g) => g.duels.length > 0)
  }, [duels, indicators])

  const topGapCodes = useMemo(() => new Set(
    duels.filter((d) => d.gap >= 0).sort((x, y) => y.gap - x.gap).slice(0, 3).map((d) => d.ind.code),
  ), [duels])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* VS-Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Flag iso3={a.iso3} height={13} />
          <span style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 17, color: colorA }}>
            {a.name}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: t.muted }}>vs</span>
          <Flag iso3={b.iso3} height={13} />
          <span style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 17, color: colorB }}>
            {b.name}
          </span>
        </div>
        <button type="button" onClick={onChangeCountry} style={{
          border: `1px solid ${t.border}`, background: 'transparent', color: t.muted,
          cursor: 'pointer', fontFamily: FONT.mono, fontSize: 10, padding: '4px 10px', borderRadius: 12,
          flexShrink: 0,
        }}>
          Change
        </button>
      </div>

      <GapCards duels={duels} a={a} b={b} colorA={colorA} colorB={colorB} dark={dark} />

      <CoreRadar a={a} b={b} indicators={indicators} year={year}
        colorA={colorA} colorB={colorB} dark={dark} />

      <TrendRace a={a} b={b} indicators={indicators}
        colorA={colorA} colorB={colorB} dark={dark} />

      {/* Alle Indikatoren als Duell-Balken */}
      <div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: t.muted, marginBottom: 4,
        }}>
          All indicators
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: colorA }}>◀ {a.name} higher</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: colorB }}>{b.name} higher ▶</span>
        </div>
        {groups.map((g) => (
          <DuelSection
            key={g.meta.id}
            label={g.meta.label}
            color={g.meta.color}
            duels={g.duels}
            colorA={colorA}
            colorB={colorB}
            dark={dark}
            defaultOpen={g.duels.some((d) => topGapCodes.has(d.ind.code))}
          />
        ))}
      </div>
    </div>
  )
}
