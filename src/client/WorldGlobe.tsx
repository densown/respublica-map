import { useEffect, useRef, useMemo, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { worldFillColorByPercentile, computePercentile } from './worldColors'
import type { MapRow, WorldGeoJson } from './worldTypes'

const NODATA_DARK = '#2D2D2D'
const NODATA_LIGHT = '#D0CBC2'
const WATER_DARK = '#0A0A0A'
const WATER_LIGHT = '#C8D6E0'

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
    // Atmosphaeren-Glow um die Kugel; sky bleibt transparent,
    // damit das CSS-Sternenfeld dahinter sichtbar ist.
    sky: {
      'sky-color': 'rgba(0,0,0,0)',
      'horizon-color': dark ? 'rgba(76,138,196,0.5)' : 'rgba(140,185,230,0.65)',
      'fog-color': dark ? 'rgba(24,48,82,0.35)' : 'rgba(210,228,245,0.5)',
      'sky-horizon-blend': 0.7,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.85,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.6, 7, 0],
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': dark ? WATER_DARK : WATER_LIGHT },
      },
    ],
  }
}

// Deterministisches Sternenfeld (gleiches Muster bei jedem Render)
function buildStars(count: number): { x: number; y: number; r: number; o: number }[] {
  let s = 421337
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  return Array.from({ length: count }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    r: 0.4 + rnd() * 1.0,
    o: 0.25 + rnd() * 0.6,
  }))
}

function Starfield() {
  const stars = useMemo(() => buildStars(150), [])
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 100"
    >
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r * 0.12} fill="#E8E4DC" opacity={st.o} />
      ))}
    </svg>
  )
}

