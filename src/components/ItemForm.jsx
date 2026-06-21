import { useState, useRef } from 'react'
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
  Box: '1',
}

const BOX_KEY = 'hp_last_box'

export default function ItemForm({ mode, initialData, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    if (initialData) return { ...initialData }
    return { ...EMPTY_FORM, Box: localStorage.getItem(BOX_KEY) ?? '1' }
  })
  const [saving, setSaving] = useState(false) // false | 'save' | 'next'
  const [error, setError] = useState(null)
  const [savedCount, setSavedCount] = useState(0)
  const titleRef = useRef(null)

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'Box') localStorage.setItem(BOX_KEY, value)
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving('save')
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

  async function handleAddNext(e) {
    e.preventDefault()
    setSaving('next')
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await appendRow({ ...form, 'Date Added': today })
      const box = form['Box']
      setForm({ ...EMPTY_FORM, Box: box })
      setSavedCount((n) => n + 1)
      setSaving(false)
      setTimeout(() => titleRef.current?.focus(), 50)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  function handlePhotoResult(data) {
    setForm((prev) => ({
      ...prev,
      ...(data.title          && { Title: data.title }),
      ...(data.category       && { Category: data.category }),
      ...(data.conditions     && { Conditions: data.conditions }),
      ...(data.quantity       && { Quantity: data.quantity }),
      ...(data.unit           && { Unit: data.unit }),
      ...(data.expirationDate && { 'Expiration Date': data.expirationDate }),
      ...(data.notes          && { Notes: data.notes }),
    }))
  }

  const title = mode === 'add' ? 'Add item' : 'Edit item'
  const submitLabel = mode === 'add' ? 'Add item' : 'Save changes'

  return (
    <div className="form-container">
      <h2>{title}</h2>
      <form onSubmit={handleSubmit}>

        <label>
          Title *
          <input
            ref={titleRef}
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

        <div className="form-row">
          <label>
            Status
            <select name="Status" value={form['Status']} onChange={handleChange}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Box #
            <input
              name="Box"
              type="number"
              min="1"
              value={form['Box']}
              onChange={handleChange}
            />
          </label>
        </div>

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

        {mode === 'add' && <PhotoCapture onResult={handlePhotoResult} />}

        {error && <p className="error">{error}</p>}
        {savedCount > 0 && (
          <p className="form-saved-flash">✓ Saved ({savedCount} added)</p>
        )}

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={!!saving}>
            Cancel
          </button>
          {mode === 'add' ? (
            <button type="button" className="btn-secondary" onClick={handleAddNext} disabled={!!saving}>
              {saving === 'next' ? 'Saving…' : 'Add next item'}
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={!!saving}>
              {saving === 'save' ? 'Saving…' : submitLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
