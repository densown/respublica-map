// Gemeinsames Fundament fuer alle Spielmodi: Seeded RNG, Tages-Seed,
// Shuffle und Fragenqualitaets-Heuristiken. Neue Spiele bauen hierauf auf.

export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Gleicher Seed fuer alle Spieler am selben Tag; attempt macht
// "Play Again" zu neuen Fragen. offset trennt die Spielmodi.
export function dailySeed(attempt: number, offset = 0): number {
  const today = new Date()
  return (
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate() +
    offset +
    attempt * 99991
  )
}

export function shuffleWith<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

// ---------- Fragenqualitaet ----------

// Ein Higher-or-Lower-Paar ist spannend, wenn die Werte weder trivial
// weit auseinander noch praktisch gleich sind.
export function isGoodPair(a: number, b: number): boolean {
  const hi = Math.max(Math.abs(a), Math.abs(b))
  const lo = Math.min(Math.abs(a), Math.abs(b))
  if (hi === 0) return false
  if (a === b) return false
  const ratio = (hi - lo) / hi
  return ratio >= 0.12 && ratio <= 0.65
}

// Fuer Rank It: alle Werte im Set muessen sich paarweise klar genug
// unterscheiden, damit die Reihenfolge erspielbar ist.
export function isDistinguishableSet(values: number[], minGapRatio = 0.1): boolean {
  const sorted = [...values].map(Math.abs).sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    const hi = sorted[i]!
    const lo = sorted[i - 1]!
    if (hi === 0) return false
    if ((hi - lo) / hi < minGapRatio) return false
  }
  return true
}

// Fuer Quiz-Distraktoren: Laender, die dem Zielland aehnlich sind
// (gleiche Region, aehnliche Groessenordnung beim Referenzwert),
// sind schwerer zu unterscheiden und damit bessere falsche Optionen.
export type DistractorCandidate = {
  iso3: string
  name: string
  region: string | undefined
  refValue: number | null
}

export function pickDistractors(
  target: DistractorCandidate,
  pool: DistractorCandidate[],
  count: number,
  rng: () => number,
): DistractorCandidate[] {
  const others = pool.filter((c) => c.iso3 !== target.iso3)

  const scored = others.map((c) => {
    let score = 0
    if (target.region && c.region === target.region) score += 2
    if (target.refValue != null && c.refValue != null && target.refValue !== 0) {
      const ratio = Math.abs(c.refValue - target.refValue) / Math.abs(target.refValue)
      if (ratio < 0.5) score += 2
      else if (ratio < 2) score += 1
    }
    return { c, score, r: rng() }
  })

  // Beste Kandidaten zuerst, Gleichstand zufaellig aufloesen
  scored.sort((a, b) => b.score - a.score || a.r - b.r)

  // Aus den Top-Kandidaten zufaellig ziehen statt strikt die besten,
  // damit dieselbe Frage nicht immer dieselben Optionen hat.
  const topPool = scored.slice(0, Math.max(count * 3, 8))
  return shuffleWith(topPool, rng).slice(0, count).map((s) => s.c)
}
