import { useState, useRef } from 'react'
import { appendRow, updateRow } from '../sheets.js'
import { getOpenAIKey } from '../config.js'
import { useLang } from '../i18n/index.jsx'
import { Button } from '../ds/components/core/Button.jsx'
import { Input } from '../ds/components/forms/Input.jsx'
import { Select } from '../ds/components/forms/Select.jsx'
import { TapeReel } from '../ds/components/data/TapeReel.jsx'
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

export default function ItemForm({ mode, initialData, onSave, onCancel }) {
  const { t } = useLang()

  const [form, setForm] = useState(() => {
    if (initialData) return { ...initialData }
    return { ...EMPTY_FORM, Box: localStorage.getItem(BOX_KEY) ?? '1' }
  })
  const [saving, setSaving] = useState(false)
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

  const monoLabelStyle = {
    font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)',
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: 6,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ font: 'var(--weight-bold) var(--type-heading) var(--font-expanded)', color: 'var(--text-primary)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: '0 0 20px' }}>
        {mode === 'add' ? t('form.addTitle') : t('form.editTitle')}
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <Input
          ref={titleRef}
          label={`${t('form.labelTitle')}${mode === 'add' ? ' *' : ''}`}
          name="Title"
          value={form['Title']}
          onChange={handleChange}
          placeholder={t('form.phTitle')}
          required
        />

        <Select label={t('form.labelCategory')} name="Category" value={form['Category']} onChange={handleChange}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{t('cat.' + c)}</option>)}
        </Select>

        <Input
          label={t('form.labelConditions')}
          name="Conditions"
          value={form['Conditions']}
          onChange={handleChange}
          placeholder={t('form.phConditions')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label={t('form.labelQuantity')}
            name="Quantity"
            type="number"
            min="0"
            mono
            value={form['Quantity']}
            onChange={handleChange}
          />
          <Input
            label={t('form.labelUnit')}
            name="Unit"
            value={form['Unit']}
            onChange={handleChange}
            placeholder={t('form.phUnit')}
          />
        </div>

        <Input
          label={`${t('form.labelExpDate')}${mode === 'add' ? ' *' : ''}`}
          name="Expiration Date"
          type="month"
          mono
          value={form['Expiration Date']}
          onChange={handleChange}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label={t('form.labelStatus')} name="Status" value={form['Status']} onChange={handleChange}>
            {STATUSES.map((s) => <option key={s} value={s}>{t('status.' + s)}</option>)}
          </Select>
          <Input
            label={t('form.labelBox')}
            name="Box"
            type="number"
            min="1"
            mono
            value={form['Box']}
            onChange={handleChange}
          />
        </div>

        {/* Notes — recessed multiline well */}
        <div>
          <span style={monoLabelStyle}>{t('form.labelNotes')}</span>
          <textarea
            name="Notes"
            value={form['Notes']}
            onChange={handleChange}
            rows={3}
            placeholder={t('form.phNotes')}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              padding: '10px 12px',
              background: 'var(--grey-50)',
              border: '1px solid var(--border-channel)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-inset)',
              font: 'var(--weight-regular) var(--text-sm)/1.5 var(--font-sans)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {mode === 'add' && <PhotoCapture photos={photos} onRemove={removePhoto} />}

        {recognizing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TapeReel spinning size={36} />
            <span style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: 'var(--tracking-mono)', textTransform: 'uppercase' }}>OCR</span>
          </div>
        )}

        {error && (
          <p style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
            {error}
          </p>
        )}
        {recognizeError && (
          <p style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
            {t('form.recognizeError', { error: recognizeError })}
          </p>
        )}
        {savedCount > 0 && (
          <p style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', margin: 0 }}>
            {t('form.savedFlash', { n: savedCount })}
          </p>
        )}

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

      {/* Sticky bottom action bar */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-hairline)',
        marginTop: 20,
        padding: '14px 0 4px',
        display: 'flex', gap: 8, flexWrap: 'wrap',
      }}>
        <Button variant="ghost" type="button" onClick={onCancel} disabled={!!saving}>
          {t('form.cancel')}
        </Button>

        {mode === 'add' && photos.length > 0 && (
          <Button variant="surface" type="button" onClick={handleRecognize} disabled={recognizing}>
            {recognizing ? t('form.recognizing') : t('form.fillForm')}
          </Button>
        )}

        {mode === 'add' && photos.length < MAX_PHOTOS && (
          <Button variant="surface" type="button" onClick={openCamera}>
            {t('form.takePhoto')}
          </Button>
        )}

        {mode === 'add' ? (
          <Button
            variant="routine"
            type="button"
            onClick={handleAddNext}
            disabled={!!saving || !canAddNext}
            style={{ color: 'var(--grey-50)', marginLeft: 'auto' }}
          >
            {saving === 'next' ? t('form.saving') : t('form.addNext')}
          </Button>
        ) : (
          <Button
            variant="routine"
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!!saving}
            style={{ color: 'var(--grey-50)', marginLeft: 'auto' }}
          >
            {saving === 'save' ? t('form.saving') : t('form.save')}
          </Button>
        )}
      </div>
    </div>
  )
}
