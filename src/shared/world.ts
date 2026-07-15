// World Game: Fraktionen, Regionen und API-Typen.
// Regionen sind stilisierte Zonen, keine politischen Aussagen.

export type FactionId = 'europe' | 'asia' | 'africa' | 'namerica' | 'samerica' | 'oceania'

export type Faction = {
  id: FactionId
  name: string
  color: string
  motto: string
}

export const FACTIONS: Faction[] = [
  { id: 'europe', name: 'Europe', color: '#4A7FB5', motto: 'Old world, sharp minds' },
  { id: 'asia', name: 'Asia', color: '#D4A843', motto: 'Half the world plays here' },
  { id: 'africa', name: 'Africa', color: '#C96F3B', motto: 'The rising continent' },
  { id: 'namerica', name: 'North America', color: '#9B6FD0', motto: 'Coast to coast' },
  { id: 'samerica', name: 'South America', color: '#3DA85A', motto: 'Passion meets data' },
  { id: 'oceania', name: 'Oceania', color: '#3FA9A5', motto: 'Small teams, big waves' },
]

export const FACTION_BY_ID: Record<string, Faction> = Object.fromEntries(
  FACTIONS.map((f) => [f.id, f]),
)

export type WorldRegion = {
  id: string
  name: string
  countries: string[]
}

export const REGIONS: WorldRegion[] = [
  {
    id: 'weurope',
    name: 'Western Europe',
    countries: ['GBR', 'IRL', 'FRA', 'BEL', 'NLD', 'LUX', 'DEU', 'CHE', 'AUT', 'LIE', 'MCO', 'JEY', 'GGY', 'IMN'],
  },
  {
    id: 'seurope',
    name: 'Southern Europe',
    countries: ['PRT', 'ESP', 'ITA', 'GRC', 'MLT', 'SMR', 'AND', 'CYP', 'GIB'],
  },
  {
    id: 'neurope',
    name: 'Northern Europe',
    countries: ['NOR', 'SWE', 'FIN', 'DNK', 'ISL', 'EST', 'LVA', 'LTU', 'FRO', 'ALA'],
  },
  {
    id: 'eeurope',
    name: 'Eastern Europe & Balkans',
    countries: ['POL', 'CZE', 'SVK', 'HUN', 'ROU', 'BGR', 'UKR', 'BLR', 'MDA', 'SRB', 'HRV', 'SVN', 'BIH', 'MNE', 'MKD', 'ALB', 'XKX'],
  },
  {
    id: 'nasia',
    name: 'Russia & Central Asia',
    countries: ['RUS', 'KAZ', 'UZB', 'TJK', 'KGZ', 'TKM', 'GEO', 'ARM', 'AZE', 'MNG'],
  },
  {
    id: 'mideast',
    name: 'Middle East',
    countries: ['TUR', 'SYR', 'LBN', 'ISR', 'PSE', 'JOR', 'IRQ', 'IRN', 'SAU', 'YEM', 'OMN', 'ARE', 'QAT', 'KWT', 'BHR'],
  },
  {
    id: 'nafrica',
    name: 'North Africa',
    countries: ['MAR', 'DZA', 'TUN', 'LBY', 'EGY', 'ESH'],
  },
  {
    id: 'wafrica',
    name: 'West & Central Africa',
    countries: ['NGA', 'GHA', 'CIV', 'SEN', 'MLI', 'BFA', 'NER', 'GIN', 'SLE', 'LBR', 'TGO', 'BEN', 'GMB', 'GNB', 'MRT', 'CPV', 'CMR', 'GAB', 'COG', 'COD', 'CAF', 'TCD', 'GNQ', 'STP', 'AGO'],
  },
  {
    id: 'eafrica',
    name: 'East Africa',
    countries: ['ETH', 'KEN', 'TZA', 'UGA', 'RWA', 'BDI', 'SOM', 'ERI', 'DJI', 'SSD', 'SDN', 'SYC', 'SHN'],
  },
  {
    id: 'safrica',
    name: 'Southern Africa',
    countries: ['ZAF', 'NAM', 'BWA', 'ZWE', 'ZMB', 'MOZ', 'MWI', 'LSO', 'SWZ', 'MDG', 'MUS', 'COM'],
  },
  {
    id: 'sasia',
    name: 'South Asia',
    countries: ['IND', 'PAK', 'BGD', 'AFG', 'NPL', 'BTN', 'LKA', 'MDV', 'IOT'],
  },
  {
    id: 'easia',
    name: 'East Asia',
    countries: ['CHN', 'JPN', 'KOR', 'PRK', 'TWN', 'HKG', 'MAC'],
  },
  {
    id: 'seasia',
    name: 'Southeast Asia',
    countries: ['IDN', 'MYS', 'THA', 'VNM', 'PHL', 'MMR', 'KHM', 'LAO', 'SGP', 'BRN', 'TLS'],
  },
  {
    id: 'oceania',
    name: 'Oceania',
    countries: ['AUS', 'NZL', 'FJI', 'PNG', 'SLB', 'VUT', 'NCL', 'PYF', 'WSM', 'ASM', 'TON', 'KIR', 'MHL', 'FSM', 'PLW', 'NRU', 'TUV', 'NIU', 'COK', 'WLF', 'GUM', 'MNP', 'NFK', 'PCN'],
  },
  {
    id: 'namerica',
    name: 'North America',
    countries: ['USA', 'CAN', 'GRL', 'BMU', 'SPM'],
  },
  {
    id: 'camerica',
    name: 'Central America & Caribbean',
    countries: ['MEX', 'GTM', 'BLZ', 'HND', 'SLV', 'NIC', 'CRI', 'PAN', 'CUB', 'HTI', 'DOM', 'JAM', 'BHS', 'TTO', 'GRD', 'VCT', 'BRB', 'LCA', 'DMA', 'ATG', 'KNA', 'PRI', 'VIR', 'VGB', 'AIA', 'CYM', 'TCA', 'MSR', 'CUW', 'ABW', 'SXM', 'MAF', 'BLM'],
  },
  {
    id: 'samerica',
    name: 'South America',
    countries: ['BRA', 'ARG', 'CHL', 'PER', 'COL', 'VEN', 'ECU', 'BOL', 'PRY', 'URY', 'GUY', 'SUR', 'FLK'],
  },
]

export const REGION_BY_ID: Record<string, WorldRegion> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
)

export const REGION_BY_COUNTRY: Record<string, string> = {}
for (const region of REGIONS) {
  for (const iso of region.countries) {
    REGION_BY_COUNTRY[iso] = region.id
  }
}

export const SEASON = 's1'

// Punkte-Limits pro Spiel und Tag (Server erzwingt beides)
export const EARN_LIMITS: Record<string, number> = {
  quiz: 20,
  sort: 40,
  higher: 40,
}
export const DAILY_EARN_CAP = 120
export const JOIN_BONUS = 25

export type RegionState = {
  id: string
  influence: Record<string, number>
  controller: FactionId | null
  total: number
}

export type WorldEvent = {
  text: string
  ts: number
}

export type WorldStateResponse = {
  username: string | null
  faction: FactionId | null
  points: number
  regions: RegionState[]
  factionTotals: Record<string, number>
  memberCounts: Record<string, number>
  events: WorldEvent[]
}

export type JoinResponse = {
  ok: boolean
  faction: FactionId
  points: number
}

export type InvestResponse = {
  ok: boolean
  points: number
  region: RegionState
}

export type EarnResponse = {
  ok: boolean
  earned: number
  points: number
  faction: FactionId | null
}
