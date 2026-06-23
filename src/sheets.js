import { getAccessToken } from './auth.js'

const SHEET_ID = import.meta.env.VITE_SHEET_ID
const SHEET_NAME = 'Inventory'

// Must match the column order in the Google Sheet header row exactly.
const COLUMNS = [
  'ID',
  'Title',
  'Category',
  'Conditions',
  'Quantity',
  'Unit',
  'Expiration Date',
  'Date Added',
  'Notes',
  'Status',
  'Box',
  'Category UA',
  'Conditions UA',
  'Notes UA',
]

const DATA_RANGE = `${SHEET_NAME}!A2:N`

// ── Cache ─────────────────────────────────────────────────────────────────────
// Two-layer: in-memory (same session) + localStorage (survives reload).
// Bump the key suffix when COLUMNS changes to avoid stale structure in storage.

const ROWS_KEY   = 'hp_rows_v1'
const CONFIG_KEY = 'hp_config_v1'
const ROWS_TTL   = 5  * 60 * 1000   // 5 minutes
const CONFIG_TTL = 15 * 60 * 1000   // 15 minutes (config changes rarely)
const STALE_AT   = 0.5               // background-refresh when > 50% of TTL elapsed

let rowsMem   = null   // { rows, ts }
let configMem = null   // { config, ts }
let rowsInflight = null  // dedup concurrent getRows() calls

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
function lsDel(key) {
  try { localStorage.removeItem(key) } catch {}
}

function readCache(mem, key, ttl) {
  const now = Date.now()
  if (mem && now - mem.ts < ttl) return mem
  const stored = lsGet(key)
  if (stored && now - stored.ts < ttl) return stored
  return null
}

function writeRowsCache(rows) {
  rowsMem = { rows, ts: Date.now() }
  lsSet(ROWS_KEY, rowsMem)
}

function writeConfigCache(config) {
  configMem = { config, ts: Date.now() }
  lsSet(CONFIG_KEY, configMem)
}

export function invalidateRows() {
  rowsMem = null
  lsDel(ROWS_KEY)
}

// ── Internals ─────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    Authorization: `Bearer ${getAccessToken()}`,
    'Content-Type': 'application/json',
  }
}

function rowToObject(row, index) {
  const obj = { _rowIndex: index }
  COLUMNS.forEach((col, i) => { obj[col] = row[i] ?? '' })
  return obj
}

const COL_DEFAULTS = { Status: 'Active', Box: '1' }

// Maps a named object back to a values array (A-K only; UA columns are read-only).
function objectToRow(data) {
  return COLUMNS.slice(0, 11).map((col) => data[col] || COL_DEFAULTS[col] || '')
}

async function _fetchRows() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to read sheet (HTTP ${res.status})`)
  const json = await res.json()
  const rows = (json.values ?? []).map((row, i) => rowToObject(row, i))
  writeRowsCache(rows)
  return rows
}

// ── Public API ────────────────────────────────────────────────────────────────

// Reads key/value pairs from the Config tab.
export async function getConfig() {
  const entry = readCache(configMem, CONFIG_KEY, CONFIG_TTL)
  if (entry) return entry.config

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent('Config!A2:B')}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) return {}
  const json = await res.json()
  const config = Object.fromEntries((json.values ?? []).map(([k, v = '']) => [k, v]))
  writeConfigCache(config)
  return config
}

// Returns rows from cache when fresh; fetches otherwise.
// Stale-while-revalidate: if cache is > 50% of TTL, silently refresh in background.
export async function getRows({ forceRefresh = false } = {}) {
  const entry = forceRefresh ? null : readCache(rowsMem, ROWS_KEY, ROWS_TTL)

  if (entry) {
    const age = Date.now() - entry.ts
    if (age > ROWS_TTL * STALE_AT) {
      // Return stale data immediately; refresh silently in background
      if (!rowsInflight) {
        rowsInflight = _fetchRows().finally(() => { rowsInflight = null })
      }
    }
    return entry.rows
  }

  // No usable cache — deduplicate concurrent callers behind one request
  if (!rowsInflight) {
    rowsInflight = _fetchRows().finally(() => { rowsInflight = null })
  }
  return rowsInflight
}

export async function appendRow(data) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}:append?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ values: [objectToRow(data)] }),
  })
  if (!res.ok) throw new Error(`Failed to append row (HTTP ${res.status})`)
  const result = await res.json()

  // Write the row number as the ID (row 2 = ID 1, row 3 = ID 2 …).
  const match = (result.updates?.updatedRange ?? '').match(/!A(\d+):/)
  if (match) {
    const sheetRow = parseInt(match[1], 10)
    const idRange = `${SHEET_NAME}!A${sheetRow}`
    const idUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(idRange)}?valueInputOption=USER_ENTERED`
    await fetch(idUrl, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ values: [[sheetRow - 1]] }),
    })
  }

  invalidateRows()
  return result
}

const HISTORY_SHEET = 'History'
const HISTORY_RANGE = `${HISTORY_SHEET}!A2:D`

export async function getHistory() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(HISTORY_RANGE)}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) return []
  const json = await res.json()
  const rows = json.values ?? []
  return rows.slice(-20).map(([timestamp = '', symptoms = '', answer = '', userId = '']) => ({ timestamp, symptoms, answer, userId }))
}

export async function appendHistory({ symptoms, answer, userId = '' }) {
  const timestamp = new Date().toISOString()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(HISTORY_RANGE)}:append?valueInputOption=USER_ENTERED`
  await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ values: [[timestamp, symptoms, answer, userId]] }),
  })
}

export async function updateRow(rowIndex, data) {
  // rowIndex is 0-based; sheet row = rowIndex + 2 (row 1 is the header).
  const sheetRow = rowIndex + 2
  const range = `${SHEET_NAME}!A${sheetRow}:K${sheetRow}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ values: [objectToRow(data)] }),
  })
  if (!res.ok) throw new Error(`Failed to update row (HTTP ${res.status})`)
  invalidateRows()
  return res.json()
}
