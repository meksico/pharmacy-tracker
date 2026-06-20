# Plan: Home Pharmacy Tracker — Milestone 1: Inventory Foundation

**Source PRD**: `.claude/prds/home-pharmacy-tracker.prd.md`
**Selected Milestone**: 1 — Inventory foundation
**Complexity**: Medium

## Summary
Build the foundational web app: a Vite + React static site deployed to GitHub Pages that authenticates household members via Google OAuth (whitelist-gated), reads and writes inventory rows to a shared Google Sheet, and provides manual add/edit forms covering all 9 schema fields. No photo recognition yet — that arrives in Milestone 2.

## Patterns to Mirror
Greenfield project — no existing codebase. The patterns defined here become the baseline for all future milestones.

| Category | Pattern defined here |
|---|---|
| Naming | Files: `kebab-case`; React components: `PascalCase.jsx`; modules: `camelCase.js` |
| Error handling | All API calls wrapped in try/catch; errors surfaced as inline UI messages, never swallowed silently |
| Data access | All Google Sheets calls isolated in `src/sheets.js`; components never call the API directly |
| Auth | Auth state and whitelist check isolated in `src/auth.js`; `App.jsx` gates render on auth result |
| Env config | Public config (Client ID, Sheet ID) via Vite `VITE_` env vars baked into the build |

## Project Structure
```
home-pharmacy/              ← repo root
├── .github/
│   └── workflows/
│       └── deploy.yml      ← build + deploy to gh-pages on push to main
├── src/
│   ├── main.jsx            ← React entry point
│   ├── App.jsx             ← root; routes between Login / AccessDenied / Inventory
│   ├── auth.js             ← Google OAuth token client; whitelist check
│   ├── sheets.js           ← Sheets API v4 wrapper: getRows / appendRow / updateRow
│   ├── components/
│   │   ├── InventoryList.jsx   ← table of all rows; inline expiry colour hints
│   │   └── ItemForm.jsx        ← shared add/edit form (9 fields)
│   └── styles/
│       └── index.css
├── index.html              ← app shell; loads Google Identity Services script
├── vite.config.js          ← base path set to /{repo-name}/ for GitHub Pages
├── package.json
└── README.md               ← one-time setup instructions (Google Cloud, Sheet, secrets)
```

## Files to Create

| File | Action | Why |
|---|---|---|
| `package.json` | CREATE | Vite + React dependencies |
| `vite.config.js` | CREATE | `base: '/home-pharmacy/'` for GitHub Pages sub-path |
| `index.html` | CREATE | Loads `accounts.google.com/gsi/client` script |
| `src/main.jsx` | CREATE | Mounts `<App />` into `#root` |
| `src/App.jsx` | CREATE | Auth gate; renders Login → AccessDenied or Inventory |
| `src/auth.js` | CREATE | `initAuth()`, `signIn()`, `signOut()`, `getAllowedIds()` |
| `src/sheets.js` | CREATE | `getRows()`, `appendRow(data)`, `updateRow(rowIndex, data)` |
| `src/components/InventoryList.jsx` | CREATE | Fetches + displays inventory; yellow/red row hints for expiry |
| `src/components/ItemForm.jsx` | CREATE | Controlled form; add mode vs. edit mode via `initialData` prop |
| `src/styles/index.css` | CREATE | Minimal functional styling; no design library dependency |
| `.github/workflows/deploy.yml` | CREATE | CI: install → build → deploy `dist/` to `gh-pages` |
| `.env.example` | CREATE | Documents `VITE_GOOGLE_CLIENT_ID` and `VITE_SHEET_ID` |
| `README.md` | CREATE | One-time setup: Google Cloud, OAuth consent, Sheet headers, GitHub secrets |

## Tasks

### Task 1 — Project scaffold
- **Action**: Run `npm create vite@latest . -- --template react` in the repo root. Set `base` in `vite.config.js` to `/home-pharmacy/` (adjust to match the actual GitHub repo name). Install no extra dependencies beyond what Vite provides.
- **Validate**: `npm run build` completes with no errors and produces `dist/`.

### Task 2 — GitHub Pages deployment
- **Action**: Create `.github/workflows/deploy.yml` — triggers on push to `main`; steps: `actions/checkout`, `actions/setup-node@v4` with Node 20, `npm ci`, `npm run build`, then `actions/deploy-pages` deploying `dist/` to the `gh-pages` branch. Add `VITE_GOOGLE_CLIENT_ID` and `VITE_SHEET_ID` as repository secrets used in the build step.
- **Validate**: Push to `main` triggers the workflow; the built app loads at `https://{username}.github.io/home-pharmacy/`.

### Task 3 — Google OAuth
- **Action**: In `index.html`, load `https://accounts.google.com/gsi/client`. In `src/auth.js`, call `google.accounts.oauth2.initTokenClient({ client_id, scope: 'https://www.googleapis.com/auth/spreadsheets', callback })`. After a token is granted, fetch `https://www.googleapis.com/oauth2/v3/userinfo` with the token to get the user's `sub` (stable Google ID). Compare against `ALLOWED_USER_IDS` — a hardcoded array of string IDs in `auth.js`. Export `{ isAllowed, accessToken, userInfo }` as module state.
- **Validate**: Signing in with an allowed account proceeds to inventory; a non-whitelisted account sees "Access denied — contact the account owner."

