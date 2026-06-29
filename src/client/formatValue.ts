function fmtInt(v: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(v))
}

function fmtFixed(v: number, digits: number): string {
  return v.toFixed(digits)
}

export function formatValue(value: number, unit: string, code: string): string {
  const u = unit.toLowerCase()
  const abs = Math.abs(value)

  if (u.includes('%') || u.includes('% of')) {
    return `${fmtFixed(value, 1)} %`
  }

  if (code === 'NY.GDP.PCAP.CD' || u.includes('current us$')) {
    return `${fmtInt(value)} $`
  }

  if (u.includes('per 100,000')) {
    return `${fmtFixed(value, value >= 100 ? 0 : 1)} per 100k`
  }

  if (u.includes('metric tons')) {
    return `${fmtFixed(value, 2)} t`
  }

  if (u.includes('years')) {
    return `${fmtFixed(value, 1)} yr`
  }

  if (u.includes('births per woman')) {
    return fmtFixed(value, 2)
  }

  if (abs < 1 && abs > 0) {
    return fmtFixed(value, 2)
  }

  if (abs >= 1e9) {
    return `${fmtFixed(abs / 1e9, 1)} bn`
  }
  if (abs >= 1e6) {
    return `${fmtFixed(abs / 1e6, 1)} m`
  }

  return fmtInt(value)
}
