import { useState, useEffect } from 'react'
import { getRows } from '../sheets.js'
import ItemForm from './ItemForm.jsx'

function expiryClass(dateStr) {
  if (!dateStr) return ''
  // Handle YYYY-MM (from month input) by treating it as the 1st of the month
  const normalized = /^\d{4}-\d{2}$/.test(dateStr) ? dateStr + '-01' : dateStr
  const expiry = new Date(normalized)
  if (isNaN(expiry)) return ''
  const daysUntil = (expiry - Date.now()) / 86_400_000
  if (daysUntil < 0) return 'row--expired'
  if (daysUntil <= 30) return 'row--expiring-soon'
  return ''
}

export default function InventoryList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formMode, setFormMode] = useState(null) // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await getRows())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleAdd() {
    setEditTarget(null)
    setFormMode('add')
  }

  function handleEdit(row) {
    setEditTarget(row)
    setFormMode('edit')
  }

  function handleFormDone() {
    setFormMode(null)
    setEditTarget(null)
    load()
  }

  if (formMode) {
    return (
      <ItemForm
        mode={formMode}
        initialData={editTarget}
        onSave={handleFormDone}
        onCancel={() => setFormMode(null)}
      />
    )
  }

  const expiringSoon = rows.filter((r) => expiryClass(r['Expiration Date']) === 'row--expiring-soon')
  const expired = rows.filter((r) => expiryClass(r['Expiration Date']) === 'row--expired')

  return (
    <div className="inventory">
      <div className="inventory-toolbar">
        <h2>Inventory ({rows.length} items)</h2>
        <button className="btn-primary" onClick={handleAdd}>+ Add item</button>
      </div>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="alert-bar">
          {expired.length > 0 && (
            <span className="alert alert--expired">{expired.length} expired</span>
          )}
          {expiringSoon.length > 0 && (
            <span className="alert alert--soon">{expiringSoon.length} expiring within 30 days</span>
          )}
        </div>
      )}

      {loading && <p className="state-msg">Loading…</p>}
      {error && <p className="error">Could not load inventory: {error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="state-msg">No items yet. Add your first medication above.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Conditions / Symptoms</th>
                <th>Qty</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._rowIndex} className={expiryClass(row['Expiration Date'])}>
                  <td>{row['Title']}</td>
                  <td>{row['Category']}</td>
                  <td>{row['Conditions']}</td>
                  <td>{row['Quantity']}{row['Unit'] ? ` ${row['Unit']}` : ''}</td>
                  <td>{row['Expiration Date']}</td>
                  <td>{row['Status']}</td>
                  <td className="td-notes">{row['Notes']}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(row)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
