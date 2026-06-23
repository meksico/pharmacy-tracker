import { useState, useRef, useEffect } from 'react'
import { getRows, getHistory, appendHistory } from '../sheets.js'
import { getOpenAIKey } from '../config.js'
import { getUserInfo } from '../auth.js'
import { useLang } from '../i18n/index.jsx'
import { Button } from '../ds/components/core/Button.jsx'
import { IconButton } from '../ds/components/core/IconButton.jsx'
import { Badge } from '../ds/components/core/Badge.jsx'
import { Card } from '../ds/components/core/Card.jsx'
import { TapeReel } from '../ds/components/data/TapeReel.jsx'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const hasSpeech = !!SpeechRecognition

function fmtTimestamp(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${m}:${s}`
}

// Mic SVG glyph
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
)

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}>
    <rect x="5" y="5" width="14" height="14" rx="2"/>
  </svg>
)

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
    recog.interimResults = true
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title */}
      <div>
        <h2 style={{ font: 'var(--weight-bold) var(--type-heading) var(--font-expanded)', color: 'var(--text-primary)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: '0 0 6px' }}>
          {t('adv.title')}
        </h2>
        <p style={{ font: 'var(--weight-regular) var(--text-sm)/1.5 var(--font-sans)', color: 'var(--text-secondary)', margin: 0 }}>
          {t('adv.hint')}
        </p>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <textarea
          rows={3}
          placeholder={t('adv.placeholder')}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          style={{
            flex: 1,
            resize: 'vertical',
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
        {hasSpeech && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 2 }}>
            <IconButton
              variant="surface"
              size="md"
              active={listening}
              aria-label={listening ? t('adv.stopRecording') : t('adv.startRecording')}
              onClick={toggleMic}
            >
              {listening ? <StopIcon /> : <MicIcon />}
            </IconButton>
            {listening && (
              <Badge variant="live" dot>REC</Badge>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        variant="routine"
        size="lg"
        onClick={handleSubmit}
        disabled={status === 'loading' || !symptoms.trim()}
        style={{ color: 'var(--grey-50)', alignSelf: 'flex-start' }}
      >
        {status === 'loading' ? t('adv.checking') : t('adv.find')}
      </Button>

      {/* Loading */}
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
          <TapeReel spinning size={100} label="···" />
          <p style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: 'var(--tracking-mono)', textTransform: 'uppercase', margin: 0 }}>
            Перевіряю аптечку
          </p>
        </div>
      )}

      {/* Answer */}
      {status === 'done' && answer && (
        <Card variant="screen" label="ПОРАДА" style={{ marginTop: 4 }}>
          <p style={{ font: 'var(--weight-regular) var(--text-sm)/1.6 var(--font-sans)', color: 'var(--grey-50)', whiteSpace: 'pre-line', margin: '8px 0 0' }}>
            {answer}
          </p>
        </Card>
      )}

      {/* Error */}
      {status === 'error' && (
        <p style={{ font: 'var(--weight-medium) var(--text-xs)/1.5 var(--font-mono)', color: 'var(--text-secondary)', margin: 0 }}>
          {errorMsg}
        </p>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', margin: '0 0 12px' }}>
            {t('adv.history')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...history].reverse().map((entry, i) => {
              const idx = history.length - 1 - i
              const isActive = activeHistoryIdx === idx
              return (
                <div
                  key={entry.timestamp + i}
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
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'var(--surface-raised)',
                    border: `1px solid ${isActive ? 'var(--border-strong)' : 'rgba(0,0,0,0.14)'}`,
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: isActive ? 'var(--shadow-key-pressed)' : 'var(--shadow-key)',
                    cursor: 'pointer',
                    transition: 'box-shadow var(--dur-fast) var(--ease-mech)',
                  }}
                >
                  <span style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: 'var(--tracking-mono)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {fmtTimestamp(entry.timestamp)}
                  </span>
                  <span style={{ font: 'var(--weight-regular) var(--text-sm)/1 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.symptoms}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
