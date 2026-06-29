import './index.css'

import { requestExpandedMode } from '@devvit/web/client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

function Splash() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', gap: 16, background: '#111111', color: '#E8E4DC',
      fontFamily: "'Source Serif 4', serif, system-ui",
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif, system-ui",
        fontSize: 28, fontWeight: 900, letterSpacing: -0.5,
      }}>
        World Atlas<span style={{ color: '#E8384F' }}>.</span>
      </div>
      <div style={{ fontSize: 13, color: '#8B8B8B', maxWidth: 260, textAlign: 'center' }}>
        Explore global indicators on an interactive globe
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          style={{
            padding: '10px 32px', borderRadius: 20, border: 'none',
            background: '#E8384F', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Source Serif 4', serif, system-ui",
          }}
        >
          Open Globe
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'quiz')}
            style={{
              padding: '8px 18px', borderRadius: 16,
              border: '1px solid #2D2D2D', background: 'transparent',
              color: '#E8E4DC', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Guess Country
          </button>
          <button
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'higher')}
            style={{
              padding: '8px 18px', borderRadius: 16,
              border: '1px solid #2D2D2D', background: 'transparent',
              color: '#E8E4DC', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Higher or Lower
          </button>
          <button
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'sort')}
            style={{
              padding: '8px 18px', borderRadius: 16,
              border: '1px solid #2D2D2D', background: 'transparent',
              color: '#E8E4DC', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Rank It
          </button>
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 12,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#525960',
      }}>
        r/Res_Publica_DE
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
)
