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
]

const DATA_RANGE = `${SHEET_NAME}!A2:K`

function authHeaders() {
  return {
    Authorization: `Bearer ${getAccessToken()}`,
    'Content-Type': 'application/json',
  }
}

// Maps a raw Sheets row array to a named object.
// _rowIndex is 0-based within the data values array (not counting the header).
function rowToObject(row, index) {
  const obj = { _rowIndex: index }
  COLUMNS.forEach((col, i) => {
    obj[col] = row[i] ?? ''
  })
  return obj
}

// Column-level defaults applied when a value is absent or empty.
// Prevents the Sheets API from silently trimming trailing empty cells.
const COL_DEFAULTS = { Status: 'Active', Box: '1' }

// Maps a named object back to a values array for the Sheets API.
function objectToRow(data) {
  return COLUMNS.map((col) => data[col] || COL_DEFAULTS[col] || '')
}

// Reads key/value pairs from the Config tab (A=key, B=value, row 1 is header).
export async function getConfig() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent('Config!A2:B')}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) return {}
  const json = await res.json()
  return Object.fromEntries((json.values ?? []).map(([k, v = '']) => [k, v]))
}

export async function getRows() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to read sheet (HTTP ${res.status})`)
  const json = await res.json()
  return (json.values ?? []).map((row, i) => rowToObject(row, i))
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

  // Write the row number as the ID (e.g. row 2 = ID 1, row 3 = ID 2 …).
  // The append response includes updatedRange like "Inventory!A6:J6" — extract the row number.
  const match = (result.updates?.updatedRange ?? '').match(/!A(\d+):/)
  if (match) {
    const sheetRow = parseInt(match[1], 10)
    const idRange = `${SHEET_NAME}!A${sheetRow}`
    const idUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(idRange)}?valueInputOption=USER_ENTERED`
    await fetch(idUrl, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ values: [[sheetRow - 1]] }), // row 2 → ID 1
    })
  }

  return result
}

const HISTORY_SHEET = 'History'
const HISTORY_RANGE = `${HISTORY_SHEET}!A2:C`

export async function getHistory() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(HISTORY_RANGE)}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) return []
  const json = await res.json()
  const rows = json.values ?? []
  return rows.slice(-20).map(([timestamp = '', symptoms = '', answer = '']) => ({ timestamp, symptoms, answer }))
}

export async function appendHistory({ symptoms, answer }) {
  const timestamp = new Date().toISOString()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(HISTORY_RANGE)}:append?valueInputOption=USER_ENTERED`
  await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ values: [[timestamp, symptoms, answer]] }),
  })
}

export async function updateRow(rowIndex, data) {
  // rowIndex is 0-based in the values array; sheet row = rowIndex + 2 (row 1 is the header).
  const sheetRow = rowIndex + 2
  const range = `${SHEET_NAME}!A${sheetRow}:K${sheetRow}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ values: [objectToRow(data)] }),
  })
  if (!res.ok) throw new Error(`Failed to update row (HTTP ${res.status})`)
  return res.json()
}
