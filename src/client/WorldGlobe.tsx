import { useEffect, useRef, useMemo, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { worldFillColor } from './worldColors'
import type { MapRow, WorldGeoJson } from './worldTypes'

const NODATA_DARK = '#2a2a3a'
const NODATA_LIGHT = '#d5d5d5'
const WATER_DARK = '#0c0e1a'
const WATER_LIGHT = '#b8c6d4'

function normIso(s: string): string {
  return s.trim().toUpperCase()
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildLocalStyle(dark: boolean): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': dark ? WATER_DARK : WATER_LIGHT },
      },
    ],
  }
}

function buildFillExpr(
  rows: MapRow[],
  vMin: number,
  vMax: number,
  category: string,
  noData: string,
  dark: boolean,
): ExpressionSpecification {
  const expr: unknown[] = ['match', ['upcase', ['get', 'iso3']] as ExpressionSpecification]
  for (const r of rows) {
    const v = r.value
    if (v == null || Number.isNaN(v)) continue
    expr.push(normIso(r.country_code), worldFillColor(v, vMin, vMax, category, dark))
  }
  expr.push(noData)
  return expr as ExpressionSpecification
}

export type WorldGlobeProps = {
  geojson: WorldGeoJson | null
  data: MapRow[]
  category: string
  vMin: number
  vMax: number
  unit: string
  indicatorName: string
  formatValue: (v: number) => string
  dark: boolean
}

export function WorldGlobe({
  geojson,
  data,
  category,
  vMin,
  vMax,
  formatValue: fmtValue,
  dark,
}: WorldGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const hoveredIsoRef = useRef<string | null>(null)
  const dataRef = useRef(data)
  const fmtRef = useRef(fmtValue)

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { fmtRef.current = fmtValue }, [fmtValue])

  const noData = dark ? NODATA_DARK : NODATA_LIGHT

  const fillExpr = useMemo(
    () => buildFillExpr(data, vMin, vMax, category, noData, dark),
    [data, vMin, vMax, category, noData, dark],
  )

  const borderColor: ExpressionSpecification = useMemo(
    () => [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#ffffff',
      dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)',
    ],
    [dark],
  )

  const borderWidth: ExpressionSpecification = useMemo(
    () => ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0.4],
    [],
  )

  const fillExprRef = useRef(fillExpr)
  const borderColorRef = useRef(borderColor)
  const borderWidthRef = useRef(borderWidth)

  useEffect(() => { fillExprRef.current = fillExpr }, [fillExpr])
  useEffect(() => { borderColorRef.current = borderColor }, [borderColor])
  useEffect(() => { borderWidthRef.current = borderWidth }, [borderWidth])

  const installLayers = useCallback(
    (map: maplibregl.Map, gj: WorldGeoJson) => {
      if (map.getSource('countries')) return

      map.addSource('countries', {
        type: 'geojson',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: gj as any,
        promoteId: 'iso3',
      })

      map.addLayer({
        id: 'country-fills',
        type: 'fill',
        source: 'countries',
        paint: { 'fill-color': fillExprRef.current, 'fill-opacity': 1 },
      })

      map.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': borderColorRef.current,
          'line-width': borderWidthRef.current,
        },
      })

      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: '260px',
          className: 'atlas-popup',
        })
      }

      const onMove = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0]
        const raw = f?.properties?.iso3
        if (typeof raw !== 'string') return
        const promoteId = raw.trim()
        const iso = normIso(raw)

        const prev = hoveredIsoRef.current
        if (prev !== promoteId) {
          if (prev) {
            try {
              map.setFeatureState({ source: 'countries', id: prev }, { hover: false })
            } catch { /* */ }
          }
          hoveredIsoRef.current = promoteId
          try {
            map.setFeatureState({ source: 'countries', id: promoteId }, { hover: true })
          } catch { /* */ }
        }

        const row = dataRef.current.find((r) => normIso(r.country_code) === iso)
        const name = row?.country_name ?? f?.properties?.name ?? iso
        const val =
          row?.value != null && !Number.isNaN(row.value) ? fmtRef.current(row.value) : 'No data'

        const html = `<div style="font-family:system-ui,sans-serif;font-size:13px;color:#f4f4f5;min-width:120px">
          <div style="font-weight:700;margin-bottom:3px;color:#fff">${escHtml(String(name))}</div>
          <div style="font-family:monospace;font-size:12px">${escHtml(val)}</div>
        </div>`
        popupRef.current!.setLngLat(e.lngLat).setHTML(html).addTo(map)
        map.getCanvas().style.cursor = 'pointer'
      }

      const onLeave = () => {
        const h = hoveredIsoRef.current
        if (h) {
          try {
            map.setFeatureState({ source: 'countries', id: h }, { hover: false })
          } catch { /* */ }
          hoveredIsoRef.current = null
        }
        popupRef.current?.remove()
        map.getCanvas().style.cursor = ''
      }

      map.on('mousemove', 'country-fills', onMove)
      map.on('mouseleave', 'country-fills', onLeave)
    },
    [],
  )

  useEffect(() => {
    if (!geojson || !containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildLocalStyle(dark),
      center: [10, 20],
      zoom: 1.2,
      maxZoom: 6,
      minZoom: 0,
      attributionControl: false,
      dragRotate: true,
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )

    mapRef.current = map

    map.on('style.load', function onStyleLoad() {
      map.off('style.load', onStyleLoad)
      try {
        map.setProjection({ type: 'globe' })
      } catch { /* */ }
      installLayers(map, geojson)
      map.fitBounds(
        [[-179.5, -60], [179.5, 75]],
        { padding: 20, duration: 700, maxZoom: 1.3 },
      )
    })

    return () => {
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, installLayers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !geojson) return
    map.setStyle(buildLocalStyle(dark))
    map.on('style.load', function onStyleReload() {
      map.off('style.load', onStyleReload)
      try {
        map.setProjection({ type: 'globe' })
      } catch { /* */ }
      installLayers(map, geojson)
    })
  }, [dark, geojson, installLayers])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-fills')) return
    map.setPaintProperty('country-fills', 'fill-color', fillExpr)
  }, [fillExpr])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-borders')) return
    map.setPaintProperty('country-borders', 'line-color', borderColor)
    map.setPaintProperty('country-borders', 'line-width', borderWidth)
  }, [borderColor, borderWidth])

  if (!geojson) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: dark ? '#0f0f0f' : '#f5f5f5',
        color: dark ? '#aaa' : '#666', fontFamily: 'system-ui',
      }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1, minHeight: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
