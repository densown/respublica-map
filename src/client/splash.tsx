import './index.css'

import { requestExpandedMode } from '@devvit/web/client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

function Splash() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 16,
        background: '#13141f',
        color: '#e0e0e0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: 32, letterSpacing: -1 }}>World Atlas</div>
      <div style={{ fontSize: 13, color: '#888', maxWidth: 260, textAlign: 'center' }}>
        Explore global indicators on an interactive globe
      </div>
      <button
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          borderRadius: 20,
          border: 'none',
          background: '#3b82f6',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
      >
        Open Globe
      </button>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          fontSize: 10,
          color: '#555',
          fontFamily: 'monospace',
        }}
      >
        Res.Publica
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
)
