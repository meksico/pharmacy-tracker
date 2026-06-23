import { useLang } from '../i18n/index.jsx'
import { Button } from '../ds/components/core/Button.jsx'
import { IconButton } from '../ds/components/core/IconButton.jsx'
import { Card } from '../ds/components/core/Card.jsx'

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: '100%', height: '100%' }}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function ItemDetail({ row, onEdit, onClose }) {
  const { lang, t } = useLang()

  function Field({ label, value, mono = false, fullWidth = false }) {
    return (
      <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
        <div style={{ font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-mono)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 5 }}>
          {label}
        </div>
        <div style={{
          font: mono
            ? 'var(--weight-medium) var(--text-sm)/1.4 var(--font-mono)'
            : 'var(--weight-regular) var(--text-sm)/1.4 var(--font-sans)',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        }}>
          {value || '—'}
        </div>
      </div>
    )
  }

  const qty = [row['Quantity'], row['Unit']].filter(Boolean).join(' ')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,20,20,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-panel)',
          width: '100%', maxWidth: 560,
          maxHeight: '90vh', overflowY: 'auto',
          padding: '24px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <IconButton variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Title */}
        <h2 style={{ font: 'var(--weight-bold) var(--type-heading) var(--font-expanded)', color: 'var(--text-primary)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: '0 40px 20px 0' }}>
          {row['Title']}
        </h2>

        {/* Fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px', marginBottom: 24 }}>
          <Field
            label="КАТЕГОРІЯ"
            value={(lang === 'uk' ? row['Category UA'] : '') || t('cat.' + row['Category']) || row['Category']}
          />
          <Field
            label="СИМПТОМИ"
            value={(lang === 'uk' ? row['Conditions UA'] : '') || row['Conditions']}
          />
          <Field label="КІЛЬКІСТЬ"   value={qty} mono />
          <Field label="ТЕРМІН ПРИДАТНОСТІ" value={row['Expiration Date']} mono />
          <Field label="СТАТУС"      value={t('status.' + row['Status']) || row['Status']} />
          <Field label="КОРОБКА"     value={row['Box']} mono />
          <Field label="ДАТА ДОДАВАННЯ" value={row['Date Added']} mono />
          <Field
            label="ПРИМІТКИ"
            value={(lang === 'uk' ? row['Notes UA'] : '') || row['Notes']}
            fullWidth
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>{t('detail.close')}</Button>
          <Button variant="routine" onClick={() => onEdit(row)} style={{ color: 'var(--grey-50)' }}>{t('detail.edit')}</Button>
        </div>
      </div>
    </div>
  )
}
