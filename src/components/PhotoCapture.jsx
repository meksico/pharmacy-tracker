import { useRef, useState } from 'react'

// Resize image to max 900px on longest side and compress to JPEG before sending.
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
  const [preview, setPreview] = useState(null)
  const [imageData, setImageData] = useState(null)
  const [status, setStatus] = useState('idle') // idle | recognizing | error
  const [errorMsg, setErrorMsg] = useState(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await resizeImage(file)
    setPreview(dataUrl)
    setImageData(dataUrl)
    setStatus('idle')
    setErrorMsg(null)
  }

  async function handleRecognize() {
    if (!imageData) return
    setStatus('recognizing')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      onResult(data)
      // Reset after success so the capture area collapses
      setPreview(null)
      setImageData(null)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  function handleClear() {
    setPreview(null)
    setImageData(null)
    setStatus('idle')
    setErrorMsg(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="photo-capture">
      {!preview && (
        <>
          <p className="photo-hint">Optional: scan packaging to fill the form automatically.</p>
          <div className="photo-buttons">
            <button
              type="button"
              className="btn-photo"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute('capture')
                  inputRef.current.click()
                }
              }}
            >
              Upload photo
            </button>
            <button
              type="button"
              className="btn-photo"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.setAttribute('capture', 'environment')
                  inputRef.current.click()
                }
              }}
            >
              Take photo
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </>
      )}

      {preview && (
        <div className="photo-preview-area">
          <img src={preview} alt="Packaging preview" className="photo-preview" />
          <div className="photo-actions">
            <button type="button" onClick={handleClear} disabled={status === 'recognizing'}>
              Clear
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleRecognize}
              disabled={status === 'recognizing'}
            >
              {status === 'recognizing' ? 'Recognising…' : 'Fill form from photo'}
            </button>
          </div>
          {status === 'error' && (
            <p className="error">Recognition failed: {errorMsg}. Fill the form manually.</p>
          )}
        </div>
      )}
    </div>
  )
}
