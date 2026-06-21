# Google Sheets Backend + Google OAuth 2.0 — Architectural Reference

A reusable reference describing how to use Google Sheets as a database and Google Identity Services (GSI) for authentication in a React (Vite) SPA with no backend server.

---

## Part 1: Google OAuth 2.0

### Flow: implicit token model (GSI `initTokenClient`)

No backend, no client secret, no code exchange. The browser gets a raw access token directly from Google and attaches it to Sheets API calls.

### GSI script

```html
<!-- index.html <head> -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

`async defer` means the script may not be ready at module-eval time — always check `window.google?.accounts?.oauth2` before calling it (poll with `setInterval` until it appears).

### Scopes

```
https://www.googleapis.com/auth/spreadsheets openid email profile
```

- `spreadsheets` — read/write the Sheet
- `openid email profile` — needed to call `/oauth2/v3/userinfo` and get `sub`, `email`, `name`, `picture`

### Token lifecycle

| Storage | Key | Lifetime |
|---|---|---|
| Module-level var (`accessToken`) | — | runtime only |
| localStorage cache | `{app}_access_token` | `expires_in` − 60s safety buffer |
| App session | `{app}_session_expiry` | 7 days (configurable) |
| Cached user info | `{app}_user_info` | reused across silent refreshes |

On startup:
1. No stored session → show sign-in button
2. Token still valid → use it immediately (no network call)
3. Token expired but session within 7 days → silent `requestAccessToken({ prompt: '' })`
4. Session expired → show sign-in button

### Token client setup

```js
const tokenClient = window.google.accounts.oauth2.initTokenClient({
  client_id: GOOGLE_CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/spreadsheets openid email profile',
  callback: async (response) => {
    if (response.error) { /* show sign-in button */ return }
    // store token, expiry, fetch user info on first sign-in
  }
})
```

### Sign-in / silent refresh

```js
// Interactive (on button click)
tokenClient.requestAccessToken({ prompt: 'select_account' })

// Silent refresh (at startup if session is still valid)
tokenClient.requestAccessToken({ prompt: '' })
```

### User identity

```js
const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
  headers: { Authorization: `Bearer ${accessToken}` }
})
const { sub, email, name, picture } = await res.json()
```

Only fetched once on first interactive sign-in; cached in localStorage thereafter.

### Allowlist pattern

```js
const ALLOWED_USER_IDS = ['113596556075544506278', '...']

// After auth succeeds:
const allowed = ALLOWED_USER_IDS.includes(userInfo.sub)
```

`sub` is Google's stable opaque numeric user ID (never changes, unlike email). To add a new user: have them attempt sign-in, show their `sub` on the Access Denied screen, paste it into the array and redeploy.

### Attaching the token to API requests

```js
function authHeaders() {
  return {
    Authorization: `Bearer ${accessToken}`, // module-level var, NOT localStorage directly
    'Content-Type': 'application/json',
  }
}
```

### Sign-out

```js
localStorage.removeItem(TOKEN_KEY)
localStorage.removeItem(EXPIRY_KEY)
localStorage.removeItem(USER_KEY)
localStorage.removeItem(SESSION_KEY)
window.google.accounts.oauth2.revoke(accessToken)
accessToken = null
```

---

## Part 2: Google Sheets API v4

### Sheet structure

| Tab | Purpose | Range |
|---|---|---|
| `Inventory` | main data store | `Inventory!A2:N` |
| `Config` | key/value pairs (e.g. API keys) | `Config!A2:B` |
| `History` | append-only log | `History!A2:D` |

Row 1 is always a header row. Data starts at row 2. Tab names and column order must be hardcoded to match the actual Sheet.

### API endpoints used

Base URL: `https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/`

Always `encodeURIComponent` the range — `!` and `:` must be encoded.

| Operation | Method | URL pattern |
|---|---|---|
| Read range | GET | `.../values/{range}` |
| Append row | POST | `.../values/{range}:append?valueInputOption=USER_ENTERED` |
| Update row | PUT | `.../values/{range}?valueInputOption=USER_ENTERED` |

### Column ↔ object mapping

```js
const COLUMNS = ['ID', 'Title', 'Category', 'Conditions', /* … */]
const WRITABLE_COUNT = 11  // columns A-K; columns beyond this are read-only

