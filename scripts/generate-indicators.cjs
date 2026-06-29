/**
 * Generate realistic multi-year indicator data for World Atlas.
 * Uses seeded PRNG for reproducibility with historically-informed patterns.
 */

const fs = require('fs')
const path = require('path')

// Seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const rng = mulberry32(42)

function gaussRng() {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

// Load geojson to get country list
const geojsonPath = path.join(__dirname, '..', 'public', 'data', 'world.geojson')
const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'))
const countries = geojson.features.map(f => f.properties.iso3.toUpperCase())

// Region assignments
const REGIONS = {}
const regionList = [
  { name: 'Europe', codes: ['ALB','AUT','BEL','BGR','BIH','BLR','CHE','CYP','CZE','DEU','DNK','ESP','EST','FIN','FRA','GBR','GRC','HRV','HUN','IRL','ISL','ITA','LTU','LUX','LVA','MDA','MKD','MLT','MNE','NLD','NOR','POL','PRT','ROU','SRB','SVK','SVN','SWE','UKR','XKX'] },
  { name: 'North America', codes: ['CAN','MEX','USA','CRI','CUB','DOM','GTM','HND','HTI','JAM','NIC','PAN','SLV','BHS','BLZ','BRB','TTO'] },
  { name: 'South America', codes: ['ARG','BOL','BRA','CHL','COL','ECU','GUY','PER','PRY','SUR','URY','VEN'] },
  { name: 'East Asia & Pacific', codes: ['AUS','BRN','CHN','FJI','IDN','JPN','KHM','KOR','LAO','MMR','MNG','MYS','NZL','PHL','PNG','SGP','SLB','THA','TLS','TWN','VNM','VUT','PRK'] },
  { name: 'South Asia', codes: ['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK'] },
  { name: 'Middle East & North Africa', codes: ['ARE','BHR','DJI','DZA','EGY','IRN','IRQ','ISR','JOR','KWT','LBN','LBY','MAR','OMN','PSE','QAT','SAU','SYR','TUN','TUR','YEM'] },
  { name: 'Sub-Saharan Africa', codes: ['AGO','BDI','BEN','BFA','BWA','CAF','CMR','COD','COG','CIV','COM','CPV','ERI','ETH','GAB','GHA','GIN','GMB','GNB','GNQ','KEN','LSO','LBR','MDG','MLI','MOZ','MRT','MUS','MWI','NAM','NER','NGA','RWA','SDN','SEN','SLE','SOM','SSD','SWZ','TCD','TGO','TZA','UGA','ZAF','ZMB','ZWE'] },
  { name: 'Central Asia', codes: ['ARM','AZE','GEO','KAZ','KGZ','TJK','TKM','UZB','RUS'] },
]
for (const r of regionList) {
  for (const c of r.codes) REGIONS[c] = r.name
}

// Assign remaining countries
for (const c of countries) {
  if (!REGIONS[c]) REGIONS[c] = 'Other'
}

// Income tiers for base values
const HIGH_INCOME = new Set(['USA','GBR','DEU','FRA','JPN','CAN','AUS','CHE','NOR','SWE','DNK','NLD','BEL','AUT','FIN','IRL','ISL','LUX','SGP','KOR','NZL','ISR','ARE','QAT','KWT','BHR','SAU','ITA','ESP','PRT','CZE','SVN','MLT','CYP','BRN','TWN','EST'])
const UPPER_MID = new Set(['CHN','BRA','MEX','TUR','RUS','ARG','CHL','URY','MYS','THA','COL','PER','ROU','BGR','HRV','SRB','MNE','MKD','BIH','ALB','KAZ','AZE','GEO','ARM','PAN','CRI','DOM','JAM','BWA','NAM','ZAF','GAB','GNQ','MUS','BRB','TTO','VEN','ECU','PRY','GUY','SUR','JOR','LBN','LBY','IRN','IRQ','DZA','TUN','MAR','MDA','BLR','UKR','MNG','FJI','MDV'])
const LOW_INCOME = new Set(['AFG','BDI','CAF','TCD','COD','ERI','ETH','GMB','GNB','HTI','LBR','MDG','MLI','MOZ','NER','RWA','SLE','SOM','SSD','TGO','UGA','BFA','MWI','NPL','TJK'])

function getTier(iso) {
  if (HIGH_INCOME.has(iso)) return 'high'
  if (LOW_INCOME.has(iso)) return 'low'
  if (UPPER_MID.has(iso)) return 'upper_mid'
  return 'lower_mid'
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

const YEARS = []
for (let y = 2000; y <= 2025; y++) YEARS.push(y)

// Indicator definitions with generation parameters
const INDICATORS = [
  {
    code: 'NY.GDP.PCAP.CD',
    name: 'GDP per capita',
    category: 'economy',
    unit: 'current US$',
    scale: 'log',
    base: { high: [35000, 80000], upper_mid: [5000, 18000], lower_mid: [1500, 5000], low: [250, 1200] },
    growth: { high: 0.025, upper_mid: 0.04, lower_mid: 0.035, low: 0.03 },
    noise: 0.04,
    shocks: { 2008: -0.06, 2009: -0.04, 2020: -0.07 },
    min: 100, max: 150000,
    meta: {
      description: 'Gross domestic product divided by midyear population. GDP at purchaser prices includes all resident producers plus taxes minus subsidies.',
      source: 'World Bank, World Development Indicators',
      interpretation: 'Higher values indicate greater economic output per person. Compare within regions for meaningful benchmarks — cost of living varies widely.'
    }
  },
  {
    code: 'v2x_libdem',
    name: 'Liberal Democracy Index',
    category: 'democracy',
    unit: 'index (0-1)',
    scale: 'linear',
    base: { high: [0.7, 0.95], upper_mid: [0.3, 0.7], lower_mid: [0.15, 0.5], low: [0.05, 0.3] },
    growth: { high: -0.002, upper_mid: -0.005, lower_mid: 0.005, low: 0.003 },
    noise: 0.015,
    shocks: { 2020: -0.02, 2021: -0.01 },
    min: 0.01, max: 0.99,
    meta: {
      description: 'Measures the quality of liberal democracy including individual liberties, rule of law, judicial independence, and checks on executive power.',
      source: 'V-Dem Institute, University of Gothenburg',
      interpretation: 'Scale 0 to 1. Values above 0.7 indicate consolidated liberal democracies. Below 0.3 suggests autocratic governance.'
    }
  },
  {
    code: 'v2x_corr',
    name: 'Political Corruption',
    category: 'democracy',
    unit: 'index (0-1)',
    scale: 'linear',
    base: { high: [0.02, 0.2], upper_mid: [0.2, 0.6], lower_mid: [0.3, 0.7], low: [0.5, 0.9] },
    growth: { high: 0.001, upper_mid: 0.003, lower_mid: -0.003, low: -0.002 },
    noise: 0.012,
    shocks: {},
    min: 0.01, max: 0.99,
    meta: {
      description: 'Measures political corruption including executive, legislative, and judicial corruption as well as public sector bribery.',
      source: 'V-Dem Institute, University of Gothenburg',
      interpretation: 'Scale 0 to 1. Lower values indicate less corruption. Values above 0.7 suggest systemic corruption across institutions.'
    }
  },
  {
    code: 'SP.DYN.LE00.IN',
    name: 'Life expectancy at birth',
    category: 'health',
    unit: 'years',
    scale: 'linear',
    base: { high: [76, 84], upper_mid: [68, 78], lower_mid: [60, 72], low: [48, 62] },
    growth: { high: 0.15, upper_mid: 0.25, lower_mid: 0.3, low: 0.35 },
    noise: 0.3,
    shocks: { 2020: -1.2, 2021: -0.8 },
    min: 40, max: 90,
    meta: {
      description: 'Average number of years a newborn is expected to live under current mortality patterns.',
      source: 'World Bank, derived from UN Population Division',
      interpretation: 'Reflects overall health system quality and living conditions. Global average is around 73 years. Above 80 is typical for high-income countries.'
    }
  },
  {
    code: 'EN.ATM.CO2E.PC',
    name: 'CO2 emissions per capita',
    category: 'environment',
    unit: 'metric tons per capita',
    scale: 'log',
    base: { high: [6, 18], upper_mid: [3, 9], lower_mid: [1, 4], low: [0.05, 1] },
    growth: { high: -0.01, upper_mid: 0.025, lower_mid: 0.02, low: 0.015 },
    noise: 0.04,
    shocks: { 2008: -0.04, 2009: -0.06, 2020: -0.12 },
    min: 0.02, max: 45,
    meta: {
      description: 'Carbon dioxide emissions from fossil fuel burning, cement manufacturing, and gas flaring, divided by population.',
      source: 'World Bank, Carbon Dioxide Information Analysis Center',
      interpretation: 'Measured in metric tons. Global average is ~4.5t. Oil-producing states and industrialized nations typically exceed 10t per capita.'
    }
  },
  {
    code: 'SI.POV.GINI',
    name: 'Gini Index',
    category: 'inequality',
    unit: 'index (0-100)',
    scale: 'linear',
    base: { high: [25, 36], upper_mid: [32, 50], lower_mid: [30, 45], low: [33, 55] },
    growth: { high: 0.1, upper_mid: -0.15, lower_mid: -0.1, low: -0.05 },
    noise: 0.5,
    shocks: { 2020: 1.5 },
    min: 20, max: 65,
    meta: {
      description: 'Measures income inequality within a country. 0 represents perfect equality (everyone has equal income), 100 represents maximum inequality.',
      source: 'World Bank, Development Research Group',
      interpretation: 'Below 30: low inequality (Nordic countries). 30-40: moderate. Above 40: high inequality. Above 50: extreme inequality.'
    }
  },
  {
    code: 'VC.IHR.PSRC.P5',
    name: 'Intentional homicides',
    category: 'security',
    unit: 'per 100,000 people',
    scale: 'log',
    base: { high: [0.5, 2.5], upper_mid: [2, 15], lower_mid: [3, 20], low: [5, 25] },
    growth: { high: -0.01, upper_mid: -0.02, lower_mid: -0.015, low: 0.005 },
    noise: 0.06,
    shocks: {},
    min: 0.1, max: 80,
    meta: {
      description: 'Unlawful homicides purposely inflicted as a result of domestic disputes, interpersonal violence, violent conflicts, or gang activity.',
      source: 'UN Office on Drugs and Crime (UNODC)',
      interpretation: 'Measured per 100,000 people. Below 2: very safe. 2-10: moderate. Above 10: elevated violence. Some countries exceed 50.'
    }
  },
  {
    code: 'IT.NET.USER.ZS',
    name: 'Internet users',
    category: 'technology',
    unit: '% of population',
    scale: 'linear',
    base: { high: [40, 65], upper_mid: [10, 35], lower_mid: [3, 15], low: [0.5, 5] },
    growth: { high: 2.5, upper_mid: 3.5, lower_mid: 3.0, low: 2.0 },
    noise: 1.5,
    shocks: { 2020: 3 },
    min: 0.1, max: 99.5,
    meta: {
      description: 'Individuals who have used the Internet in the last 3 months via any device including mobile phones.',
      source: 'International Telecommunication Union (ITU)',
      interpretation: 'Percentage of population. Above 90% indicates high digital connectivity. Below 30% suggests significant digital divide.'
    }
  },
  {
    code: 'MS.MIL.XPND.GD.ZS',
    name: 'Military expenditure',
    category: 'military',
    unit: '% of GDP',
    scale: 'linear',
    base: { high: [1.0, 3.5], upper_mid: [1.0, 3.0], lower_mid: [0.8, 2.5], low: [0.5, 2.0] },
    growth: { high: 0.02, upper_mid: 0.01, lower_mid: 0.01, low: 0.005 },
    noise: 0.08,
    shocks: { 2022: 0.3, 2023: 0.2, 2024: 0.15 },
    min: 0.1, max: 12,
    meta: {
      description: 'Military expenditure as share of gross domestic product. Includes armed forces, defense ministries, and paramilitary forces.',
      source: 'Stockholm International Peace Research Institute (SIPRI)',
      interpretation: 'NATO target is 2% of GDP. Global average is ~2.2%. Above 4% indicates high militarization. Some conflict states exceed 6%.'
    }
  },
]

// Special overrides for specific well-known countries
const COUNTRY_OVERRIDES = {
  'NY.GDP.PCAP.CD': {
    QAT: { base2000: 30000, growth: 0.06 },
    LUX: { base2000: 50000, growth: 0.035 },
    NOR: { base2000: 38000, growth: 0.03 },
    CHE: { base2000: 36000, growth: 0.025 },
    USA: { base2000: 36000, growth: 0.03 },
    DEU: { base2000: 23000, growth: 0.03 },
    CHN: { base2000: 950, growth: 0.10 },
    IND: { base2000: 440, growth: 0.07 },
    BDI: { base2000: 130, growth: 0.02 },
    SOM: { base2000: 150, growth: 0.015 },
  },
  'EN.ATM.CO2E.PC': {
    QAT: { base2000: 55, growth: -0.02 },
    ARE: { base2000: 30, growth: -0.015 },
    USA: { base2000: 20, growth: -0.015 },
    AUS: { base2000: 18, growth: -0.01 },
    CHN: { base2000: 2.7, growth: 0.06 },
    IND: { base2000: 1.0, growth: 0.04 },
  },
  'v2x_libdem': {
    NOR: { base2000: 0.90, growth: 0 },
    SWE: { base2000: 0.89, growth: 0 },
    DNK: { base2000: 0.88, growth: 0 },
    CHE: { base2000: 0.87, growth: 0 },
    HUN: { base2000: 0.72, growth: -0.015 },
    TUR: { base2000: 0.42, growth: -0.012 },
    RUS: { base2000: 0.25, growth: -0.008 },
    CHN: { base2000: 0.05, growth: -0.001 },
    PRK: { base2000: 0.02, growth: 0 },
  },
}

function generateIndicator(indDef) {
  const data = {}
  const overrides = COUNTRY_OVERRIDES[indDef.code] || {}

  for (const iso of countries) {
    const tier = getTier(iso)
    const range = indDef.base[tier]
    const override = overrides[iso]

    let baseVal
    let annualGrowth

    if (override) {
      baseVal = override.base2000
      annualGrowth = override.growth
    } else {
      baseVal = range[0] + rng() * (range[1] - range[0])
      annualGrowth = indDef.growth[tier] + gaussRng() * Math.abs(indDef.growth[tier]) * 0.3
    }

    let val = baseVal

    for (const year of YEARS) {
      if (!data[year]) data[year] = {}

      // Skip some data points randomly for realism (5% chance)
      if (rng() < 0.05 && year !== 2025 && year !== 2000) continue

      // Apply shock
      const shock = indDef.shocks[year] || 0

      // Growth with noise
      if (year > 2000) {
        const noise = gaussRng() * indDef.noise
        if (indDef.scale === 'log') {
          val = val * (1 + annualGrowth + noise + shock)
        } else {
          val = val + annualGrowth + gaussRng() * indDef.noise + shock
        }
      }

      data[year][iso] = Number(clamp(val, indDef.min, indDef.max).toFixed(
        indDef.unit.includes('index') || indDef.unit.includes('%') ? 3 :
        indDef.unit.includes('years') ? 1 :
        indDef.unit.includes('metric tons') ? 2 :
        indDef.unit.includes('100,000') ? 1 : 0
      ))
    }
  }

  return {
    code: indDef.code,
    name: indDef.name,
    category: indDef.category,
    unit: indDef.unit,
    scale: indDef.scale,
    latestYear: 2025,
    years: [...YEARS],
    data,
    meta: indDef.meta,
  }
}

const indicators = INDICATORS.map(generateIndicator)

const output = {
  regions: REGIONS,
  indicators,
}

const outPath = path.join(__dirname, '..', 'public', 'data', 'indicators.json')
fs.writeFileSync(outPath, JSON.stringify(output))

// Stats
for (const ind of indicators) {
  const yearKeys = Object.keys(ind.data)
  const countPerYear = yearKeys.map(y => Object.keys(ind.data[y]).length)
  const allVals = yearKeys.flatMap(y => Object.values(ind.data[y]))
  console.log(`${ind.code}: ${yearKeys.length} years, ${Math.min(...countPerYear)}-${Math.max(...countPerYear)} countries/year, range ${Math.min(...allVals).toFixed(2)}-${Math.max(...allVals).toFixed(2)}`)
}

console.log(`\nWritten to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`)
