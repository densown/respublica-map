import { useState, useCallback } from 'react'
import { getTheme, FONT } from './theme'

// Gemeinsamer Ergebnis-Screen fuer rundenbasierte Spiele
// (Quiz, Rank It und kuenftige Modi).
export type ResultScreenProps = {
  title: string
  score: number
  maxScore: number
  verdict: string
  emojiRow: string
  shareText: string
  earnedInfluence: number
  onRestart: () => void
}

export function ResultScreen({
  title,
  score,
  maxScore,
  verdict,
  emojiRow,
  shareText,
  earnedInfluence,
  onRestart,
}: ResultScreenProps) {
  const t = getTheme(true)
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(() => {
    void navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [shareText])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#111111', color: '#E8E4DC', padding: 24, gap: 16,
    }}>
      <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 900 }}>
        {title}<span style={{ color: t.red }}>.</span>
      </div>
      <div style={{ fontFamily: FONT.display, fontSize: 56, fontWeight: 900, color: t.red, lineHeight: 1 }}>
        {score}/{maxScore}
      </div>
      <div style={{ fontFamily: FONT.body, fontSize: 14, color: t.muted }}>
        {verdict}
      </div>
      {earnedInfluence > 0 && (
        <div style={{
          fontFamily: FONT.mono, fontSize: 11, color: '#D4A843',
          padding: '5px 14px', borderRadius: 14, border: '1px solid rgba(212,168,67,0.35)',
        }}>
          +{earnedInfluence} influence for the World Game
        </div>
      )}
      <div style={{ fontFamily: FONT.mono, fontSize: 18, letterSpacing: 3, margin: '8px 0' }}>
        {emojiRow}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" onClick={handleShare} style={{
          padding: '10px 24px', borderRadius: 20, border: 'none', background: t.red,
          color: '#fff', fontFamily: FONT.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          {copied ? 'Copied!' : 'Share Score'}
        </button>
        <button type="button" onClick={onRestart} style={{
          padding: '10px 24px', borderRadius: 20, border: `1px solid ${t.border}`,
          background: 'transparent', color: t.muted, fontFamily: FONT.mono, fontSize: 12, cursor: 'pointer',
        }}>
          Play Again
        </button>
      </div>
      <div style={{
        position: 'absolute', bottom: 12,
        fontFamily: FONT.mono, fontSize: 10, color: '#525960',
      }}>
        r/Res_Publica_DE
      </div>
    </div>
  )
}
