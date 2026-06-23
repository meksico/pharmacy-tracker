import { useState, useEffect } from 'react'
import { initAuth, signIn, signOut } from './auth.js'
import { useLang } from './i18n/index.jsx'
import InventoryList from './components/InventoryList.jsx'
import ExpiryDashboard from './components/ExpiryDashboard.jsx'
import SymptomAdvisor from './components/SymptomAdvisor.jsx'
import { AppIcon } from './ds/components/brand/AppIcon.jsx'
import { Button } from './ds/components/core/Button.jsx'
import { Card } from './ds/components/core/Card.jsx'
import { SegmentedControl } from './ds/components/navigation/SegmentedControl.jsx'

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

        const authTimeout = setTimeout(() => setStatus('ready'), 5000)

        initAuth(({ allowed, userInfo, needsButton, error }) => {
          clearTimeout(authTimeout)
          if (needsButton) { setStatus('ready'); return }
          if (error) { setStatus('error'); return }
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

  const langOptions = [
    { value: 'en', label: 'EN' },
    { value: 'uk', label: 'UA' },
  ]

  const tabOptions = [
    { value: 'advisor',   label: t('nav.advisor') },
    { value: 'inventory', label: t('nav.inventory') },
    { value: 'expiry',    label: t('nav.expiring') },
  ]

  // ── Auth screen shared layout ──────────────────────────────────────
  function AuthWrap({ children }) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <SegmentedControl options={langOptions} value={lang} onChange={setLang} size="sm" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 400 }}>
          <AppIcon line1="HOME" line2="PHARMACY" size={72} />
          {children}
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <AuthWrap>
        <p style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-secondary)', letterSpacing: 'var(--tracking-mono)' }}>
          {t('app.loading')}
        </p>
      </AuthWrap>
    )
  }

  if (status === 'ready' || status === 'signing-in') {
    return (
      <AuthWrap>
        <Card variant="screen" style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 24px' }}>
          <p style={{ font: 'var(--weight-bold) var(--text-lg)/1.2 var(--font-expanded)', color: 'var(--grey-50)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: 0 }}>
            Home Pharmacy
          </p>
          <p style={{ font: 'var(--weight-regular) var(--text-sm)/1.5 var(--font-sans)', color: 'var(--text-secondary)', margin: 0 }}>
            {t('app.tagline')}
          </p>
          <Button
            variant="routine"
            size="lg"
            onClick={handleSignIn}
            disabled={status === 'signing-in'}
            style={{ color: 'var(--grey-50)', marginTop: 8 }}
          >
            {status === 'signing-in' ? t('app.signingIn') : t('app.signIn')}
          </Button>
        </Card>
      </AuthWrap>
    )
  }

  if (status === 'denied') {
    return (
      <AuthWrap>
        <Card variant="screen" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '32px 24px' }}>
          <p style={{ font: 'var(--weight-bold) var(--text-md)/1 var(--font-expanded)', color: 'var(--grey-50)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: 0 }}>
            {t('app.denied.title')}
          </p>
          <p style={{ font: 'var(--weight-regular) var(--text-sm)/1.5 var(--font-sans)', color: 'var(--text-secondary)', margin: 0 }}>
            {t('app.denied.msg', { email: userInfo?.email ?? '' })}
          </p>
          {userInfo?.sub && (
            <div>
              <p style={{ font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', margin: '0 0 8px' }}>
                {t('app.denied.subLabel')}
              </p>
              <Card variant="sunken" padding="10px 14px">
                <code style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-primary)', letterSpacing: 'var(--tracking-mono)', wordBreak: 'break-all' }}>
                  {userInfo.sub}
                </code>
              </Card>
            </div>
          )}
          <Button variant="ghost" onClick={handleSignOut} style={{ alignSelf: 'flex-start', color: 'var(--grey-50)', borderColor: 'var(--grey-600)' }}>
            {t('app.signOut')}
          </Button>
        </Card>
      </AuthWrap>
    )
  }

  if (status === 'error') {
    return (
      <AuthWrap>
        <Card variant="screen" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '32px 24px', textAlign: 'center', alignItems: 'center' }}>
          <p style={{ font: 'var(--weight-bold) var(--text-md)/1 var(--font-expanded)', color: 'var(--grey-50)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: 0 }}>
            {t('app.error.title')}
          </p>
          <p style={{ font: 'var(--weight-regular) var(--text-sm)/1.5 var(--font-sans)', color: 'var(--text-secondary)', margin: 0 }}>
            {t('app.error.msg')}
          </p>
          <Button variant="routine" onClick={() => setStatus('ready')} style={{ color: 'var(--grey-50)' }}>
            {t('app.retry')}
          </Button>
        </Card>
      </AuthWrap>
    )
  }

  if (status === 'blocked') {
    return (
      <AuthWrap>
        <Card variant="screen" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '32px 24px', textAlign: 'center', alignItems: 'center' }}>
          <p style={{ font: 'var(--weight-bold) var(--text-md)/1 var(--font-expanded)', color: 'var(--grey-50)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', margin: 0 }}>
            {t('app.blocked.title')}
          </p>
          <p style={{ font: 'var(--weight-regular) var(--text-sm)/1.5 var(--font-sans)', color: 'var(--text-secondary)', margin: 0 }}>
            {t('app.blocked.msg')}
          </p>
          <p style={{ font: 'var(--weight-regular) var(--text-xs)/1.5 var(--font-mono)', color: 'var(--grey-600)', margin: 0 }}>
            {t('app.blocked.hint')}
          </p>
          <Button variant="routine" onClick={() => window.location.reload()} style={{ color: 'var(--grey-50)' }}>
            {t('app.retry')}
          </Button>
        </Card>
      </AuthWrap>
    )
  }

  // ── Main app shell ─────────────────────────────────────────────────
  const initials = (userInfo?.name ?? userInfo?.email ?? '?')[0].toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--surface-screen)',
        boxShadow: 'var(--shadow-panel)',
        padding: '0 20px',
      }}>
        <div style={{
          maxWidth: 920, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 14,
          height: 64,
        }}>
          <AppIcon line1="HOME" line2="PHARMACY" size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: 'var(--weight-bold) var(--text-md)/1 var(--font-expanded)', color: 'var(--grey-50)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase' }}>
              Home Pharmacy
            </div>
            <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', color: 'var(--grey-500)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', marginTop: 3 }}>
              Домашня аптечка
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <SegmentedControl options={langOptions} value={lang} onChange={setLang} size="sm" />

            <div
              title={userInfo?.email}
              style={{
                width: 34, height: 34, flexShrink: 0,
                background: 'var(--bg-sunken)',
                boxShadow: 'var(--shadow-inset)',
                border: '1px solid var(--border-channel)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {userInfo?.picture
                ? <img src={userInfo.picture} alt={userInfo?.name ?? userInfo?.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ font: 'var(--weight-bold) var(--text-sm)/1 var(--font-mono)', color: 'var(--grey-50)' }}>{initials}</span>
              }
            </div>

            <Button variant="ghost" size="sm" onClick={handleSignOut} style={{ color: 'var(--grey-50)', borderColor: 'var(--grey-600)' }}>
              {t('app.signOut')}
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 12 }}>
          <SegmentedControl
            options={tabOptions}
            value={tab}
            onChange={setTab}
            style={{ width: '100%' }}
          />
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px 48px' }}>
        {tab === 'inventory' && <InventoryList />}
        {tab === 'expiry'    && <ExpiryDashboard />}
        {tab === 'advisor'   && <SymptomAdvisor />}
      </main>
    </div>
  )
}
