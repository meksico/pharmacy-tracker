import { useState, useEffect } from 'react'
import { getRows } from '../sheets.js'
import { useLang } from '../i18n/index.jsx'
import ItemForm from './ItemForm.jsx'
import ItemDetail from './ItemDetail.jsx'

function expiryClass(dateStr) {
  if (!dateStr) return ''
  const normalized = /^\d{4}-\d{2}$/.test(dateStr) ? dateStr + '-01' : dateStr
  const expiry = new Date(normalized)
  if (isNaN(expiry)) return ''
  const daysUntil = (expiry - Date.now()) / 86_400_000
  if (daysUntil < 0) return 'row--expired'
  if (daysUntil <= 30) return 'row--expiring-soon'
  return ''
}

export default function InventoryList() {
  const { lang, t } = useLang()
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
        <h2>{t('inv.heading', { n: rows.length })}</h2>
        <input
          className="search-input"
          type="search"
          placeholder={t('inv.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">{t('inv.allCategories')}</option>
          {categories.map((c) => <option key={c} value={c}>{t('cat.' + c) || c}</option>)}
        </select>
        <button className="btn-primary" onClick={handleAdd}>{t('inv.addItem')}</button>
      </div>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="alert-bar">
          {expired.length > 0 && (
            <span className="alert alert--expired">{t('inv.alertExpired', { n: expired.length })}</span>
          )}
          {expiringSoon.length > 0 && (
            <span className="alert alert--soon">{t('inv.alertSoon', { n: expiringSoon.length })}</span>
          )}
        </div>
      )}

      {loading && <p className="state-msg">{t('inv.loading')}</p>}
      {error && <p className="error">{t('inv.loadError', { error })}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="state-msg">{t('inv.empty')}</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th className="th-sortable" onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}>
                  {t('inv.colTitle')} {sortDir === 'asc' ? '↑' : '↓'}
                </th>
                <th>{t('inv.colCategory')}</th>
                <th>{t('inv.colExpires')}</th>
                <th>{t('inv.colBox')}</th>
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
                  <td>{(lang === 'uk' ? row['Category UA'] : '') || t('cat.' + row['Category']) || row['Category']}</td>
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
