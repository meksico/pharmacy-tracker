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
  const { t } = useLang()
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

  if (loading) return <p className="state-msg">{t('inv.loading')}</p>
  if (error) return <p className="error">{t('expiry.loadError', { error })}</p>

  const expired = rows
    .filter((r) => { const d = parseExpiry(r['Expiration Date']); return d && daysUntil(d) < 0 })
    .sort((a, b) => parseExpiry(a['Expiration Date']) - parseExpiry(b['Expiration Date']))

  const soon = rows
    .filter((r) => { const d = parseExpiry(r['Expiration Date']); return d && daysUntil(d) >= 0 && daysUntil(d) <= 30 })
    .sort((a, b) => parseExpiry(a['Expiration Date']) - parseExpiry(b['Expiration Date']))

  if (expired.length === 0 && soon.length === 0) {
    return <p className="state-msg">{t('expiry.allGood')}</p>
  }

  return (
    <div className="expiry-dashboard">
      <Section title={t('expiry.sectionExpired')} rows={expired} variant="expired" onRowClick={setDetailTarget} t={t} />
      <Section title={t('expiry.sectionSoon')} rows={soon} variant="soon" onRowClick={setDetailTarget} t={t} />

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

function Section({ title, rows, variant, onRowClick, t }) {
  if (rows.length === 0) return null
  return (
    <section className={`expiry-section expiry-section--${variant}`}>
      <h3 className="expiry-section-title">{title} ({rows.length})</h3>
      <div className="table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>{t('inv.colTitle')}</th>
              <th>{t('inv.colCategory')}</th>
              <th>{t('inv.colExpires')}</th>
              <th>{t('inv.colBox')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row._rowIndex}
                className={variant === 'expired' ? 'row--expired' : 'row--expiring-soon'}
                onClick={() => onRowClick(row)}
              >
                <td>{row['Title']}</td>
                <td>{t('cat.' + row['Category']) || row['Category']}</td>
                <td>{row['Expiration Date']}</td>
                <td>{row['Box']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
