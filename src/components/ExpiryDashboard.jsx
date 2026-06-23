import { useState, useEffect } from 'react'
import { getRows } from '../sheets.js'
import { useLang } from '../i18n/index.jsx'
import ItemDetail from './ItemDetail.jsx'

function parseExpiry(dateStr) {
  if (!dateStr) return null
  const normalized = /^\d{4}-\d{2}$/.test(dateStr) ? dateStr + '-01' : dateStr
  const d = new Date(normalized)
  return isNaN(d) ? null : d
}

function daysUntil(date) {
  return (date - Date.now()) / 86_400_000
}

export default function ExpiryDashboard() {
  const { lang, t } = useLang()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)

  useEffect(() => {
    setLoading(true)
    getRows()
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <p style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
        {t('inv.loading')}
      </p>
    )
  }
  if (error) {
    return (
      <p style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
        {t('expiry.loadError', { error })}
      </p>
    )
  }

  const expired = rows
    .filter((r) => { const d = parseExpiry(r['Expiration Date']); return d && daysUntil(d) < 0 })
    .sort((a, b) => parseExpiry(a['Expiration Date']) - parseExpiry(b['Expiration Date']))

  const soon = rows
    .filter((r) => { const d = parseExpiry(r['Expiration Date']); return d && daysUntil(d) >= 0 && daysUntil(d) <= 30 })
    .sort((a, b) => parseExpiry(a['Expiration Date']) - parseExpiry(b['Expiration Date']))

  if (expired.length === 0 && soon.length === 0) {
    return (
      <p style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
        {t('expiry.allGood')}
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Section title={t('expiry.sectionExpired')} rows={expired} variant="expired" onRowClick={setDetailTarget} lang={lang} t={t} />
      <Section title={t('expiry.sectionSoon')}    rows={soon}    variant="soon"    onRowClick={setDetailTarget} lang={lang} t={t} />

      {detailTarget && (
        <ItemDetail
          row={detailTarget}
          onEdit={() => {}}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}

function Section({ title, rows, variant, onRowClick, lang, t }) {
  if (rows.length === 0) return null

  const isExpired = variant === 'expired'
  const grooveColor = isExpired ? 'var(--grey-900)' : 'var(--grey-400)'

  return (
    <section>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {isExpired
          ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange-500)', flexShrink: 0 }} />
          : <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--grey-400)', flexShrink: 0 }} />
        }
        <h3 style={{ font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', margin: 0 }}>
          {title}
        </h3>
        <span style={{ font: 'var(--weight-bold) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          ({rows.length})
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row) => (
          <div
            key={row._rowIndex}
            onClick={() => onRowClick(row)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px',
              background: 'var(--surface-raised)',
              border: '1px solid rgba(0,0,0,0.14)',
              borderLeft: `3px solid ${grooveColor}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-key)',
              cursor: 'pointer',
              transition: 'background var(--dur-fast) var(--ease-mech)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--grey-50)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)', color: 'var(--text-primary)', marginBottom: 3 }}>
                {row['Title']}
              </div>
              <div style={{ font: 'var(--weight-regular) var(--text-xs)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
                {(lang === 'uk' ? row['Category UA'] : '') || t('cat.' + row['Category']) || row['Category']}
              </div>
            </div>
            <div style={{ flexShrink: 0, marginLeft: 16, textAlign: 'right' }}>
              <div style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', marginBottom: 3 }}>
                {row['Expiration Date']}
              </div>
              <div style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                КОР {row['Box']}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
