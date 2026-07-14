import { useState, useEffect } from 'react'

// SVG-Flaggen statt Emoji: Windows rendert Flaggen-Emojis nicht,
// deshalb liegen alle Flaggen als Assets unter /flags/{iso2}.svg.

let iso2MapPromise: Promise<Record<string, string>> | null = null

function getIso2Map(): Promise<Record<string, string>> {
  if (!iso2MapPromise) {
    iso2MapPromise = fetch('/data/iso2.json')
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
      .catch(() => ({}))
  }
  return iso2MapPromise
}

export function Flag({ iso3, height = 15 }: { iso3: string; height?: number }) {
  const [iso2, setIso2] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void getIso2Map().then((m) => {
      if (live) setIso2(m[iso3.toUpperCase()] ?? null)
    })
    return () => { live = false }
  }, [iso3])

  if (!iso2) return null

  return (
    <img
      src={`/flags/${iso2}.svg`}
      alt=""
      aria-hidden
      width={Math.round(height * (4 / 3))}
      height={height}
      style={{
        borderRadius: 2,
        objectFit: 'cover',
        display: 'inline-block',
        verticalAlign: 'baseline',
        boxShadow: '0 0 0 1px rgba(128,128,128,0.25)',
        flexShrink: 0,
      }}
    />
  )
}
