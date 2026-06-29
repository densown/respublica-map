import { useState } from 'react'
import { getTheme } from './theme'

export type ShareButtonProps = {
  indicatorName: string
  year: number
  countryName: string | null
  dark: boolean
}

export function ShareButton({ indicatorName, year, countryName, dark }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const t = getTheme(dark)

  const handleShare = () => {
    const text = countryName
      ? `${countryName} — ${indicatorName} (${year}) | World Atlas by Res.Publica`
      : `${indicatorName} (${year}) | World Atlas by Res.Publica`
    if (navigator.share) {
      void navigator.share({ title: 'World Atlas', text })
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <button onClick={handleShare} style={{
      position: 'absolute', top: 10, right: 10, zIndex: 25,
      width: 32, height: 32, borderRadius: 6, border: `1px solid ${t.border}`,
      background: copied ? t.red : t.bg, backdropFilter: 'blur(8px)',
      color: copied ? '#fff' : t.muted, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, transition: 'background 0.15s, color 0.15s',
    }} title={copied ? 'Copied!' : 'Share'}>
      {copied ? '✓' : '↗'}
    </button>
  )
}
