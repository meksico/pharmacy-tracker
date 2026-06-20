import { useState, useEffect } from 'react'
import { initAuth, signIn, signOut } from './auth.js'
import InventoryList from './components/InventoryList.jsx'

// Possible values: 'loading' | 'ready' | 'signing-in' | 'allowed' | 'denied' | 'error'
export default function App() {
  const [status, setStatus] = useState('loading')
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval)
        // Stay on 'loading' while the silent attempt runs.
        // initAuth fires a prompt:'' request immediately; the callback below handles all outcomes.
        initAuth(({ allowed, userInfo, needsButton, error }) => {
          if (needsButton) {
            setStatus('ready')   // first-time user or consent revoked — show the button
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
    return () => clearInterval(interval)
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

  if (status === 'loading') {
    return <div className="center-screen"><p>Loading…</p></div>
  }

  if (status === 'ready' || status === 'signing-in') {
    return (
      <div className="center-screen">
        <h1>Home Pharmacy</h1>
        <p>Track your household first-aid kit.</p>
        <button
          className="btn-primary btn-signin"
          onClick={handleSignIn}
          disabled={status === 'signing-in'}
        >
          {status === 'signing-in' ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="center-screen">
        <h1>Access Denied</h1>
        <p>
          Your account (<strong>{userInfo?.email}</strong>) is not authorised for this app.
        </p>
        {userInfo?.sub && (
          <div className="sub-box">
            <p className="sub-label">Your Google user ID — copy this into <code>ALLOWED_USER_IDS</code> in <code>src/auth.js</code>:</p>
            <code className="sub-value">{userInfo.sub}</code>
          </div>
        )}
        <button onClick={handleSignOut}>Sign out</button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="center-screen">
        <h1>Sign-in Error</h1>
        <p>Something went wrong during sign-in. Please try again.</p>
        <button className="btn-primary" onClick={() => setStatus('ready')}>Retry</button>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Home Pharmacy</h1>
        <div className="header-user">
          <span>{userInfo?.email}</span>
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      </header>
      <main>
        <InventoryList />
      </main>
    </div>
  )
}
