import { useLang } from '../i18n/index.jsx'

export default function ItemDetail({ row, onEdit, onClose }) {
  const { t } = useLang()

  function Field({ label, value }) {
    return (
      <div className="detail-field">
        <span className="detail-label">{label}</span>
        <span className="detail-value">{value || '—'}</span>
      </div>
    )
  }

  const qty = [row['Quantity'], row['Unit']].filter(Boolean).join(' ')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">{row['Title']}</h2>

        <div className="detail-grid">
          <Field label={t('detail.category')}  value={t('cat.' + row['Category']) || row['Category']} />
          <Field label={t('detail.conditions')} value={row['Conditions']} />
          <Field label={t('detail.quantity')}   value={qty} />
          <Field label={t('detail.expiration')} value={row['Expiration Date']} />
          <Field label={t('detail.status')}     value={t('status.' + row['Status']) || row['Status']} />
          <Field label={t('detail.box')}        value={row['Box']} />
          <Field label={t('detail.dateAdded')}  value={row['Date Added']} />
          <Field label={t('detail.notes')}      value={row['Notes']} />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>{t('detail.close')}</button>
          <button className="btn-primary" onClick={() => onEdit(row)}>{t('detail.edit')}</button>
        </div>
      </div>
    </div>
  )
}
