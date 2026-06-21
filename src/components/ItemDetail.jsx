export default function ItemDetail({ row, onEdit, onClose }) {
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
          <Field label="Category"       value={row['Category']} />
          <Field label="Conditions"     value={row['Conditions']} />
          <Field label="Quantity"       value={qty} />
          <Field label="Expiration"     value={row['Expiration Date']} />
          <Field label="Status"         value={row['Status']} />
          <Field label="Box"            value={row['Box']} />
          <Field label="Date Added"     value={row['Date Added']} />
          <Field label="Notes"          value={row['Notes']} />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={() => onEdit(row)}>Edit</button>
        </div>
      </div>
    </div>
  )
}
