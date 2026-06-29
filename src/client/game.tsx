import './index.css'
import './atlas.css'

import { StrictMode, useCallback, useEffect, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { WorldGlobe } from './WorldGlobe'
import { Legend } from './Legend'
import { IndicatorPicker } from './IndicatorPicker'
import { CountryConsole } from './CountryConsole'
import { formatValue } from './formatValue'
import type { WorldGeoJson, IndicatorsFile, IndicatorDef, MapRow } from './worldTypes'

function useDarkMode(): boolean {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    if (document.documentElement.classList.contains('dark')) return true
    if (document.documentElement.getAttribute('data-theme') === 'dark') return true
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)

    const observer = new MutationObserver(() => {
      const el = document.documentElement
      if (el.classList.contains('dark') || el.getAttribute('data-theme') === 'dark') {
        setDark(true)
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })

    return () => {
      mq.removeEventListener('change', handler)
      observer.disconnect()
    }
  }, [])

  return dark
}

function indicatorToRows(ind: IndicatorDef, geojson: WorldGeoJson): MapRow[] {
  return geojson.features.map((f) => {
    const iso = f.properties.iso3.toUpperCase()
    const val = ind.data[iso] ?? null
    return {
      country_code: iso,
      country_name: f.properties.name,
      value: val,
      region: null,
    }
  })
}

function Atlas() {
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [indicators, setIndicators] = useState<IndicatorDef[] | null>(null)
  const [selectedCode, setSelectedCode] = useState('NY.GDP.PCAP.CD')
  const [selectedCountry, setSelectedCountry] = useState<{ iso3: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dark = useDarkMode()

  useEffect(() => {
    void Promise.all([
      fetch('/data/world.geojson').then((r) => {
        if (!r.ok) throw new Error(`GeoJSON: ${r.status}`)
        return r.json()
      }),
      fetch('/data/indicators.json').then((r) => {
        if (!r.ok) throw new Error(`Indicators: ${r.status}`)
        return r.json()
      }),
    ])
      .then(([gj, ind]) => {
        setGeojson(gj as WorldGeoJson)
        setIndicators((ind as IndicatorsFile).indicators)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const activeIndicator = useMemo(
    () => indicators?.find((i) => i.code === selectedCode) ?? indicators?.[0] ?? null,
    [indicators, selectedCode],
  )

  const rows = useMemo(
    () => (activeIndicator && geojson ? indicatorToRows(activeIndicator, geojson) : []),
    [activeIndicator, geojson],
  )

  const { vMin, vMax } = useMemo(() => {
    const vals = Object.values(activeIndicator?.data ?? {}).filter(
      (v): v is number => v != null && !Number.isNaN(v),
    )
    if (!vals.length) return { vMin: 0, vMax: 1 }
    return { vMin: Math.min(...vals), vMax: Math.max(...vals) }
  }, [activeIndicator])

  const unit = activeIndicator?.unit ?? ''
  const code = activeIndicator?.code ?? ''
  const fmt = useCallback(
    (v: number) => (unit ? formatValue(v, unit, code) : String(v)),
    [unit, code],
  )

  const handleCountryClick = useCallback((iso3: string, name: string) => {
    setSelectedCountry((prev) => (prev?.iso3 === iso3 ? null : { iso3, name }))
  }, [])

  if (error) {
    return (
      <div className="atlas-root atlas-error">
        <p>Failed to load data</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
      </div>
    )
  }

  if (!indicators || !geojson) {
    return (
      <div className="atlas-root atlas-loading" data-dark={dark}>
        <div className="atlas-spinner" />
        <span>Loading World Atlas...</span>
      </div>
    )
  }

  return (
    <div className="atlas-root" data-dark={dark}>
      <div className="atlas-header">
        <div className="atlas-brand">
          <span className="atlas-brand-name">World Atlas</span>
          <span className="atlas-brand-by">by Res.Publica</span>
        </div>
      </div>

      <WorldGlobe
        geojson={geojson}
        data={rows}
        category={activeIndicator?.category ?? 'economy'}
        vMin={vMin}
        vMax={vMax}
        unit={unit}
        indicatorName={activeIndicator?.name ?? ''}
        formatValue={fmt}
        dark={dark}
        onCountryClick={handleCountryClick}
      />

      <IndicatorPicker
        indicators={indicators}
        selected={selectedCode}
        onSelect={setSelectedCode}
        dark={dark}
      />

      {activeIndicator && (
        <Legend
          category={activeIndicator.category}
          vMin={vMin}
          vMax={vMax}
          indicatorName={activeIndicator.name}
          year={activeIndicator.year}
          formatValue={fmt}
          dark={dark}
        />
      )}

      {selectedCountry && (
        <CountryConsole
          iso3={selectedCountry.iso3}
          countryName={selectedCountry.name}
          data={rows}
          indicators={indicators}
          selectedCode={selectedCode}
          formatValue={fmt}
          dark={dark}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Atlas />
  </StrictMode>,
)
