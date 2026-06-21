import { useState, useEffect } from 'react'
import { initAuth, signIn, signOut } from './auth.js'
import { useLang } from './i18n/index.jsx'
import InventoryList from './components/InventoryList.jsx'
import ExpiryDashboard from './components/ExpiryDashboard.jsx'
import SymptomAdvisor from './components/SymptomAdvisor.jsx'

// Possible values: 'loading' | 'ready' | 'signing-in' | 'allowed' | 'denied' | 'error' | 'blocked'
export default function App() {
  const { lang, setLang, t } = useLang()
  const [status, setStatus] = useState('loading')
  const [userInfo, setUserInfo] = useState(null)
  const [tab, setTab] = useState('advisor')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStatus('blocked')
    }, 6000)

    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval)
        clearTimeout(timeout)

        // If the auth callback never fires (e.g. silent-refresh popup blocked by Safari iOS),
        // fall back to the sign-in button after 5 s instead of hanging forever.
        const authTimeout = setTimeout(() => setStatus('ready'), 5000)

        initAuth(({ allowed, userInfo, needsButton, error }) => {
          clearTimeout(authTimeout)
          if (needsButton) {
            setStatus('ready')
            return
          }
          if (error) {
            setStatus('error')
            return
          }
          setUserInfo(userInfo)
          setStatus(allowed ? 'allowed' : 'denied')
        })
      }
    }, 100)

    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [])

  function handleSignIn() {
    setStatus('signing-in')
    signIn()
  }

  function handleSignOut() {
    signOut()
    setUserInfo(null)
    setStatus('ready')
  }

  function LangToggle() {
    return (
      <div className="lang-toggle">
        <button className={`lang-btn${lang === 'en' ? ' lang-btn--active' : ''}`} onClick={() => setLang('en')}>EN</button>
        <button className={`lang-btn${lang === 'uk' ? ' lang-btn--active' : ''}`} onClick={() => setLang('uk')}>UA</button>
      </div>
    )
  }

  if (status === 'loading') {
    return <div className="center-screen"><p>{t('app.loading')}</p></div>
  }

  if (status === 'ready' || status === 'signing-in') {
    return (
      <div className="center-screen">
        <LangToggle />
        <h1>Home Pharmacy</h1>
        <p>{t('app.tagline')}</p>
        <button
          className="btn-primary btn-signin"
          onClick={handleSignIn}
          disabled={status === 'signing-in'}
        >
          {status === 'signing-in' ? t('app.signingIn') : t('app.signIn')}
        </button>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="center-screen">
        <LangToggle />
        <h1>{t('app.denied.title')}</h1>
        <p>{t('app.denied.msg', { email: userInfo?.email ?? '' })}</p>
        {userInfo?.sub && (
          <div className="sub-box">
            <p className="sub-label">{t('app.denied.subLabel')}</p>
            <code className="sub-value">{userInfo.sub}</code>
          </div>
        )}
        <button onClick={handleSignOut}>{t('app.signOut')}</button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="center-screen">
        <LangToggle />
        <h1>{t('app.error.title')}</h1>
        <p>{t('app.error.msg')}</p>
        <button className="btn-primary" onClick={() => setStatus('ready')}>{t('app.retry')}</button>
      </div>
    )
  }

  if (status === 'blocked') {
    return (
      <div className="center-screen">
        <LangToggle />
        <h1>{t('app.blocked.title')}</h1>
        <p>{t('app.blocked.msg')}</p>
        <p>{t('app.blocked.hint')}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>{t('app.retry')}</button>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Home Pharmacy</h1>
        <div className="header-user">
          <LangToggle />
          <div className="user-avatar" title={userInfo?.email}>
            {userInfo?.picture
              ? <img src={userInfo.picture} alt={userInfo?.name ?? userInfo?.email} />
              : <span>{(userInfo?.name ?? userInfo?.email ?? '?')[0].toUpperCase()}</span>
            }
          </div>
          <button onClick={handleSignOut}>{t('app.signOut')}</button>
        </div>
      </header>
      <nav className="tab-nav">
        <button
          className={`tab-btn${tab === 'advisor' ? ' tab-btn--active' : ''}`}
          onClick={() => setTab('advisor')}
        >
          {t('nav.advisor')}
        </button>
        <button
          className={`tab-btn${tab === 'inventory' ? ' tab-btn--active' : ''}`}
          onClick={() => setTab('inventory')}
        >
          {t('nav.inventory')}
        </button>
        <button
          className={`tab-btn${tab === 'expiry' ? ' tab-btn--active' : ''}`}
          onClick={() => setTab('expiry')}
        >
          {t('nav.expiring')}
        </button>
      </nav>
      <main>
        {tab === 'inventory' && <InventoryList />}
        {tab === 'expiry' && <ExpiryDashboard />}
        {tab === 'advisor' && <SymptomAdvisor />}
      </main>
    </div>
  )
}
