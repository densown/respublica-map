import { ISO2 } from './iso2Map'

// SVG-Flaggen statt Emoji: Windows rendert Flaggen-Emojis nicht,
// deshalb liegen alle Flaggen als Assets unter /flags/{iso2}.svg.
// Die ISO-Zuordnung steckt im Bundle, es laedt nur noch das SVG selbst.

export function Flag({ iso3, height = 15 }: { iso3: string; height?: number }) {
  const iso2 = ISO2[iso3.toUpperCase()]
  const width = Math.round(height * (4 / 3))

  if (!iso2) return <span style={{ width, height, display: 'inline-block', flexShrink: 0 }} />

  return (
    <img
      src={`/flags/${iso2}.svg`}
      alt=""
      aria-hidden
      decoding="async"
      width={width}
      height={height}
      style={{
        borderRadius: 2,
        objectFit: 'cover',
        display: 'inline-block',
        verticalAlign: 'baseline',
        boxShadow: '0 0 0 1px rgba(128,128,128,0.25)',
        flexShrink: 0,
        // Platz ist immer reserviert, nichts springt beim Laden
        background: 'rgba(128,128,128,0.12)',
      }}
    />
  )
}
