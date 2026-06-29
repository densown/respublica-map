import { FONT } from './theme'

type RulesOverlayProps = {
  title: string
  rules: string[]
  onClose: () => void
}

export function RulesOverlay({ title, rules, onClose }: RulesOverlayProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1A1A1A', borderRadius: 14,
          border: '1px solid #2D2D2D', padding: '28px 24px',
          maxWidth: 320, width: '100%',
        }}
      >
        <div style={{
          fontFamily: FONT.display, fontSize: 22, fontWeight: 900,
          color: '#E8E4DC', marginBottom: 20, textAlign: 'center',
        }}>
          {title}<span style={{ color: '#E8384F' }}>.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {rules.map((rule, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: FONT.mono, fontSize: 11, fontWeight: 700,
                color: '#E8384F', minWidth: 18, lineHeight: '20px',
              }}>
                {i + 1}.
              </span>
              <span style={{
                fontFamily: FONT.body, fontSize: 13, color: '#E8E4DC',
                lineHeight: '20px',
              }}>
                {rule}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 20,
            border: 'none', background: '#E8384F', color: '#fff',
            fontFamily: FONT.body, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Los geht's
        </button>
      </div>
    </div>
  )
}

export function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 50,
        width: 28, height: 28, borderRadius: '50%',
        border: '1px solid #2D2D2D', background: 'rgba(26,26,26,0.9)',
        color: '#8B8B8B', fontFamily: FONT.mono, fontSize: 13, fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      ?
    </button>
  )
}
