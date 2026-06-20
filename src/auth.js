// Add each household member's Google 'sub' ID (string) here.
// The sub is displayed on the Access Denied screen after a first sign-in attempt.
const ALLOWED_USER_IDS = [
  '113596556075544506278',
  '106560227422266150243',
]

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets openid email profile'

let tokenClient = null
let accessToken = null
let currentUserInfo = null

export function initAuth(onResult) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: async (response) => {
      if (response.error) {
        onResult({ error: response.error })
        return
      }
      accessToken = response.access_token
      try {
        currentUserInfo = await fetchUserInfo()
        const allowed = ALLOWED_USER_IDS.includes(currentUserInfo.sub)
        onResult({ allowed, userInfo: currentUserInfo })
      } catch {
        onResult({ error: 'userinfo_failed' })
      }
    },
  })
}

export function signIn() {
  tokenClient.requestAccessToken()
}

export function signOut() {
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
