// Add each household member's Google 'sub' ID (string) here.
// The sub is displayed on the Access Denied screen after a first sign-in attempt.
const ALLOWED_USER_IDS = [
  '113596556075544506278',
  '106560227422266150243',
]

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets openid email profile'

const SESSION_TOKEN_KEY = 'hp_access_token'
const SESSION_USER_KEY  = 'hp_user_info'
const SESSION_EXPIRY_KEY = 'hp_token_expiry'

let tokenClient = null
let accessToken = null
let currentUserInfo = null

function saveSession(token, userInfo, expiresIn = 3600) {
  // Subtract 60s so we don't use a token in its last minute
  const expiry = Date.now() + (expiresIn - 60) * 1000
  sessionStorage.setItem(SESSION_TOKEN_KEY, token)
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(userInfo))
  sessionStorage.setItem(SESSION_EXPIRY_KEY, String(expiry))
}

function loadSession() {
  try {
    const expiry = Number(sessionStorage.getItem(SESSION_EXPIRY_KEY))
    if (!expiry || Date.now() > expiry) return null
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY)
    const userInfo = JSON.parse(sessionStorage.getItem(SESSION_USER_KEY))
    if (!token || !userInfo) return null
    return { token, userInfo }
  } catch {
    return null
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_USER_KEY)
  sessionStorage.removeItem(SESSION_EXPIRY_KEY)
}

export function initAuth(onResult) {
  // Restore from sessionStorage on refresh — no sign-in needed
  const existing = loadSession()
  if (existing) {
    accessToken = existing.token
    currentUserInfo = existing.userInfo
    const allowed = ALLOWED_USER_IDS.includes(currentUserInfo.sub)
    onResult({ allowed, userInfo: currentUserInfo })
    // Still set up the client so signIn() works if token expires mid-session
    setupTokenClient(onResult)
    return
  }

  setupTokenClient(onResult)
  onResult({ needsButton: true })
}

function setupTokenClient(onResult) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: async (response) => {
      if (response.error) {
        onResult({ needsButton: true })
        return
      }
      accessToken = response.access_token
      try {
        currentUserInfo = await fetchUserInfo()
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
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken)
  }
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
