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
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const bg = dark ? 'rgba(20,20,30,0.92)' : 'rgba(255,255,255,0.95)'

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
        background: copied ? '#3b82f6' : bg,
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
