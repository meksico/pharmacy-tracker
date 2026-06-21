import { useState, useRef } from 'react'
import { appendRow, updateRow } from '../sheets.js'
import { getOpenAIKey } from '../config.js'
import { useLang } from '../i18n/index.jsx'
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
const MAX_PHOTOS = 5

const PHOTO_PROMPT = `Analyze this medication or first-aid product packaging photo.
Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:
{
  "title": "product name and dosage/strength (e.g. Ibuprofen 400mg)",
  "category": "exactly one of: Pain Relief, Wound Care, Cold & Flu, Digestive, Allergy, Other",
  "conditions": "comma-separated symptoms or conditions this treats (e.g. headache, fever, pain)",
  "quantity": "numeric count visible on packaging (e.g. 30, 200, 10), or empty string if not visible",
  "unit": "unit of measurement (e.g. tablets, capsules, ml, g, pcs), or empty string if not visible",
  "expirationDate": "expiry in YYYY-MM format if visible, otherwise empty string",
  "notes": "one-sentence product description"
}
If you cannot read the packaging clearly, make your best guess and leave unknown fields as empty strings.`

function resizeImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 900
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = objectUrl
  })
}

function filledClass(val) {
  if (val == null || val === '') return ''
  return 'field--filled'
}

export default function ItemForm({ mode, initialData, onSave, onCancel }) {
  const { t } = useLang()

  const [form, setForm] = useState(() => {
    if (initialData) return { ...initialData }
    return { ...EMPTY_FORM, Box: localStorage.getItem(BOX_KEY) ?? '1' }
  })
  const [saving, setSaving] = useState(false) // false | 'save' | 'next'
  const [error, setError] = useState(null)
  const [savedCount, setSavedCount] = useState(0)

  const [photos, setPhotos] = useState([])
  const [recognizing, setRecognizing] = useState(false)
  const [recognizeError, setRecognizeError] = useState(null)

  const titleRef = useRef(null)
  const formRef = useRef(null)
  const inputRef = useRef(null)

  const canAddNext = !!form['Title'].trim() && !!form['Expiration Date']

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
      await updateRow(initialData._rowIndex, form)
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  async function handleAddNext() {
    setSaving('next')
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await appendRow({ ...form, 'Date Added': today })
      const box = form['Box']
      setForm({ ...EMPTY_FORM, Box: box })
      setPhotos([])
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

  function openCamera() {
    if (!inputRef.current) return
    inputRef.current.setAttribute('capture', 'environment')
    inputRef.current.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const dataUrl = await resizeImage(file)
    setPhotos((prev) => [...prev, dataUrl])
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleRecognize() {
    if (photos.length === 0) return
    setRecognizing(true)
    setRecognizeError(null)
    try {
      const apiKey = await getOpenAIKey()
      if (!apiKey) throw new Error('OPENAI_API_KEY not found in the Config sheet tab')

      const imageContent = photos.map((url) => ({
        type: 'image_url',
        image_url: { url, detail: 'low' },
      }))

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: PHOTO_PROMPT }] }],
          max_tokens: 300,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`)

      let text = json.choices[0].message.content.trim()
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      handlePhotoResult(JSON.parse(text))
      setPhotos([])
    } catch (err) {
      setRecognizeError(err.message)
    } finally {
      setRecognizing(false)
    }
  }

  return (
    <div className="form-container">
      <h2>{mode === 'add' ? t('form.addTitle') : t('form.editTitle')}</h2>
      <form ref={formRef} onSubmit={handleSubmit}>

        <label>
          {t('form.labelTitle')}{mode === 'add' ? ' *' : ''}
          <input
            ref={titleRef}
            className={filledClass(form['Title'])}
            name="Title"
            value={form['Title']}
            onChange={handleChange}
            placeholder={t('form.phTitle')}
            required
          />
        </label>

        <label>
          {t('form.labelCategory')}
          <select className={filledClass(form['Category'])} name="Category" value={form['Category']} onChange={handleChange}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t('cat.' + c)}</option>)}
          </select>
        </label>

        <label>
          {t('form.labelConditions')}
          <input
            className={filledClass(form['Conditions'])}
            name="Conditions"
            value={form['Conditions']}
            onChange={handleChange}
            placeholder={t('form.phConditions')}
          />
        </label>

        <div className="form-row">
          <label>
            {t('form.labelQuantity')}
            <input
              className={filledClass(form['Quantity'])}
              name="Quantity"
              type="number"
              min="0"
              value={form['Quantity']}
              onChange={handleChange}
            />
          </label>
          <label>
            {t('form.labelUnit')}
            <input
              className={filledClass(form['Unit'])}
              name="Unit"
              value={form['Unit']}
              onChange={handleChange}
              placeholder={t('form.phUnit')}
            />
          </label>
        </div>

        <label>
          {t('form.labelExpDate')}{mode === 'add' ? ' *' : ''}
          <input
            className={filledClass(form['Expiration Date'])}
            name="Expiration Date"
            type="month"
            value={form['Expiration Date']}
            onChange={handleChange}
          />
        </label>

        <div className="form-row">
          <label>
            {t('form.labelStatus')}
            <select className={filledClass(form['Status'])} name="Status" value={form['Status']} onChange={handleChange}>
              {STATUSES.map((s) => <option key={s} value={s}>{t('status.' + s)}</option>)}
            </select>
          </label>
          <label>
            {t('form.labelBox')}
            <input
              className={filledClass(form['Box'])}
              name="Box"
              type="number"
              min="1"
              value={form['Box']}
              onChange={handleChange}
            />
          </label>
        </div>

        <label>
          {t('form.labelNotes')}
          <textarea
            className={filledClass(form['Notes'])}
            name="Notes"
            value={form['Notes']}
            onChange={handleChange}
            rows={3}
            placeholder={t('form.phNotes')}
          />
        </label>

        {mode === 'add' && <PhotoCapture photos={photos} onRemove={removePhoto} />}

        {error && <p className="error">{error}</p>}
        {recognizeError && <p className="error">{t('form.recognizeError', { error: recognizeError })}</p>}
        {savedCount > 0 && <p className="form-saved-flash">{t('form.savedFlash', { n: savedCount })}</p>}

        {mode === 'add' && (
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        )}
      </form>

      <div className="form-bottom-bar">
        <div className="form-bottom-inner">
          <button type="button" className="btn-square btn-cancel" onClick={onCancel} disabled={!!saving}>
            {t('form.cancel')}
          </button>

          {mode === 'add' && photos.length > 0 && (
            <button type="button" className="btn-square btn-secondary" onClick={handleRecognize} disabled={recognizing}>
              {recognizing ? t('form.recognizing') : t('form.fillForm')}
            </button>
          )}

          {mode === 'add' && photos.length < MAX_PHOTOS && (
            <button type="button" className="btn-square btn-secondary" onClick={openCamera}>
              {t('form.takePhoto')}
            </button>
          )}

          {mode === 'add' ? (
            <button
              type="button"
              className="btn-square btn-primary"
              onClick={handleAddNext}
              disabled={!!saving || !canAddNext}
            >
              {saving === 'next' ? t('form.saving') : t('form.addNext')}
            </button>
          ) : (
            <button
              type="button"
              className="btn-square btn-primary"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={!!saving}
            >
              {saving === 'save' ? t('form.saving') : t('form.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
