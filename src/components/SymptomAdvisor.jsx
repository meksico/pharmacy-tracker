import { useState, useRef, useEffect } from 'react'
import { getRows } from '../sheets.js'
import { getOpenAIKey } from '../config.js'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const hasSpeech = !!SpeechRecognition

export default function SymptomAdvisor() {
  const [symptoms, setSymptoms] = useState('')
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [answer, setAnswer] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const recogRef = useRef(null)

  useEffect(() => {
    return () => recogRef.current?.stop()
  }, [])

  function toggleMic() {
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      return
    }
    const recog = new SpeechRecognition()
    recog.lang = 'en-US'
    recog.interimResults = false
    recog.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setSymptoms((prev) => (prev ? prev + ' ' + transcript : transcript).trim())
    }
    recog.onend = () => setListening(false)
    recog.onerror = () => setListening(false)
    recog.start()
    recogRef.current = recog
    setListening(true)
  }

  async function handleSubmit() {
    if (!symptoms.trim()) return
    setStatus('loading')
    setAnswer(null)
    setErrorMsg(null)
    try {
      const [rows, apiKey] = await Promise.all([getRows(), getOpenAIKey()])
      if (!apiKey) throw new Error('OPENAI_API_KEY not found in the Config sheet tab')

      const available = rows.filter((r) => r['Status'] === 'Active' || r['Status'] === 'Low')
      if (available.length === 0) throw new Error('No active items in your inventory')

      const inventoryText = available.map((r) => {
        const parts = [`- ${r['Title']}`]
        if (r['Category']) parts.push(`(${r['Category']})`)
        if (r['Conditions']) parts.push(`— for: ${r['Conditions']}`)
        if (r['Box']) parts.push(`[Box ${r['Box']}]`)
        return parts.join(' ')
      }).join('\n')

      const prompt = `You are a home pharmacy assistant. Here is the user's current inventory:\n\n${inventoryText}\n\nSymptoms: ${symptoms.trim()}\n\nWhich of these medicines are most suitable for these symptoms, and why? Be concise (2–4 sentences). End with: "This is not medical advice — consult a doctor for serious symptoms."`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`)

      setAnswer(json.choices[0].message.content.trim())
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="advisor">
      <h2 className="advisor-title">Symptom Advisor</h2>
      <p className="advisor-hint">
        Describe your symptoms and the assistant will suggest what you have in your pharmacy.
      </p>

      <div className="advisor-input-row">
        <textarea
          className="advisor-textarea"
          rows={3}
          placeholder="e.g. headache and mild fever since this morning…"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        {hasSpeech && (
          <button
            type="button"
            className={`btn-mic${listening ? ' btn-mic--active' : ''}`}
            onClick={toggleMic}
            title={listening ? 'Stop recording' : 'Speak your symptoms'}
          >
            {listening ? '⏹' : '🎙'}
          </button>
        )}
      </div>

      <button
        className="btn-primary advisor-submit"
        onClick={handleSubmit}
        disabled={status === 'loading' || !symptoms.trim()}
      >
        {status === 'loading' ? 'Checking…' : 'Find medicine'}
      </button>

      {status === 'done' && answer && (
        <div className="advisor-answer">
          <p>{answer}</p>
        </div>
      )}

      {status === 'error' && (
        <p className="error" style={{ marginTop: '1rem' }}>
          {errorMsg}
        </p>
      )}
    </div>
  )
}
