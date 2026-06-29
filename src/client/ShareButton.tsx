import { useState } from 'react'

export type ShareButtonProps = {
  indicatorName: string
  year: number
  countryName: string | null
  dark: boolean
}

export function ShareButton({ indicatorName, year, countryName, dark }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const muted = dark ? '#8B8B8B' : '#525960'
  const border = dark ? '#2D2D2D' : '#E8E4DC'
  const bg = dark ? 'rgba(26,26,26,0.95)' : 'rgba(255,255,255,0.95)'

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
    <button
      onClick={handleShare}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 25,
        width: 32,
        height: 32,
        borderRadius: 6,
        border: `1px solid ${border}`,
        background: copied ? (dark ? '#E8384F' : '#C8102E') : bg,
        backdropFilter: 'blur(8px)',
        color: copied ? '#fff' : muted,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        transition: 'background 0.15s, color 0.15s',
      }}
      title={copied ? 'Copied!' : 'Share'}
    >
      {copied ? '✓' : '↗'}
    </button>
  )
}
