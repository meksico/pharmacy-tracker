# Home Pharmacy Tracker

A web app for tracking your household first-aid kit. Backed by Google Sheets, deployed on GitHub Pages. No third-party backend required.

---

## One-time setup

Complete these steps once before the app will work. Order matters.

### 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Rename the default sheet tab to **`Inventory`** (right-click the tab at the bottom).
3. Add this exact header row in row 1:

   | A  | B     | C        | D          | E        | F    | G               | H          | I     | J      |
   |----|-------|----------|------------|----------|------|-----------------|------------|-------|--------|
   | ID | Title | Category | Conditions | Quantity | Unit | Expiration Date | Date Added | Notes | Status |

4. Copy the **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/**{SHEET_ID}**/edit`

### 2. Set up a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project.
2. In the sidebar: **APIs & Services → Library** → search for **Google Sheets API** → Enable it.
3. Go to **APIs & Services → OAuth consent screen**:
   - Choose **External** (or Internal if using Google Workspace).
   - Fill in App name, user support email, developer contact email.
   - Add scope: `https://www.googleapis.com/auth/spreadsheets`
   - Add your Google account as a test user.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local dev)
     - `https://{your-github-username}.github.io` (for production)
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).

### 3. Find your Google user ID

1. Run the app locally (see below) and sign in with Google.
2. You will see an **Access Denied** screen — this is expected on first run.
3. The screen displays your **Google user ID** directly. Copy it.
4. Open [src/auth.js](src/auth.js) and add it to `ALLOWED_USER_IDS`:

   ```js
   const ALLOWED_USER_IDS = [
     '123456789012345678901',
   ]
   ```

   Repeat for each household member who needs access.

### 4. Configure the GitHub repository

1. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_GOOGLE_CLIENT_ID` → your OAuth Client ID
   - `VITE_SHEET_ID` → your Google Sheet ID
   - `VITE_BASE_PATH` → `/home-pharmacy/` (or your actual repo name with slashes)

2. In your GitHub repo: **Settings → Pages → Source: GitHub Actions**.

3. Push to `main` — the workflow builds and deploys automatically.  
   App URL: `https://{your-github-username}.github.io/home-pharmacy/`  
   Add this URL to **Google Cloud → Authorized JavaScript Origins**.

### 5. Add your OpenAI API key (for photo recognition)

The API key is stored in your Google Sheet — no third-party backend needed. Only whitelisted users can read the sheet, so this is safe for a household app.

1. In your spreadsheet, add a new sheet tab named **`Config`**.
2. Add a header row: `Key` in A1, `Value` in B1.
3. Add a data row: `OPENAI_API_KEY` in A2, your key (`sk-...`) in B2.

That's it. The app reads the key from the sheet after you sign in.

---

## Local development

```bash
npm install

cp .env.example .env.local
# Fill in VITE_GOOGLE_CLIENT_ID and VITE_SHEET_ID

npm run dev
# → http://localhost:5173
```

> `http://localhost:5173` must be in the Authorized JavaScript Origins in Google Cloud.

---

## Adding a household member

1. Ask them to sign in — they will see "Access Denied" with their Google user ID shown.
2. Add their ID to `ALLOWED_USER_IDS` in [src/auth.js](src/auth.js) and push to `main`.
3. Also add their Google account as a test user in the OAuth consent screen (while the app is in "Testing" mode).

---

## Project structure

```
src/
  auth.js              Google OAuth flow, whitelist check
  config.js            Reads OpenAI key from Config sheet tab (cached per session)
  sheets.js            Google Sheets API wrapper (read / append / update / config)
  App.jsx              Auth gate and top-level layout
  main.jsx             React entry point
  components/
    InventoryList.jsx  Inventory table with expiry highlighting
    ItemForm.jsx       Add / edit form
    PhotoCapture.jsx   Camera / file input; calls OpenAI GPT-4o mini directly
  styles/
    index.css          All styles
.github/workflows/
  deploy.yml           Build and deploy to GitHub Pages on push to main
```

## Roadmap

- ~~**Milestone 1**~~ — Inventory foundation ✓
- ~~**Milestone 2**~~ — Photo recognition ✓
- **Milestone 3** — Expiry dashboard: dedicated view for items expiring soon
- **Milestone 4** — Symptom lookup: "what do I have for a headache?"
