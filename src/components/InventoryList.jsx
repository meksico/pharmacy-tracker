import { useState, useEffect } from 'react'
import { getRows } from '../sheets.js'
import { useLang } from '../i18n/index.jsx'
import { Button } from '../ds/components/core/Button.jsx'
import { Badge } from '../ds/components/core/Badge.jsx'
import { Input } from '../ds/components/forms/Input.jsx'
import { Select } from '../ds/components/forms/Select.jsx'
import { TapeReel } from '../ds/components/data/TapeReel.jsx'
import ItemForm from './ItemForm.jsx'
import ItemDetail from './ItemDetail.jsx'

function expiryClass(dateStr) {
  if (!dateStr) return ''
  const normalized = /^\d{4}-\d{2}$/.test(dateStr) ? dateStr + '-01' : dateStr
  const expiry = new Date(normalized)
  if (isNaN(expiry)) return ''
  const daysUntil = (expiry - Date.now()) / 86_400_000
  if (daysUntil < 0) return 'expired'
  if (daysUntil <= 30) return 'expiring-soon'
  return ''
}

export default function InventoryList() {
  const { lang, t } = useLang()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formMode, setFormMode] = useState(null)
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

  function handleAdd() { setEditTarget(null); setFormMode('add') }
  function handleEdit(row) { setEditTarget(row); setFormMode('edit') }
  function handleFormDone() { setFormMode(null); setEditTarget(null); load() }
  function handleRowClick(row) { setDetailTarget(row) }
  function handleDetailEdit(row) { setDetailTarget(null); handleEdit(row) }

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

  const expiringSoon = rows.filter((r) => expiryClass(r['Expiration Date']) === 'expiring-soon')
  const expired      = rows.filter((r) => expiryClass(r['Expiration Date']) === 'expired')
  const categories   = [...new Set(rows.map((r) => r['Category']).filter(Boolean))].sort()

  const visibleRows = rows
    .filter((r) => !search || r['Title'].toLowerCase().includes(search.toLowerCase()))
    .filter((r) => !categoryFilter || r['Category'] === categoryFilter)
    .sort((a, b) => {
      const cmp = a['Title'].localeCompare(b['Title'])
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <h2 style={{ font: 'var(--weight-bold) var(--type-heading) var(--font-expanded)', color: 'var(--text-primary)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap', alignSelf: 'center' }}>
          {t('inv.heading', { n: rows.length })}
        </h2>
        <div style={{ flex: 1, minWidth: 160 }}>
          <Input
            placeholder={t('inv.search')}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">{t('inv.allCategories')}</option>
            {categories.map((c) => <option key={c} value={c}>{t('cat.' + c) || c}</option>)}
          </Select>
        </div>
        <Button variant="routine" onClick={handleAdd} style={{ color: 'var(--grey-50)', whiteSpace: 'nowrap' }}>
          + {t('inv.addItem')}
        </Button>
      </div>

      {/* Alert bar */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {expired.length > 0 && (
            <Badge variant="live" dot>{t('inv.alertExpired', { n: expired.length })}</Badge>
          )}
          {expiringSoon.length > 0 && (
            <Badge variant="outline">{t('inv.alertSoon', { n: expiringSoon.length })}</Badge>
          )}
        </div>
      )}

      {/* States */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}>
          <TapeReel spinning size={48} />
          <span style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: 'var(--tracking-mono)' }}>
            {t('inv.loading')}
          </span>
        </div>
      )}
      {error && (
        <p style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
          {t('inv.loadError', { error })}
        </p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
          {t('inv.empty')}
        </p>
      )}

      {/* Table (desktop) / Cards (mobile) */}
      {!loading && rows.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="inv-table-wrap" style={{
            background: 'var(--surface-raised)',
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-key)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-sunken)', boxShadow: 'var(--shadow-inset)' }}>
                  <th
                    onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                    style={{ padding: '10px 14px', font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'left', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--border-channel)' }}
                  >
                    {t('inv.colTitle')} {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                  <th style={{ padding: '10px 14px', font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--border-channel)' }}>
                    {t('inv.colCategory')}
                  </th>
                  <th style={{ padding: '10px 14px', font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--border-channel)' }}>
                    {t('inv.colExpires')}
                  </th>
                  <th style={{ padding: '10px 14px', font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--border-channel)' }}>
                    {t('inv.colBox')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const cls = expiryClass(row['Expiration Date'])
                  const grooveColor = cls === 'expired' ? 'var(--grey-900)' : cls === 'expiring-soon' ? 'var(--grey-400)' : 'transparent'
                  return (
                    <tr
                      key={row._rowIndex}
                      onClick={() => handleRowClick(row)}
                      style={{ cursor: 'pointer', borderLeft: `3px solid ${grooveColor}`, borderBottom: '1px solid var(--border-hairline)', transition: 'background var(--dur-fast) var(--ease-mech)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--grey-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '12px 14px', font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)', color: 'var(--text-primary)' }}>
                        <span>{row['Title']}</span>
                        {cls === 'expired' && <span className="tag-expired" style={{ marginLeft: 8 }}>ПРОСТРОЧЕНО</span>}
                        {cls === 'expiring-soon' && <span className="tag-soon" style={{ marginLeft: 8 }}>≤ 30 ДНІВ</span>}
                      </td>
                      <td style={{ padding: '12px 14px', font: 'var(--weight-regular) var(--text-sm)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
                        {(lang === 'uk' ? row['Category UA'] : '') || t('cat.' + row['Category']) || row['Category']}
                      </td>
                      <td style={{ padding: '12px 14px', font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {row['Expiration Date']}
                      </td>
                      <td style={{ padding: '12px 14px', font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {row['Box']}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="inv-cards-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleRows.map((row) => {
              const cls = expiryClass(row['Expiration Date'])
              const grooveColor = cls === 'expired' ? 'var(--grey-900)' : cls === 'expiring-soon' ? 'var(--grey-400)' : 'transparent'
              return (
                <div
                  key={row._rowIndex}
                  onClick={() => handleRowClick(row)}
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid rgba(0,0,0,0.14)',
                    borderLeft: `3px solid ${grooveColor}`,
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-key)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)', color: 'var(--text-primary)' }}>
                      {row['Title']}
                    </span>
                    <span style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }}>
                      КОР {row['Box']}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ font: 'var(--weight-regular) var(--text-xs)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>
                      {(lang === 'uk' ? row['Category UA'] : '') || t('cat.' + row['Category']) || row['Category']}
                    </span>
                    <span style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {row['Expiration Date']}
                    </span>
                  </div>
                  {cls && (
                    <div style={{ marginTop: 6 }}>
                      {cls === 'expired' && <span className="tag-expired">ПРОСТРОЧЕНО</span>}
                      {cls === 'expiring-soon' && <span className="tag-soon">≤ 30 ДНІВ</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
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
