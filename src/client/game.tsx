import './index.css'
import './atlas.css'

import { StrictMode, useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { WorldGlobe } from './WorldGlobe'
import type { WorldGlobeHandle } from './WorldGlobe'
import { Legend } from './Legend'
import { IndicatorPicker } from './IndicatorPicker'
import { CountryConsole } from './CountryConsole'
import { YearSlider } from './YearSlider'
import { SearchBar } from './SearchBar'
import { ShareButton } from './ShareButton'
import { formatValue } from './formatValue'
import { FONT } from './theme'
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
      if (el.classList.contains('dark') || el.getAttribute('data-theme') === 'dark') setDark(true)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => { mq.removeEventListener('change', handler); observer.disconnect() }
  }, [])

  return dark
}

function indicatorToRows(ind: IndicatorDef, year: number, geojson: WorldGeoJson): MapRow[] {
  const yearData = ind.data[year] ?? ind.data[ind.latestYear] ?? {}
  return geojson.features.map((f) => {
    const iso = f.properties.iso3.toUpperCase()
    return { country_code: iso, country_name: f.properties.name, value: yearData[iso] ?? null, region: null }
  })
}

function Atlas() {
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [indicators, setIndicators] = useState<IndicatorDef[] | null>(null)
  const [regions, setRegions] = useState<Record<string, string>>({})
  const [selectedCode, setSelectedCode] = useState('NY.GDP.PCAP.CD')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<{ iso3: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dark = useDarkMode()
  const globeRef = useRef<WorldGlobeHandle>(null)

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

  const activeIndicator = useMemo(
    () => indicators?.find((i) => i.code === selectedCode) ?? indicators?.[0] ?? null,
    [indicators, selectedCode],
  )

  const availableYears = useMemo(() => activeIndicator?.years ?? [], [activeIndicator])

  const activeYear = selectedYear != null && availableYears.includes(selectedYear)
    ? selectedYear : activeIndicator?.latestYear ?? 2023

  const rows = useMemo(
    () => (activeIndicator && geojson ? indicatorToRows(activeIndicator, activeYear, geojson) : []),
    [activeIndicator, activeYear, geojson],
  )

  const { vMin, vMax } = useMemo(() => {
    if (!activeIndicator) return { vMin: 0, vMax: 1 }
    const allVals: number[] = []
    for (const y of activeIndicator.years) {
      const yearData = activeIndicator.data[y] ?? {}
      for (const v of Object.values(yearData)) {
        if (v != null && !Number.isNaN(v)) allVals.push(v)
      }
    }
    if (!allVals.length) return { vMin: 0, vMax: 1 }
    return { vMin: Math.min(...allVals), vMax: Math.max(...allVals) }
  }, [activeIndicator])

  const unit = activeIndicator?.unit ?? ''
  const code = activeIndicator?.code ?? ''
  const fmt = useCallback((v: number) => (unit ? formatValue(v, unit, code) : String(v)), [unit, code])

  const handleCountryClick = useCallback((iso3: string, name: string) => {
    setSelectedCountry((prev) => (prev?.iso3 === iso3 ? null : { iso3, name }))
  }, [])

  const handleSearchSelect = useCallback((iso3: string, name: string, lng: number, lat: number) => {
    setSelectedCountry({ iso3, name })
    globeRef.current?.flyTo(lng, lat)
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
          <span className="atlas-brand-link" role="button" tabIndex={0} title="r/Res_Publica_DE"
            onClick={() => { void navigator.clipboard.writeText('https://www.reddit.com/r/Res_Publica_DE/') }}>
            <span className="atlas-brand-name">World Atlas</span>
            <span className="atlas-brand-by" style={{ fontFamily: FONT.mono }}>by r/Res_Publica_DE</span>
          </span>
        </div>
      </div>

      <WorldGlobe ref={globeRef} geojson={geojson} data={rows}
        category={activeIndicator?.category ?? 'economy'} vMin={vMin} vMax={vMax}
        unit={unit} indicatorName={activeIndicator?.name ?? ''}
        scaleType={activeIndicator?.scale ?? 'linear'} formatValue={fmt}
        dark={dark} onCountryClick={handleCountryClick} />

      <IndicatorPicker indicators={indicators} selected={selectedCode} onSelect={setSelectedCode} dark={dark} />
      <SearchBar geojson={geojson} dark={dark} onSelect={handleSearchSelect} />
      <ShareButton indicatorName={activeIndicator?.name ?? ''} year={activeYear}
        countryName={selectedCountry?.name ?? null} dark={dark} />

      {availableYears.length > 1 && (
        <YearSlider years={availableYears} selected={activeYear} onChange={setSelectedYear} dark={dark} />
      )}

      {activeIndicator && (
        <Legend category={activeIndicator.category} vMin={vMin} vMax={vMax}
          indicatorName={activeIndicator.name} year={activeYear} formatValue={fmt} dark={dark} />
      )}

      {selectedCountry && (
        <CountryConsole iso3={selectedCountry.iso3} countryName={selectedCountry.name}
          data={rows} indicators={indicators} selectedCode={selectedCode} selectedYear={activeYear}
          regions={regions} dark={dark} onClose={() => setSelectedCountry(null)} />
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Atlas /></StrictMode>,
)
