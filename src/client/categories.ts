import type { IndicatorDef } from './worldTypes'

// Anzeige-Metadaten pro Indikator-Kategorie. Reihenfolge = Anzeigereihenfolge.
export type CategoryMeta = {
  id: string
  label: string
  color: string
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'economy', label: 'Economy', color: '#4A7FB5' },
  { id: 'health', label: 'Health', color: '#3DA85A' },
  { id: 'population', label: 'Population', color: '#C96F3B' },
  { id: 'democracy', label: 'Democracy', color: '#9B6FD0' },
  { id: 'technology', label: 'Technology', color: '#3FA9A5' },
  { id: 'environment', label: 'Environment', color: '#7A9B3E' },
  { id: 'military', label: 'Military', color: '#B5484A' },
  { id: 'trade', label: 'Travel & Trade', color: '#D4A843' },
  { id: 'education', label: 'Education', color: '#5B8A8F' },
  { id: 'inequality', label: 'Society', color: '#A8688F' },
]

export const CATEGORY_BY_ID: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
)

export function categoryOf(ind: IndicatorDef): CategoryMeta {
  return CATEGORY_BY_ID[ind.category] ?? { id: ind.category, label: ind.category, color: '#8B8B8B' }
}

// Gruppiert Indikatoren nach Kategorie in Anzeigereihenfolge.
export function groupByCategory(indicators: IndicatorDef[]): { meta: CategoryMeta; items: IndicatorDef[] }[] {
  const groups = new Map<string, IndicatorDef[]>()
  for (const ind of indicators) {
    const list = groups.get(ind.category) ?? []
    list.push(ind)
    groups.set(ind.category, list)
  }
  const ordered: { meta: CategoryMeta; items: IndicatorDef[] }[] = []
  for (const meta of CATEGORIES) {
    const items = groups.get(meta.id)
    if (items?.length) {
      ordered.push({ meta, items })
      groups.delete(meta.id)
    }
  }
  // Unbekannte Kategorien hinten anhaengen
  for (const [id, items] of groups) {
    ordered.push({ meta: { id, label: id, color: '#8B8B8B' }, items })
  }
  return ordered
}

// Ein Kern-Indikator pro Kategorie fuer den 8-Achsen-Radar im Compare.
export const CORE_RADAR_CODES = [
  'NY.GDP.PCAP.CD',    // Economy
  'SP.DYN.LE00.IN',    // Health
  'SP.URB.TOTL.IN.ZS', // Population
  'v2x_libdem',        // Democracy
  'IT.NET.USER.ZS',    // Technology
  'EN.ATM.CO2E.PC',    // Environment
  'MS.MIL.XPND.GD.ZS', // Military
  'ST.INT.ARVL',       // Travel & Trade
]
