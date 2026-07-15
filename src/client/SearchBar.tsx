import { useState, useRef, useEffect, useMemo } from 'react'
import { getTheme, FONT } from './theme'
import type { WorldGeoJson } from './worldTypes'

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  AFG:[67,33],ALB:[20,41],DZA:[3,28],AGO:[18,-12],ARG:[-64,-34],ARM:[45,40],AUS:[134,-25],AUT:[14,47],AZE:[50,41],BHS:[-77,25],BHR:[50.5,26],BGD:[90,24],BRB:[-59.5,13],BLR:[28,53],BEL:[4.5,51],BLZ:[-88.5,17],BEN:[2.3,9.3],BTN:[90.5,27.5],BOL:[-65,-17],BIH:[18,44],BWA:[24,-22],BRA:[-52,-10],BRN:[115,4.5],BGR:[25,43],BFA:[-1.5,12],BDI:[30,-3.5],KHM:[105,12.5],CMR:[12.5,6],CAN:[-96,60],CPV:[-24,16],CAF:[21,7],TCD:[19,15],CHL:[-71,-30],CHN:[105,35],COL:[-72,4],COM:[44,-12],COG:[15,-1],COD:[24,-3],CRI:[-84,10],CIV:[-5.5,7.5],HRV:[16,45.5],CUB:[-79.5,22],CYP:[33,35],CZE:[15.5,50],DNK:[10,56],DJI:[43,11.5],DOM:[-70,19],ECU:[-78,-1.5],EGY:[30,27],SLV:[-88.9,13.8],GNQ:[10,2],ERI:[39,15.5],EST:[26,59],SWZ:[31.5,-26.5],ETH:[40,9],FJI:[178,-18],FIN:[26,64],FRA:[2,46],GAB:[11.5,-0.5],GMB:[-15.5,13.5],GEO:[44,42],DEU:[10,51],GHA:[-1.5,8],GRC:[22,39],GTM:[-90.5,15.5],GIN:[-11,11],GNB:[-15,12],GUY:[-59,5],HTI:[-72,19],HND:[-87,15],HUN:[20,47],ISL:[-19,65],IND:[79,21],IDN:[120,-5],IRN:[53,32],IRQ:[44,33],IRL:[-8,53],ISR:[35,31],ITA:[12,42.5],JAM:[-77.5,18],JPN:[138,36],JOR:[36,31],KAZ:[67,48],KEN:[38,1],KWT:[48,29.5],KGZ:[75,41],LAO:[102,18],LVA:[25,57],LBN:[36,34],LSO:[28.5,-29.5],LBR:[-9.5,6.5],LBY:[17,27],LTU:[24,56],LUX:[6.1,49.8],MDG:[47,-20],MWI:[34,-13.5],MYS:[110,4],MDV:[73,3.2],MLI:[-4,17],MLT:[14.5,35.9],MRT:[-10.5,20],MUS:[57.5,-20.3],MEX:[-102,24],MDA:[29,47],MNG:[105,47],MNE:[19.5,42.5],MAR:[-5,32],MOZ:[35,-18],MMR:[96,20],NAM:[19,-22],NPL:[84,28],NLD:[5.5,52.5],NZL:[174,-41],NIC:[-85,13],NER:[8,16],NGA:[8,10],MKD:[22,41.5],NOR:[9,62],OMN:[56,21],PAK:[70,30],PAN:[-80,9],PNG:[147,-6],PRY:[-58,-23],PER:[-76,-10],PHL:[122,12],POL:[20,52],PRT:[-8,39.5],QAT:[51.2,25.3],ROU:[25,46],RUS:[100,60],RWA:[30,-2],SAU:[45,24],SEN:[-14.5,14.5],SRB:[21,44],SLE:[-11.8,8.5],SGP:[104,1.3],SVK:[19.5,48.7],SVN:[15,46.2],SLB:[160,-9],SOM:[46,6],ZAF:[25,-29],KOR:[128,36],SSD:[30,7],ESP:[-4,40],LKA:[81,8],SDN:[30,15],SUR:[-56,4],SWE:[16,62],CHE:[8,47],SYR:[38,35],TWN:[121,24],TJK:[69,39],TZA:[35,-6],THA:[101,15],TLS:[126,-9],TGO:[1.2,8.6],TTO:[-61,10.5],TUN:[9.5,34],TUR:[35,39],TKM:[59,39],UGA:[32,1.5],UKR:[32,49],ARE:[54,24],GBR:[-2,54],USA:[-99,39],URY:[-56,-33],UZB:[65,41],VUT:[167,-16],VEN:[-66,8],VNM:[106,16],YEM:[48,15.5],ZMB:[28,-15],ZWE:[30,-20],PSE:[35,32],XKX:[21,42.5],PRK:[127,40]
}

export type SearchBarProps = {
  geojson: WorldGeoJson
  dark: boolean
  onSelect: (iso3: string, name: string, lng: number, lat: number) => void
}

export function SearchBar({ geojson, dark, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = getTheme(dark)

  const countries = useMemo(
    () => geojson.features.map((f) => ({
      iso3: f.properties.iso3.toUpperCase(),
      name: f.properties.name,
    })).sort((a, b) => a.name.localeCompare(b.name)),
    [geojson],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return countries.slice(0, 8)
    const q = query.toLowerCase()
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.iso3.toLowerCase().includes(q),
    ).slice(0, 10)
  }, [query, countries])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'absolute', top: 10, right: 48, zIndex: 25,
        width: 32, height: 32, borderRadius: 6, border: `1px solid ${t.border}`,
        background: t.bg, backdropFilter: 'blur(8px)', color: t.muted,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }} title="Search country">⌕</button>
    )
  }

  return (
    <div ref={ref} style={{ position: 'absolute', top: 10, right: 48, zIndex: 25, width: 240, maxWidth: 'calc(100vw - 120px)' }}>
      <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Search country..."
        style={{
          width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${t.border}`,
          background: t.bg, backdropFilter: 'blur(8px)', color: t.ink,
          fontFamily: FONT.body, fontSize: 12, outline: 'none', boxSizing: 'border-box',
        }} />
      {filtered.length > 0 && (
        <div style={{
          marginTop: 4, background: t.bg, borderRadius: 8, border: `1px solid ${t.border}`,
          backdropFilter: 'blur(12px)', maxHeight: 240, overflowY: 'auto', boxShadow: t.shadow,
        }}>
          {filtered.map((c) => (
            <button key={c.iso3}
              onClick={() => {
                const coords = COUNTRY_CENTROIDS[c.iso3]
                if (coords) onSelect(c.iso3, c.name, coords[0], coords[1])
                setOpen(false); setQuery('')
              }}
              style={{
                display: 'block', width: '100%', padding: '6px 10px', border: 'none',
                background: 'transparent', color: t.ink, fontFamily: FONT.body,
                fontSize: 12, textAlign: 'left', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverBg }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: t.muted, marginLeft: 6, fontFamily: FONT.mono, fontSize: 9 }}>{c.iso3}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