// Sternschnuppe: fliegt alle paar Sekunden an zufaelliger Position vorbei
function ShootingStars() {
  const [shot, setShot] = useState<{ key: number; top: number; left: number; angle: number } | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    let key = 0
    const schedule = () => {
      timer = setTimeout(() => {
        if (!alive) return
        key += 1
        setShot({
          key,
          top: 5 + Math.random() * 45,
          left: 10 + Math.random() * 70,
          angle: 20 + Math.random() * 40,
        })
        schedule()
      }, 5000 + Math.random() * 9000)
    }
    schedule()
    return () => { alive = false; clearTimeout(timer) }
  }, [])

  if (!shot) return null

  return (
    <>
      <style>{`
        @keyframes wg-shoot {
          0% { transform: translate(0, 0); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate(160px, 90px); opacity: 0; }
        }
      `}</style>
      <span
        key={shot.key}
        aria-hidden
        style={{
          position: 'absolute',
          top: `${shot.top}%`,
          left: `${shot.left}%`,
          width: 70,
          height: 1.5,
          borderRadius: 1,
          transformOrigin: 'left center',
          rotate: `${shot.angle}deg`,
          background: 'linear-gradient(90deg, rgba(232,228,220,0) 0%, rgba(232,228,220,0.9) 100%)',
          animation: 'wg-shoot 1.3s ease-out forwards',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

function buildFillExpr(
  rows: MapRow[],
  category: string,
  noData: string,
  dark: boolean,
): ExpressionSpecification {
  const sorted = rows
    .map((r) => r.value)
    .filter((v): v is number => v != null && !Number.isNaN(v))
    .sort((a, b) => a - b)
  const expr: unknown[] = ['match', ['upcase', ['get', 'iso3']] as ExpressionSpecification]
  for (const r of rows) {
    const v = r.value
    if (v == null || Number.isNaN(v)) continue
    const pct = computePercentile(v, sorted)
    expr.push(normIso(r.country_code), worldFillColorByPercentile(pct, category, dark))
  }
  expr.push(noData)
  return expr as ExpressionSpecification
}

export type WorldGlobeHandle = {
  flyTo: (lng: number, lat: number) => void
}

export type WorldGlobeProps = {
  geojson: WorldGeoJson | null
  data: MapRow[]
  category: string
  unit: string
  indicatorName: string
  formatValue: (v: number) => string
  dark: boolean
  // Night View: Choropleth wird abgedunkelt, nur City Lights leuchten
  nightMode?: boolean
  // Rotation startet sofort statt erst nach 10s Leerlauf (fuer den Splash)
  autoRotate?: boolean
  // false = reine Kulisse: keine Gesten, keine Controls (Pflicht fuer
  // Inline-Posts, Reddit verbietet Scroll-Traps im Feed)
  interactive?: boolean
  onCountryClick?: (iso3: string, name: string) => void
}

const NIGHT_LAND = '#151A21'
const NIGHT_BORDER = '#232A33'

export const WorldGlobe = forwardRef<WorldGlobeHandle, WorldGlobeProps>(function WorldGlobe({
  geojson,
  data,
  category,
  formatValue: fmtValue,
  dark,
  nightMode = false,
  autoRotate = false,
  interactive = true,
  onCountryClick,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const hoveredIsoRef = useRef<string | null>(null)
  const dataRef = useRef(data)
  const fmtRef = useRef(fmtValue)
  const clickRef = useRef(onCountryClick)
  const darkRef = useRef(dark)
  const nightRef = useRef(nightMode)
  const cityLightsRef = useRef<{
    type: 'FeatureCollection'
    features: {
      type: 'Feature'
      geometry: { type: 'Point'; coordinates: [number, number] }
      properties: { c: number }
    }[]
  } | null>(null)

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { fmtRef.current = fmtValue }, [fmtValue])
  useEffect(() => { clickRef.current = onCountryClick }, [onCountryClick])
  useEffect(() => { darkRef.current = dark }, [dark])
  useEffect(() => { nightRef.current = nightMode }, [nightMode])

  useImperativeHandle(ref, () => ({
    flyTo(lng: number, lat: number) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 4, duration: 1200 })
    },
  }), [])

  const noData = dark ? NODATA_DARK : NODATA_LIGHT

  const fillExpr = useMemo(
    () => (nightMode
      ? (NIGHT_LAND as unknown as ExpressionSpecification)
      : buildFillExpr(data, category, noData, dark)),
    [data, category, noData, dark, nightMode],
  )

  const borderColor: ExpressionSpecification = useMemo(
    () => [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      '#ffffff',
      nightMode ? NIGHT_BORDER : '#000000',
    ],
    [nightMode],
  )

  const borderWidth: ExpressionSpecification = useMemo(
    () => ['case', ['boolean', ['feature-state', 'hover'], false], 1.8, 0.6],
    [],
  )

  const fillExprRef = useRef(fillExpr)
  const borderColorRef = useRef(borderColor)
  const borderWidthRef = useRef(borderWidth)

  useEffect(() => { fillExprRef.current = fillExpr }, [fillExpr])
  useEffect(() => { borderColorRef.current = borderColor }, [borderColor])
  useEffect(() => { borderWidthRef.current = borderWidth }, [borderWidth])

  // City Lights: leuchtende Staedte im Night View
  const installCityLights = useCallback((map: maplibregl.Map) => {
    if (!nightRef.current || !cityLightsRef.current || map.getSource('city-lights')) return
    map.addSource('city-lights', {
      type: 'geojson',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: cityLightsRef.current as any,
    })
    map.addLayer({
      id: 'city-lights',
      type: 'circle',
      source: 'city-lights',
      paint: {
        'circle-color': '#FFC46B',
        'circle-blur': 0.9,
        'circle-opacity': ['interpolate', ['linear'], ['get', 'c'], 1, 0.5, 5, 0.9],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          0, ['*', ['get', 'c'], 0.7],
          3, ['*', ['get', 'c'], 1.8],
          6, ['*', ['get', 'c'], 4.5],
        ],
      },
    }, map.getLayer('country-borders') ? 'country-borders' : undefined)
  }, [])

  useEffect(() => {
    if (!nightMode || cityLightsRef.current) {
      // Night View aus: Layer entfernen, falls vorhanden
      const map = mapRef.current
      if (!nightMode && map?.getLayer('city-lights')) {
        map.removeLayer('city-lights')
        map.removeSource('city-lights')
      }
      if (nightMode && cityLightsRef.current && mapRef.current) installCityLights(mapRef.current)
      return
    }
    let cancelled = false
    void fetch('/data/citylights.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: [number, number, number][] | null) => {
        if (cancelled || !rows) return
        cityLightsRef.current = {
          type: 'FeatureCollection',
          features: rows.map(([lng, lat, c]) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { c },
          })),
        }
        if (mapRef.current?.getLayer('country-fills')) installCityLights(mapRef.current)
      })
      .catch(() => { /* Lichter sind optional */ })
    return () => { cancelled = true }
  }, [nightMode, installCityLights])

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

      installCityLights(map)

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

        const html = `<div style="font-family:'Source Serif 4',serif,system-ui;font-size:13px;color:#E8E4DC;min-width:120px">
          <div style="font-family:'Playfair Display',serif;font-weight:900;margin-bottom:3px;color:#E8E4DC">${escHtml(String(name))}</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8B8B8B">${escHtml(val)}</div>
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

      const onClick = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0]
        const raw = f?.properties?.iso3
        if (typeof raw !== 'string') return
        const iso = normIso(raw)
        const row = dataRef.current.find((r) => normIso(r.country_code) === iso)
        const name = row?.country_name ?? f?.properties?.name ?? iso
        clickRef.current?.(iso, String(name))
      }

      map.on('mousemove', 'country-fills', onMove)
      map.on('mouseleave', 'country-fills', onLeave)
      map.on('click', 'country-fills', onClick)
    },
    [installCityLights],
  )

  useEffect(() => {
    if (!geojson || !containerRef.current) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildLocalStyle(dark),
      center: reducedMotion ? [10, 20] : [95, 10],
      zoom: reducedMotion ? 1.2 : 0.3,
      maxZoom: 6,
      minZoom: 0,
      attributionControl: false,
      dragRotate: true,
      // Kulissen-Modus: MapLibre faengt keinerlei Gesten ab
      interactive,
    })

    if (interactive) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right',
      )
    }

    mapRef.current = map

    // Idle-Rotation: nach 10s ohne Interaktion dreht der Globus langsam
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    let spinning = false
    let removed = false

    const spinStep = () => {
      if (removed || !spinning || map.getZoom() > 2.2) return
      const c = map.getCenter()
      map.easeTo({ center: [c.lng + 8, c.lat], duration: 5000, easing: (x) => x })
    }

    // Bei autoRotate nach kurzer Pause weiterdrehen, sonst nach 10s Leerlauf
    const scheduleSpin = (delay = autoRotate ? 4000 : 10000) => {
      if (reducedMotion || removed) return
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        spinning = true
        spinStep()
      }, delay)
    }

    const stopSpin = () => {
      spinning = false
      scheduleSpin()
    }

    map.on('moveend', () => { if (spinning) spinStep() })
    map.on('mousedown', stopSpin)
    map.on('touchstart', stopSpin)
    map.on('wheel', stopSpin)

    map.on('style.load', function onStyleLoad() {
      map.off('style.load', onStyleLoad)
      try {
        map.setProjection({ type: 'globe' })
      } catch { /* */ }
      installLayers(map, geojson)
      if (reducedMotion) {
        map.fitBounds(
          [[-179.5, -60], [179.5, 75]],
          { padding: 20, duration: 0, maxZoom: 1.3 },
        )
      } else {
        // Intro: einmal um die halbe Welt auf Europa/Afrika zufliegen
        map.flyTo({ center: [10, 22], zoom: 1.3, duration: 2800, curve: 1.2 })
      }
      // Erst nach dem Intro mit der Rotation beginnen
      scheduleSpin(autoRotate && !reducedMotion ? 3100 : undefined)
    })

    return () => {
      removed = true
      if (idleTimer) clearTimeout(idleTimer)
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
    <div style={{
      position: 'relative', width: '100%', height: '100%', flex: 1, minHeight: 0,
      background: dark
        ? 'radial-gradient(ellipse at 50% 45%, #101625 0%, #05070D 65%, #020308 100%)'
        : 'radial-gradient(ellipse at 50% 45%, #DCE8F2 0%, #C8D6E0 70%)',
    }}>
      {dark && <Starfield />}
      {dark && <ShootingStars />}
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0,
          // Nicht-interaktiv: Gesten gehen komplett an die Seite durch
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      />
    </div>
  )
})