// array → named object (on read)
function rowToObject(row, index) {
  const obj = { _rowIndex: index }
  COLUMNS.forEach((col, i) => { obj[col] = row[i] ?? '' })
  return obj
}

// named object → array (on write — only writable columns)
function objectToRow(data) {
  return COLUMNS.slice(0, WRITABLE_COUNT).map((col) => data[col] || defaults[col] || '')
}
```

`_rowIndex` is 0-based in the values array. Sheet row = `_rowIndex + 2`.

### Reading data

```js
const res = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent('Inventory!A2:N')}`,
  { headers: authHeaders() }
)
const { values = [] } = await res.json()
const rows = values.map((row, i) => rowToObject(row, i))
```

### Appending a row

```js
const res = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent('Inventory!A2:N')}:append?valueInputOption=USER_ENTERED`,
  { method: 'POST', headers: authHeaders(), body: JSON.stringify({ values: [objectToRow(data)] }) }
)
```

### Updating a specific row

```js
const sheetRow = rowIndex + 2  // _rowIndex is 0-based, row 1 is the header
const range = `Inventory!A${sheetRow}:K${sheetRow}`
await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
  { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ values: [objectToRow(data)] }) }
)
```

### Auto-ID after append

Sheets `:append` response includes `updates.updatedRange` (e.g. `Inventory!A6:K6`). Extract the row number and write it as the ID:

```js
const match = result.updates?.updatedRange?.match(/!A(\d+):/)
if (match) {
  const sheetRow = parseInt(match[1], 10)
  // ID = sheetRow - 1  (row 2 → ID 1, row 3 → ID 2, …)
  await fetch(
    `.../${encodeURIComponent(`Inventory!A${sheetRow}`)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ values: [[sheetRow - 1]] }) }
  )
}
```

### Read-only columns

Columns beyond `WRITABLE_COUNT` (e.g. translated text columns added directly in the Sheet) are read into objects via `rowToObject` but excluded from `objectToRow` so they're never overwritten. Set `WRITABLE_COUNT` to the index of the first read-only column.

### Error handling pattern

```js
// Critical operations: throw on failure
if (!res.ok) throw new Error(`Failed to read sheet (HTTP ${res.status})`)

// Non-critical reads: degrade gracefully
if (!res.ok) return []   // or return {}

// Fire-and-forget logging: no check
appendHistory(entry).catch(() => {})

// Always normalize missing values
const rows = json.values ?? []   // Sheets omits 'values' key when range is empty
```

---

## Part 3: Setup checklist for a new project

### Google Cloud Console

- [ ] Create (or pick) a Google Cloud project
- [ ] Enable the **Google Sheets API** (APIs & Services → Library)
- [ ] Configure the **OAuth consent screen** (External; add `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/spreadsheets` scopes; add test users if app is unpublished)
- [ ] Create an **OAuth 2.0 Client ID** of type **Web application**
- [ ] Add **Authorized JavaScript origins** for every host:
  - `http://localhost:5173` (or your dev port)
  - your production URL (e.g. `https://yourname.github.io`)
  - No redirect URI needed for the token/implicit model
- [ ] Copy the Client ID (ends in `.apps.googleusercontent.com`)

### Google Sheet setup

- [ ] Create a new spreadsheet; copy the ID from the URL (`/d/{ID}/edit`)
- [ ] Tab `Inventory` — header row 1 matching your `COLUMNS` array order exactly
- [ ] Tab `Config` — headers `key` / `value` (A/B); add rows like `OPENAI_API_KEY | sk-…`
- [ ] Tab `History` — headers `Timestamp / Symptoms / Answer / User` (A–D)
- [ ] Share the Sheet with each allowlisted user's Google account (at least Viewer for reads, Editor for writes)

### Environment variables

For Vite, prefix with `VITE_` to expose to the browser:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_SHEET_ID=your-spreadsheet-id
```

These are not secrets — they're visible in the JS bundle. The real security is the OAuth flow and Sheet sharing permissions.

### HTML

```html
<head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
```

### npm dependencies

None for OAuth or Sheets — GSI is a CDN script, all Sheets calls are plain `fetch`.

### Constants to update when adapting the code

| File | Constant | What to change |
|---|---|---|
| `auth.js` | `ALLOWED_USER_IDS` | Your users' `sub` values |
| `auth.js` | `SCOPE` | Adjust if you need fewer/more scopes |
| `auth.js` | `SESSION_DURATION_MS` | Default 7 days |
| `auth.js` | `LS_*` key prefixes | Replace `hp_` with your app prefix |
| `sheets.js` | `SHEET_NAME`, `COLUMNS` | Match your Sheet's tab name and column order |
| `sheets.js` | `WRITABLE_COUNT` | Index of first read-only column |
| `sheets.js` | `DATA_RANGE` | `SheetName!A2:Z` — last column of your schema |
| `sheets.js` | `COL_DEFAULTS` | Default values for trailing columns (prevents Sheets trimming) |

---

## Part 4: Gotchas

### 1. iOS Safari popup blocking

GSI's `requestAccessToken` opens a popup. iOS Safari blocks popups not triggered by a direct user gesture. Silent refresh (`prompt: ''`) at startup **will be blocked** on iOS — expect it to fail and fall back to showing the sign-in button. Always keep token requests inside click handlers.

### 2. Token lives in a module-level variable

Always use `getAccessToken()` — don't read directly from localStorage. The localStorage copy is a reload cache only. The live value used for actual API calls is the in-memory variable.

### 3. Allowlist ≠ real security boundary

The allowlist check is client-side JavaScript. A user with a valid Google token and Sheet access can call the Sheets API directly, bypassing your app. Real data protection = Sheet sharing permissions. Use the allowlist for UX gating, not data security.

### 4. Sheets CORS works from the browser

`https://sheets.googleapis.com` and `https://oauth2.googleapis.com` return permissive CORS headers for authenticated Bearer requests. No backend proxy needed. This is what enables the "no server" architecture.

### 5. `USER_ENTERED` coerces types

All writes in this project use `USER_ENTERED`, so Sheets parses values like the UI would: numbers become numbers, dates become date serials, strings starting with `=` become formulas. Switch to `RAW` if you need verbatim string storage (e.g. codes with leading zeros).

### 6. Sheets trims trailing empty cells

On read, Sheets omits trailing empty cells from each row — `row[3]` may simply not exist. Always use `row[i] ?? ''` when mapping. On write, ensure trailing columns have a default value in `COL_DEFAULTS` so the array isn't shortened.

### 7. ID is position-derived

Row ID = sheet row number − 1. Manually inserting or deleting rows in the Sheet breaks the ID↔row relationship. There's no UUID or sequence; IDs are fragile if the Sheet is edited outside the app.

### 8. No optimistic locking

`_rowIndex` is captured at read time. If another user (or another browser tab) appends or deletes rows between your read and update, your PUT goes to the wrong sheet row — silently. For single-user or low-concurrency use this is fine; for multi-user production use, consider re-fetching before write or using a row-level version/timestamp.

### 9. No refresh token in the implicit flow

The access token lasts ~1 hour. When it expires, the app must call `requestAccessToken` again. On desktop browsers, `prompt: ''` usually succeeds silently (Google remembers consent). On mobile/Safari it may require UI interaction. Design your expiry handling to gracefully prompt the user when silent refresh fails.

---

## Quick-start template: `auth.js`

```js
const CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE       = 'https://www.googleapis.com/auth/spreadsheets openid email profile'
const SESSION_MS  = 7 * 24 * 60 * 60 * 1000
const LS_TOKEN    = 'app_access_token'
const LS_EXPIRY   = 'app_token_expiry'
const LS_USER     = 'app_user_info'
const LS_SESSION  = 'app_session_expiry'

const ALLOWED_USER_IDS = ['replace-with-sub-ids']

let accessToken = null
let currentUserInfo = null
let tokenClient = null

export function getAccessToken() { return accessToken }
export function getUserInfo()    { return currentUserInfo }

function tokenValid() {
  const exp = parseInt(localStorage.getItem(LS_EXPIRY) || '0', 10)
  return Date.now() < exp && !!localStorage.getItem(LS_TOKEN)
}

function loadSession() {
  const session = parseInt(localStorage.getItem(LS_SESSION) || '0', 10)
  if (Date.now() > session) return null
  return {
    token:    localStorage.getItem(LS_TOKEN),
    userInfo: JSON.parse(localStorage.getItem(LS_USER) || 'null'),
  }
}

function saveToken(response) {
  accessToken = response.access_token
  const exp = Date.now() + (response.expires_in - 60) * 1000
  localStorage.setItem(LS_TOKEN,   accessToken)
  localStorage.setItem(LS_EXPIRY,  String(exp))
  localStorage.setItem(LS_SESSION, String(Date.now() + SESSION_MS))
}

async function fetchUserInfo() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return res.json()
}

function setupTokenClient(onResult) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPE,
    callback:  async (response) => {
      if (response.error) { onResult({ needsButton: true }); return }
      saveToken(response)
      if (!currentUserInfo) {
        currentUserInfo = await fetchUserInfo()
        localStorage.setItem(LS_USER, JSON.stringify(currentUserInfo))
      }
      const allowed = ALLOWED_USER_IDS.includes(currentUserInfo.sub)
      onResult({ allowed, userInfo: currentUserInfo })
    }
  })
}

export function initAuth(onResult) {
  const session = loadSession()
  if (!session) { setupTokenClient(onResult); onResult({ needsButton: true }); return }
  if (tokenValid()) {
    accessToken      = session.token
    currentUserInfo  = session.userInfo
    setupTokenClient(onResult)
    onResult({ allowed: ALLOWED_USER_IDS.includes(currentUserInfo?.sub), userInfo: currentUserInfo })
    return
  }
  setupTokenClient(onResult)
  tokenClient.requestAccessToken({ prompt: '' })
}

export function signIn()  { tokenClient.requestAccessToken({ prompt: 'select_account' }) }
export function signOut() {
  ;[LS_TOKEN, LS_EXPIRY, LS_USER, LS_SESSION].forEach(k => localStorage.removeItem(k))
  if (accessToken) window.google.accounts.oauth2.revoke(accessToken)
  accessToken = null; currentUserInfo = null
}
```

## Quick-start template: `sheets.js`

```js
import { getAccessToken } from './auth.js'

const SHEET_ID      = import.meta.env.VITE_SHEET_ID
const SHEET_NAME    = 'Inventory'
const COLUMNS       = ['ID', 'Title', /* … add your columns … */]
const WRITABLE_COUNT = COLUMNS.length  // reduce if you have read-only trailing columns
const COL_DEFAULTS  = { Status: 'Active' }  // prevent Sheets from trimming trailing cells
const DATA_RANGE    = `${SHEET_NAME}!A2:${String.fromCharCode(64 + COLUMNS.length)}`

function authHeaders() {
  return { Authorization: `Bearer ${getAccessToken()}`, 'Content-Type': 'application/json' }
}

function rowToObject(row, index) {
  const obj = { _rowIndex: index }
  COLUMNS.forEach((col, i) => { obj[col] = row[i] ?? '' })
  return obj
}

function objectToRow(data) {
  return COLUMNS.slice(0, WRITABLE_COUNT).map(col => data[col] || COL_DEFAULTS[col] || '')
}

export async function getRows() {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}`,
    { headers: authHeaders() }
  )
  if (!res.ok) throw new Error(`Failed to read sheet (HTTP ${res.status})`)
  const { values = [] } = await res.json()
  return values.map((row, i) => rowToObject(row, i))
}

export async function appendRow(data) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}:append?valueInputOption=USER_ENTERED`,
    { method: 'POST', headers: authHeaders(), body: JSON.stringify({ values: [objectToRow(data)] }) }
  )
  if (!res.ok) throw new Error(`Failed to append row (HTTP ${res.status})`)
  return res.json()
}

export async function updateRow(rowIndex, data) {
  const sheetRow = rowIndex + 2
  const range    = `${SHEET_NAME}!A${sheetRow}:${String.fromCharCode(64 + WRITABLE_COUNT)}${sheetRow}`
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ values: [objectToRow(data)] }) }
  )
  if (!res.ok) throw new Error(`Failed to update row (HTTP ${res.status})`)
  return res.json()
}

export async function getConfig() {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent('Config!A2:B')}`,
    { headers: authHeaders() }
  )
  if (!res.ok) return {}
  const { values = [] } = await res.json()
  return Object.fromEntries(values.map(([k, v = '']) => [k, v]))
}
```
