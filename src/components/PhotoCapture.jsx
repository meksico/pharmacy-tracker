import { useRef, useState } from 'react'

const MAX_PHOTOS = 5

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

export default function PhotoCapture({ onResult }) {
  const inputRef = useRef(null)
  const [photos, setPhotos] = useState([]) // array of base64 data URLs
  const [status, setStatus] = useState('idle') // idle | recognizing | error
  const [errorMsg, setErrorMsg] = useState(null)
  // 'camera' or 'file' — set before programmatically clicking the input
  const captureMode = useRef(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const dataUrl = await resizeImage(file)
    setPhotos((prev) => [...prev, dataUrl])
    setStatus('idle')
    setErrorMsg(null)
  }

  function openPicker(mode) {
    captureMode.current = mode
    if (!inputRef.current) return
    if (mode === 'camera') {
      inputRef.current.setAttribute('capture', 'environment')
    } else {
      inputRef.current.removeAttribute('capture')
    }
    inputRef.current.click()
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleRecognize() {
    if (photos.length === 0) return
    setStatus('recognizing')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: photos }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onResult(data)
      setPhotos([])
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  return (
    <div className="photo-capture">
      <p className="photo-hint">
        Optional: add photos of the packaging to fill the form automatically.
        {photos.length === 0
          ? ' One photo for the product name, another for the expiry date works well.'
          : ` ${photos.length} photo${photos.length > 1 ? 's' : ''} added.`}
      </p>

      {photos.length > 0 && (
        <div className="photo-thumbs">
          {photos.map((src, i) => (
            <div key={i} className="photo-thumb-wrap">
              <img src={src} alt={`Photo ${i + 1}`} className="photo-thumb" />
              <button
                type="button"
                className="photo-thumb-remove"
                onClick={() => removePhoto(i)}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="photo-buttons">
        {photos.length < MAX_PHOTOS && (
          <>
            <button type="button" className="btn-photo" onClick={() => openPicker('file')}>
              {photos.length === 0 ? 'Upload photo' : '+ Add photo'}
            </button>
            <button type="button" className="btn-photo" onClick={() => openPicker('camera')}>
              {photos.length === 0 ? 'Take photo' : '+ Take photo'}
            </button>
          </>
        )}
        {photos.length > 0 && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleRecognize}
            disabled={status === 'recognizing'}
          >
            {status === 'recognizing' ? 'Recognising…' : 'Fill form from photos'}
          </button>
        )}
      </div>

      {status === 'error' && (
        <p className="error" style={{ marginTop: '0.5rem' }}>
          Recognition failed: {errorMsg}. Fill the form manually or retry.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
