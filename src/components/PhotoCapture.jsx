import { IconButton } from '../ds/components/core/IconButton.jsx'

const RemoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function PhotoCapture({ photos, onRemove }) {
  if (photos.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
      {photos.map((src, i) => (
        <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 80, height: 80,
            background: 'var(--bg-sunken)',
            boxShadow: 'var(--shadow-inset)',
            border: '1px solid var(--border-channel)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            <img src={src} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ position: 'absolute', top: -8, right: -8 }}>
            <IconButton
              variant="critical"
              size="sm"
              aria-label="Remove photo"
              onClick={() => onRemove(i)}
            >
              <RemoveIcon />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  )
}
