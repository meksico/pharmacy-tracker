// Add each household member's Google 'sub' ID (string) here.
// The sub is displayed on the Access Denied screen after a first sign-in attempt.
const ALLOWED_USER_IDS = [
  '113596556075544506278',
  '106560227422266150243',
]

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets openid email profile'

const LS_TOKEN         = 'hp_access_token'
const LS_TOKEN_EXPIRY  = 'hp_token_expiry'
const LS_USER          = 'hp_user_info'
const LS_SESSION_EXPIRY = 'hp_session_expiry'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

let tokenClient = null
let accessToken = null
let currentUserInfo = null

function saveSession(token, userInfo, expiresIn = 3600) {
  const tokenExpiry   = Date.now() + (expiresIn - 60) * 1000  // 1 min early buffer
  const sessionExpiry = Date.now() + SESSION_DURATION_MS
  localStorage.setItem(LS_TOKEN,          token)
  localStorage.setItem(LS_TOKEN_EXPIRY,   String(tokenExpiry))
  localStorage.setItem(LS_USER,           JSON.stringify(userInfo))
  localStorage.setItem(LS_SESSION_EXPIRY, String(sessionExpiry))
}

function loadSession() {
  try {
    const sessionExpiry = Number(localStorage.getItem(LS_SESSION_EXPIRY))
    if (!sessionExpiry || Date.now() > sessionExpiry) return null   // older than 7 days

    const userInfo = JSON.parse(localStorage.getItem(LS_USER))
    if (!userInfo) return null

    const tokenExpiry = Number(localStorage.getItem(LS_TOKEN_EXPIRY))
    const token       = localStorage.getItem(LS_TOKEN)
    const tokenValid  = !!(token && tokenExpiry && Date.now() < tokenExpiry)

    return { token, userInfo, tokenValid }
  } catch {
    return null
  }
}

function clearSession() {
  [LS_TOKEN, LS_TOKEN_EXPIRY, LS_USER, LS_SESSION_EXPIRY].forEach(k => localStorage.removeItem(k))
}

export function initAuth(onResult) {
  const existing = loadSession()

  if (existing) {
    currentUserInfo = existing.userInfo

    if (existing.tokenValid) {
      // Token still good — no network call needed
      accessToken = existing.token
      const allowed = ALLOWED_USER_IDS.includes(currentUserInfo.sub)
      onResult({ allowed, userInfo: currentUserInfo })
      setupTokenClient(onResult) // ready for later silent refresh / sign-out
      return
    }

    // Identity known (within 7 days) but token expired — try silent refresh.
    // Status stays 'loading' while this resolves (usually under 1 s).
    setupTokenClient(onResult)
    tokenClient.requestAccessToken({ prompt: '' })
    return
  }

  // No stored session — show sign-in button
  setupTokenClient(onResult)
  onResult({ needsButton: true })
}

function setupTokenClient(onResult) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: async (response) => {
      if (response.error) {
        // Silent refresh failed — fall back to sign-in button
        onResult({ needsButton: true })
        return
      }
      accessToken = response.access_token
      try {
        // Only fetch userinfo if not already cached (silent refresh skips this)
        if (!currentUserInfo) {
          currentUserInfo = await fetchUserInfo()
        }
        saveSession(accessToken, currentUserInfo, response.expires_in ?? 3600)
        const allowed = ALLOWED_USER_IDS.includes(currentUserInfo.sub)
        onResult({ allowed, userInfo: currentUserInfo })
      } catch {
        onResult({ error: 'userinfo_failed' })
      }
    },
  })
}

export function signIn() {
  tokenClient.requestAccessToken({ prompt: 'select_account' })
}

export function signOut() {
  clearSession()
  if (accessToken) window.google.accounts.oauth2.revoke(accessToken)
  accessToken = null
  currentUserInfo = null
}

export function getAccessToken() {
  return accessToken
}

export function getUserInfo() {
  return currentUserInfo
}

async function fetchUserInfo() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('userinfo request failed')
  return res.json()
}