### Task 4 — Google Sheets wrapper
- **Action**: In `src/sheets.js`, implement three functions using `fetch` against the Sheets API v4 REST endpoints, always passing `Authorization: Bearer {accessToken}` in headers.
  - `getRows()` → `GET /v4/spreadsheets/{SHEET_ID}/values/Inventory!A2:J` → returns array of row objects keyed by column name.
  - `appendRow(data)` → `POST /v4/spreadsheets/{SHEET_ID}/values/Inventory!A:J:append?valueInputOption=USER_ENTERED` with the row array.
  - `updateRow(rowIndex, data)` → `PUT /v4/spreadsheets/{SHEET_ID}/values/Inventory!A{n}:J{n}?valueInputOption=USER_ENTERED` where `n = rowIndex + 2` (1-indexed + header offset).
- **Validate**: Calling `getRows()` in browser devtools returns the row manually added to the Sheet.

### Task 5 — Inventory list view
- **Action**: `InventoryList.jsx` calls `getRows()` on mount (with a loading spinner). Renders a `<table>` with columns: Title, Category, Conditions, Quantity + Unit, Expiration Date, Status, Notes. Apply CSS class `row--expiring-soon` (yellow background) when expiry is within 30 days; `row--expired` (red) when past expiry date. Add an "Add item" button that opens `ItemForm` in add mode. Each row has an "Edit" button that opens `ItemForm` in edit mode with the row data pre-filled.
- **Validate**: A row added manually to the Sheet appears correctly in the UI table.

### Task 6 — Add / edit item form
- **Action**: `ItemForm.jsx` accepts `{ initialData, rowIndex, onSave, onCancel }` props. Renders controlled inputs for all 9 user-editable fields (ID and Date Added are handled programmatically). Category uses `<select>` with options: Pain Relief, Wound Care, Cold & Flu, Digestive, Allergy, Other. Status uses `<select>` with: Active, Low, Empty, Expired. On submit in add mode: stamp Date Added as today, call `appendRow()`; in edit mode: call `updateRow(rowIndex, data)`. After save, call `onSave()` to trigger list refresh.
- **Validate**: Submit a new item via the form → row appears in Google Sheet. Edit it → Sheet row updates with the new values.

## One-Time Setup (outside code)
These steps are manual and must be completed before the app works — documented in `README.md`:
1. Create a Google Cloud project; enable the **Google Sheets API**.
2. Create **OAuth 2.0 credentials** (Web application type); add the GitHub Pages URL as an authorized JavaScript origin.
3. Create the Google Sheet; add header row: `ID | Title | Category | Conditions | Quantity | Unit | Expiration Date | Date Added | Notes | Status`. Name the sheet tab `Inventory`.
4. Note the Sheet ID from the URL (`/spreadsheets/d/{SHEET_ID}/`).
5. Add `VITE_GOOGLE_CLIENT_ID` and `VITE_SHEET_ID` as GitHub Actions repository secrets.
6. Find your own Google user `sub` by signing in and checking the userinfo response; add it to `ALLOWED_USER_IDS` in `src/auth.js`.

## Validation
```bash
# Local
npm run dev        # app runs at localhost:5173, OAuth redirect must be whitelisted too
npm run build      # no errors, dist/ produced

# After deploy
# 1. Visit https://{username}.github.io/home-pharmacy/
# 2. Sign in with a whitelisted Google account → inventory loads
# 3. Sign in with a non-whitelisted account → "Access denied" screen
# 4. Add an item via the form → row appears in Google Sheet
# 5. Edit the item → Sheet row updates
# 6. Manually add a row with an expiry date 15 days from today → UI shows it yellow
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Google OAuth redirect URI mismatch | High (first-time setup) | README documents exact URI format; `localhost:5173` also whitelisted for dev |
| `ALLOWED_USER_IDS` not known until first sign-in | Medium | README documents how to find your `sub` from the userinfo endpoint |
| Sheet column order mismatch between code and actual sheet | Medium | `sheets.js` references columns by index; README specifies exact header order |
| GitHub Pages base path breaks routing | Low | `vite.config.js` `base` covers static assets; no client-side router used in M1 |

## Acceptance
- [ ] All 6 tasks complete
- [ ] `npm run build` passes with no errors
- [ ] Deployed app is accessible on GitHub Pages
- [ ] Whitelisted user can sign in, add, edit, and view inventory rows
- [ ] Non-whitelisted user is blocked with a clear message
- [ ] Row expiry colouring works correctly (yellow ≤ 30 days, red = expired)
- [ ] All changes reflect in the backing Google Sheet in real time

---
*Milestone 2 (photo recognition flow) ready to plan via `/plan` after this milestone is accepted.*
