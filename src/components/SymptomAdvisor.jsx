import { useState, useRef, useEffect } from 'react'
import { getRows, getHistory, appendHistory } from '../sheets.js'
import { getOpenAIKey } from '../config.js'
import { getUserInfo } from '../auth.js'
import { useLang } from '../i18n/index.jsx'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const hasSpeech = !!SpeechRecognition

function fmtTimestamp(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${m}:${s}`
}

export default function SymptomAdvisor() {
  const { lang, t } = useLang()
  const [symptoms, setSymptoms] = useState('')
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [answer, setAnswer] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [history, setHistory] = useState([])
  const [activeHistoryIdx, setActiveHistoryIdx] = useState(null)
  const recogRef = useRef(null)

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {})
    return () => recogRef.current?.stop()
  }, [])

  function toggleMic() {
    if (listening) {
      recogRef.current?.stop()
      return
    }
    const recog = new SpeechRecognition()
    recog.lang = t('adv.speechLang')
    recog.interimResults = true  // iOS never fires final result without this
    recog.continuous = false

    let sessionText = ''

    recog.onresult = (e) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript
        } else {
          interim += e.results[i][0].transcript
        }
      }
      sessionText = final || interim
    }

    recog.onend = () => {
      setListening(false)
      if (sessionText) {
        setSymptoms((prev) => (prev ? prev + ' ' + sessionText : sessionText).trim())
      }
    }

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
        if (r['Category']) parts.push(`(${lang === 'uk' ? (r['Category UA'] || r['Category']) : r['Category']})`)
        const conditions = lang === 'uk' ? (r['Conditions UA'] || r['Conditions']) : r['Conditions']
        if (conditions) parts.push(`— for: ${conditions}`)
        if (r['Box']) parts.push(`[Box ${r['Box']}]`)
        return parts.join(' ')
      }).join('\n')

      const replyLang = t('adv.replyLang')
      const systemPrompt = `You are a home pharmacy assistant. You MUST write your entire response in ${replyLang} — no exceptions, regardless of what language the inventory or symptoms are written in.`
      const userPrompt = `Here is the user's current inventory:\n\n${inventoryText}\n\nSymptoms: ${symptoms.trim()}\n\nWhich of these medicines are most suitable for these symptoms, and why? For each recommended medicine, mention the box number where it is stored. Be concise (2–4 sentences). End with a disclaimer that this is not medical advice.`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 300,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`)

      const text = json.choices[0].message.content.trim()
      setAnswer(text)
      setStatus('done')

      const userInfo = getUserInfo()
      const userId = userInfo?.email ?? userInfo?.sub ?? ''
      const entry = { timestamp: new Date().toISOString(), symptoms: symptoms.trim(), answer: text, userId }
      appendHistory(entry).catch(() => {})
      setHistory((prev) => {
        const updated = [...prev, entry]
        return updated.slice(-20)
      })
      setActiveHistoryIdx(null)
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="advisor">
      <h2 className="advisor-title">{t('adv.title')}</h2>
      <p className="advisor-hint">{t('adv.hint')}</p>

      <div className="advisor-input-row">
        <textarea
          className="advisor-textarea"
          rows={3}
          placeholder={t('adv.placeholder')}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        {hasSpeech && (
          <div className="mic-controls">
            <button
              type="button"
              className={`btn-mic${listening ? ' btn-mic--active' : ''}`}
              onClick={toggleMic}
              title={listening ? t('adv.stopRecording') : t('adv.startRecording')}
            >
              {listening ? '⏹' : '🎙'}
            </button>
          </div>
        )}
      </div>

      <button
        className="btn-primary advisor-submit"
        onClick={handleSubmit}
        disabled={status === 'loading' || !symptoms.trim()}
      >
        {status === 'loading' ? t('adv.checking') : t('adv.find')}
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

      {history.length > 0 && (
        <div className="advisor-history">
          <p className="advisor-history-title">{t('adv.history')}</p>
          {[...history].reverse().map((entry, i) => {
            const idx = history.length - 1 - i
            const isActive = activeHistoryIdx === idx
            const label = fmtTimestamp(entry.timestamp)
            return (
              <div
                key={entry.timestamp + i}
                className={`history-entry${isActive ? ' history-entry--active' : ''}`}
                onClick={() => {
                  if (isActive) {
                    setActiveHistoryIdx(null)
                    setAnswer(null)
                    setStatus('idle')
                  } else {
                    setActiveHistoryIdx(idx)
                    setSymptoms(entry.symptoms)
                    setAnswer(entry.answer)
                    setStatus('done')
                  }
                }}
              >
                <span className="history-entry-time">{label}</span>
                <span className="history-entry-preview">{entry.symptoms}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
