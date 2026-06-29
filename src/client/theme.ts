export function getTheme(dark: boolean) {
  return {
    bg: dark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)',
    cardBg: dark ? '#1A1A1A' : '#FFFFFF',
    ink: dark ? '#E8E4DC' : '#0F0F0F',
    muted: dark ? '#8B8B8B' : '#525960',
    border: dark ? '#2D2D2D' : '#E8E4DC',
    red: dark ? '#E8384F' : '#C8102E',
    hoverBg: dark ? '#222222' : '#EDE8DF',
    shadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
    backdrop: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
  } as const
}

export type Theme = ReturnType<typeof getTheme>

export const FONT = {
  display: "'Playfair Display', serif, system-ui",
  body: "'Source Serif 4', serif, system-ui",
  mono: "'IBM Plex Mono', monospace",
} as const
