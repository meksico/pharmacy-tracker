import { useState, useEffect } from 'react'
import { getRows } from '../sheets.js'
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

  if (loading) return <p className="state-msg">Loading…</p>
  if (error) return <p className="error">Could not load inventory: {error}</p>

  const expired = rows
    .filter((r) => { const d = parseExpiry(r['Expiration Date']); return d && daysUntil(d) < 0 })
    .sort((a, b) => parseExpiry(a['Expiration Date']) - parseExpiry(b['Expiration Date']))

  const soon = rows
    .filter((r) => { const d = parseExpiry(r['Expiration Date']); return d && daysUntil(d) >= 0 && daysUntil(d) <= 30 })
    .sort((a, b) => parseExpiry(a['Expiration Date']) - parseExpiry(b['Expiration Date']))

  if (expired.length === 0 && soon.length === 0) {
    return <p className="state-msg">No expired or expiring items. All good!</p>
  }

  return (
    <div className="expiry-dashboard">
      <Section title="Expired" rows={expired} variant="expired" onRowClick={setDetailTarget} />
      <Section title="Expiring within 30 days" rows={soon} variant="soon" onRowClick={setDetailTarget} />

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

function Section({ title, rows, variant, onRowClick }) {
  if (rows.length === 0) return null
  return (
    <section className={`expiry-section expiry-section--${variant}`}>
      <h3 className="expiry-section-title">{title} ({rows.length})</h3>
      <div className="table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Expires</th>
              <th>Box</th>
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
                <td>{row['Category']}</td>
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
