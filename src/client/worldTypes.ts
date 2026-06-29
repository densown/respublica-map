export type MapRow = {
  country_code: string
  country_name: string | null
  value: number | null
  region: string | null
}

export type IndicatorDef = {
  code: string
  name: string
  category: string
  unit: string
  latestYear: number
  years: number[]
  data: Record<number, Record<string, number>>
}

export type IndicatorsFile = {
  regions: Record<string, string>
  indicators: IndicatorDef[]
}

export type GeoJsonFeature = {
  type: 'Feature'
  properties: { iso3: string; iso2?: string; name: string }
  geometry: { type: string; coordinates: unknown }
}

export type WorldGeoJson = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}
