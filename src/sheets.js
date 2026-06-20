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
]

const DATA_RANGE = `${SHEET_NAME}!A2:J`

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

// Maps a named object back to a values array for the Sheets API.
function objectToRow(data) {
  return COLUMNS.map((col) => data[col] ?? '')
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
  return res.json()
}

export async function updateRow(rowIndex, data) {
  // rowIndex is 0-based in the values array; sheet row = rowIndex + 2 (row 1 is the header).
  const sheetRow = rowIndex + 2
  const range = `${SHEET_NAME}!A${sheetRow}:J${sheetRow}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ values: [objectToRow(data)] }),
  })
  if (!res.ok) throw new Error(`Failed to update row (HTTP ${res.status})`)
  return res.json()
}
