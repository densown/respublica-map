const SEQUENTIAL: Record<string, { lo: string; hi: string }> = {
  economy: { lo: '#f7fbff', hi: '#08306b' },
  population: { lo: '#fff5eb', hi: '#7f2704' },
  education: { lo: '#f7fcf5', hi: '#00441b' },
  health: { lo: '#e0f3f8', hi: '#084081' },
  environment: { lo: '#f7fcb1', hi: '#016c59' },
  military: { lo: '#fff5f0', hi: '#67000d' },
  inequality: { lo: '#ffffcc', hi: '#800026' },
  technology: { lo: '#f0f9e8', hi: '#0868ac' },
  trade: { lo: '#f7fcfd', hi: '#00441b' },
  security: { lo: '#fff5f0', hi: '#67000d' },
  democracy: { lo: '#fff7f3', hi: '#49006a' },
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const x = (n: number) => n.toString(16).padStart(2, '0')
  return `#${x(Math.round(r))}${x(Math.round(g))}${x(Math.round(b))}`
}

function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t)
}

export function liftForDark(hex: string): string {
  return mix(hex, '#ffffff', 0.35)
}

export function worldFillColor(
  value: number,
  min: number,
  max: number,
  category: string,
  dark: boolean,
  scaleType: 'linear' | 'log' = 'linear',
): string {
  let t: number
  if (scaleType === 'log' && min > 0 && max > 0) {
    const logMin = Math.log(min)
    const logMax = Math.log(max)
    const span = logMax - logMin || 1
    t = Math.min(1, Math.max(0, (Math.log(Math.max(value, min)) - logMin) / span))
  } else {
    const span = max - min || 1
    t = Math.min(1, Math.max(0, (value - min) / span))
  }
  const scale = SEQUENTIAL[category] ?? SEQUENTIAL['economy']
  const c = mix(scale!.lo, scale!.hi, t)
  return dark ? liftForDark(c) : c
}

export function gradientCss(category: string, dark: boolean): string {
  const scale = SEQUENTIAL[category] ?? SEQUENTIAL['economy']
  const hi = dark ? liftForDark(scale!.hi) : scale!.hi
  return `linear-gradient(90deg, ${scale!.lo} 0%, ${hi} 100%)`
}
