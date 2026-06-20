import { useState } from 'react'
import { appendRow, updateRow } from '../sheets.js'
import PhotoCapture from './PhotoCapture.jsx'

const CATEGORIES = ['Pain Relief', 'Wound Care', 'Cold & Flu', 'Digestive', 'Allergy', 'Other']
const STATUSES = ['Active', 'Low', 'Empty', 'Expired']

const EMPTY_FORM = {
  Title: '',
  Category: 'Pain Relief',
  Conditions: '',
  Quantity: '',
  Unit: '',
  'Expiration Date': '',
  Notes: '',
  Status: 'Active',
}

export default function ItemForm({ mode, initialData, onSave, onCancel }) {
  const [form, setForm] = useState(
    initialData
      ? { ...initialData }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (mode === 'add') {
        const today = new Date().toISOString().slice(0, 10)
        await appendRow({ ...form, 'Date Added': today })
      } else {
        await updateRow(initialData._rowIndex, form)
      }
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  // Called when PhotoCapture returns recognised fields from the API
  function handlePhotoResult(data) {
    setForm((prev) => ({
      ...prev,
      ...(data.title        && { Title: data.title }),
      ...(data.category     && { Category: data.category }),
      ...(data.conditions   && { Conditions: data.conditions }),
      ...(data.expirationDate && { 'Expiration Date': data.expirationDate }),
      ...(data.notes        && { Notes: data.notes }),
    }))
  }

  const title = mode === 'add' ? 'Add item' : 'Edit item'
  const submitLabel = mode === 'add' ? 'Add item' : 'Save changes'

  return (
    <div className="form-container">
      <h2>{title}</h2>
      {mode === 'add' && <PhotoCapture onResult={handlePhotoResult} />}
      <form onSubmit={handleSubmit}>

        <label>
          Title *
          <input
            name="Title"
            value={form['Title']}
            onChange={handleChange}
            placeholder="e.g. Ibuprofen 400mg"
            required
          />
        </label>

        <label>
          Category
          <select name="Category" value={form['Category']} onChange={handleChange}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <label>
          Conditions / Symptoms
          <input
            name="Conditions"
            value={form['Conditions']}
            onChange={handleChange}
            placeholder="e.g. headache, fever, pain"
          />
        </label>

        <div className="form-row">
          <label>
            Quantity
            <input
              name="Quantity"
              type="number"
              min="0"
              value={form['Quantity']}
              onChange={handleChange}
            />
          </label>
          <label>
            Unit
            <input
              name="Unit"
              value={form['Unit']}
              onChange={handleChange}
              placeholder="tablets, ml, pcs…"
            />
          </label>
        </div>

        <label>
          Expiration Date
          <input
            name="Expiration Date"
            type="month"
            value={form['Expiration Date']}
            onChange={handleChange}
          />
        </label>

        <label>
          Status
          <select name="Status" value={form['Status']} onChange={handleChange}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>

        <label>
          Notes
          <textarea
            name="Notes"
            value={form['Notes']}
            onChange={handleChange}
            rows={3}
            placeholder="Brand, storage notes, allergies…"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
