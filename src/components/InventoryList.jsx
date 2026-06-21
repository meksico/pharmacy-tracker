import { useState, useEffect } from 'react'
import { getRows } from '../sheets.js'
import ItemForm from './ItemForm.jsx'
import ItemDetail from './ItemDetail.jsx'

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
  const [detailTarget, setDetailTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortDir, setSortDir] = useState('asc')

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

  function handleRowClick(row) {
    setDetailTarget(row)
  }

  function handleDetailEdit(row) {
    setDetailTarget(null)
    handleEdit(row)
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

  const categories = [...new Set(rows.map((r) => r['Category']).filter(Boolean))].sort()

  const visibleRows = rows
    .filter((r) => !search || r['Title'].toLowerCase().includes(search.toLowerCase()))
    .filter((r) => !categoryFilter || r['Category'] === categoryFilter)
    .sort((a, b) => {
      const cmp = a['Title'].localeCompare(b['Title'])
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div className="inventory">
      <div className="inventory-toolbar">
        <h2>Inventory ({rows.length} items)</h2>
        <input
          className="search-input"
          type="search"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
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
                <th className="th-sortable" onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}>
                  Title {sortDir === 'asc' ? '↑' : '↓'}
                </th>
                <th>Category</th>
                <th>Expires</th>
                <th>Box</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row._rowIndex}
                  className={expiryClass(row['Expiration Date'])}
                  onClick={() => handleRowClick(row)}
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
      )}

      {detailTarget && (
        <ItemDetail
          row={detailTarget}
          onEdit={handleDetailEdit}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
