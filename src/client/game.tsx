import './index.css'
import './atlas.css'

import { StrictMode, useCallback, useEffect, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { WorldGlobe } from './WorldGlobe'
import { Legend } from './Legend'
import { formatValue } from './formatValue'
import type { WorldGeoJson, SnapshotFile, MapRow } from './worldTypes'

function Atlas() {
  const [geojson, setGeojson] = useState<WorldGeoJson | null>(null)
  const [snapshot, setSnapshot] = useState<SnapshotFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

  useEffect(() => {
    void Promise.all([
      fetch('/data/world.geojson').then((r) => {
        if (!r.ok) throw new Error(`GeoJSON: ${r.status}`)
        return r.json()
      }),
      fetch('/data/snapshot-gdp.json').then((r) => {
        if (!r.ok) throw new Error(`Snapshot: ${r.status}`)
        return r.json()
      }),
    ])
      .then(([gj, snap]) => {
        setGeojson(gj as WorldGeoJson)
        setSnapshot(snap as SnapshotFile)
      })
      .catch((e) => setError(String(e)))
  }, [])

  const { vMin, vMax } = useMemo(() => {
    if (!snapshot) return { vMin: 0, vMax: 1 }
    const vals = snapshot.data
      .map((r: MapRow) => r.value)
      .filter((v): v is number => v != null && !Number.isNaN(v))
    return {
      vMin: Math.min(...vals),
      vMax: Math.max(...vals),
    }
  }, [snapshot])

  const snapshotUnit = snapshot?.unit ?? ''
  const snapshotIndicator = snapshot?.indicator ?? ''
  const fmt = useCallback(
    (v: number) => snapshotUnit ? formatValue(v, snapshotUnit, snapshotIndicator) : String(v),
    [snapshotUnit, snapshotIndicator],
  )

  if (error) {
    return (
      <div className="atlas-root atlas-error">
        <p>Failed to load data</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
      </div>
    )
  }

  if (!snapshot || !geojson) {
    return (
      <div className="atlas-root atlas-loading">
        <div className="atlas-spinner" />
        <span>Loading World Atlas...</span>
      </div>
    )
  }

  return (
    <div className="atlas-root">
      <WorldGlobe
        geojson={geojson}
        data={snapshot.data}
        category={snapshot.category}
        vMin={vMin}
        vMax={vMax}
        unit={snapshot.unit}
        indicatorName={snapshot.name}
        formatValue={fmt}
      />
      <Legend
        category={snapshot.category}
        vMin={vMin}
        vMax={vMax}
        indicatorName={snapshot.name}
        year={snapshot.year}
        formatValue={fmt}
        dark={dark}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Atlas />
  </StrictMode>,
)
