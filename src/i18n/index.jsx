import { createContext, useContext, useState } from 'react'
import en from './en.js'
import uk from './uk.js'

const TRANSLATIONS = { en, uk }
const LangContext = createContext(null)
const LS_KEY = 'hp_lang'

function detectDefault() {
  const stored = localStorage.getItem(LS_KEY)
  if (stored === 'uk' || stored === 'en') return stored
  return navigator.language?.startsWith('uk') ? 'uk' : 'en'
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(detectDefault)

  function setLang(l) {
    setLangState(l)
    localStorage.setItem(LS_KEY, l)
  }

  function t(key, vars = {}) {
    const str = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), str)
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
