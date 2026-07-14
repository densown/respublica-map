import { useEffect, useRef, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { REGIONS, REGION_BY_COUNTRY, FACTION_BY_ID } from '../shared/world'
import type { RegionState } from '../shared/world'
import type { WorldGeoJson } from './worldTypes'

const NEUTRAL = '#232323'
const WATER = '#0A0A0A'

function normIso(s: string): string {
  return s.trim().toUpperCase()
}

// Farbe pro Region: Controller-Farbe, Deckkraft nach Dominanz.
// Umkaempfte Regionen wirken blasser, klar kontrollierte satter.
function regionColor(state: RegionState | undefined): string {
  if (!state || !state.controller || state.total <= 0) return NEUTRAL
  const faction = FACTION_BY_ID[state.controller]
  if (!faction) return NEUTRAL
  const lead = (state.influence[state.controller] ?? 0) / state.total
  const alpha = 0.35 + Math.min(0.5, Math.max(0, lead - 0.34) * 1.1)
  const hex = faction.color
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
}

function buildFillExpr(states: Map<string, RegionState>): ExpressionSpecification {
  const expr: unknown[] = ['match', ['upcase', ['get', 'iso3']] as ExpressionSpecification]
  for (const region of REGIONS) {
    const color = regionColor(states.get(region.id))
    for (const iso of region.countries) {
      expr.push(iso, color)
    }
  }
  expr.push('#1A1A1A')
  return expr as ExpressionSpecification
}

export type RegionMapProps = {
  geojson: WorldGeoJson | null
  regions: RegionState[]
  selectedRegion: string | null
  onRegionClick?: (regionId: string, lngLat: { lng: number; lat: number }) => void
}

export function RegionMap({ geojson, regions, selectedRegion, onRegionClick }: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const clickRef = useRef(onRegionClick)
  const readyRef = useRef(false)

  useEffect(() => { clickRef.current = onRegionClick }, [onRegionClick])

  const stateMap = useMemo(() => {
    const m = new Map<string, RegionState>()
    for (const r of regions) m.set(r.id, r)
    return m
  }, [regions])

  const fillExpr = useMemo(() => buildFillExpr(stateMap), [stateMap])
  const fillExprRef = useRef(fillExpr)
  useEffect(() => { fillExprRef.current = fillExpr }, [fillExpr])

  useEffect(() => {
    if (!geojson || !containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        sky: {
          'sky-color': 'rgba(0,0,0,0)',
          'horizon-color': 'rgba(76,138,196,0.45)',
          'fog-color': 'rgba(24,48,82,0.3)',
          'sky-horizon-blend': 0.7,
          'horizon-fog-blend': 0.6,
          'fog-ground-blend': 0.85,
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.6, 7, 0],
        },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': WATER } },
        ],
      },
      center: [10, 20],
      zoom: 1.2,
      maxZoom: 5,
      minZoom: 0,
      attributionControl: false,
      dragRotate: false,
    })

    mapRef.current = map

    map.on('style.load', function onStyleLoad() {
      map.off('style.load', onStyleLoad)
      try {
        map.setProjection({ type: 'globe' })
      } catch { /* Fallback: Mercator */ }

      map.addSource('countries', {
        type: 'geojson',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: geojson as any,
        promoteId: 'iso3',
      })

      map.addLayer({
        id: 'region-fills',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': fillExprRef.current,
          'fill-opacity': 1,
          'fill-color-transition': { duration: 450 } as never,
        },
      })

      map.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        paint: { 'line-color': '#000000', 'line-width': 0.5, 'line-opacity': 0.6 },
      })

      map.addLayer({
        id: 'region-highlight',
        type: 'line',
        source: 'countries',
        paint: { 'line-color': '#E8E4DC', 'line-width': 1.6, 'line-opacity': 0.9 },
        filter: ['in', ['upcase', ['get', 'iso3']], ['literal', []]],
      })

      map.on('click', 'region-fills', (e: maplibregl.MapLayerMouseEvent) => {
        const raw = e.features?.[0]?.properties?.iso3
        if (typeof raw !== 'string') return
        const regionId = REGION_BY_COUNTRY[normIso(raw)]
        if (regionId) clickRef.current?.(regionId, e.lngLat)
      })

      map.on('mousemove', 'region-fills', (e: maplibregl.MapLayerMouseEvent) => {
        const raw = e.features?.[0]?.properties?.iso3
        map.getCanvas().style.cursor =
          typeof raw === 'string' && REGION_BY_COUNTRY[normIso(raw)] ? 'pointer' : ''
      })
      map.on('mouseleave', 'region-fills', () => {
        map.getCanvas().style.cursor = ''
      })

      readyRef.current = true
      map.fitBounds(
        [[-179.5, -60], [179.5, 75]],
        { padding: 20, duration: 700, maxZoom: 1.3 },
      )
    })

    return () => {
      readyRef.current = false
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !map.getLayer('region-fills')) return
    map.setPaintProperty('region-fills', 'fill-color', fillExpr)
  }, [fillExpr])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || !map.getLayer('region-highlight')) return
    const countries = selectedRegion
      ? REGIONS.find((r) => r.id === selectedRegion)?.countries ?? []
      : []
    map.setFilter('region-highlight', ['in', ['upcase', ['get', 'iso3']], ['literal', countries]])
  }, [selectedRegion])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
