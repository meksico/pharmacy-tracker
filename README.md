# Home Pharmacy Tracker

A web app for tracking your household first-aid kit. Backed by Google Sheets, deployed on GitHub Pages.

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
   - Authorized redirect URIs: same two URLs as above.
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).

### 3. Find your Google user ID

You need your Google account's stable `sub` identifier to whitelist yourself.

1. Run the app locally (see below) and sign in with Google.
2. You will see an **Access Denied** screen — this is expected on the first run.
3. The screen will display your **Google user ID** directly. Copy it.
4. Paste it into `ALLOWED_USER_IDS` in `src/auth.js` (see step below), then sign out and sign back in.
4. Open [src/auth.js](src/auth.js) and add it to `ALLOWED_USER_IDS`:

   ```js
   const ALLOWED_USER_IDS = [
     '123456789012345678901',   // your sub
   ]
   ```

   Repeat for each household member who needs access.

### 4. Deploy to Vercel

Vercel hosts both the static UI and the serverless `/api/recognize` function that proxies OpenAI calls.

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), import the GitHub repository.
3. Vercel auto-detects Vite — no build settings needed.
4. In Vercel project **Settings → Environment Variables**, add:
   - `VITE_GOOGLE_CLIENT_ID` → your OAuth Client ID
   - `VITE_SHEET_ID` → your Google Sheet ID
   - `OPENAI_API_KEY` → your OpenAI API key (server-side only, never in the browser)
5. Redeploy. Your app URL will be something like `https://home-pharmacy.vercel.app`.
6. Add that URL to **Google Cloud → Authorized JavaScript Origins** (OAuth credentials).

> **GitHub Pages (optional):** The `.github/workflows/deploy.yml` still works for Milestones 1/3/4 (no OpenAI needed). Add `VITE_BASE_PATH=/home-pharmacy/` as a GitHub secret if using both.

---

## Local development

```bash
# Install dependencies
npm install

# Install Vercel CLI (once, globally)
npm i -g vercel

# Link repo to your Vercel project (first time only — pulls env vars automatically)
vercel link

# Start full dev server (static + serverless functions)
vercel dev
# → http://localhost:3000
```

`vercel dev` runs both the React app and the `/api/recognize` function locally.
If you only need the inventory (no photo recognition), `npm run dev` at `localhost:5173` works too.

> `localhost:3000` (or `localhost:5173`) must be in the Authorized JavaScript Origins in Google Cloud.

---

## Deployment

Push to `main`. The GitHub Actions workflow builds the app and deploys it to GitHub Pages automatically.

```
https://{your-github-username}.github.io/home-pharmacy/
```

---

## Adding a household member

1. Ask them to sign in — they will see "Access Denied" with their email shown.
2. Have them find their `sub` ID using the DevTools method above (or share theirs with you).
3. Add it to `ALLOWED_USER_IDS` in [src/auth.js](src/auth.js) and push to `main`.
4. Also add their Google account as a test user in the OAuth consent screen (while the app is in "Testing" mode).

---

## Project structure

```
src/
  auth.js              Google OAuth flow, whitelist check
  sheets.js            Google Sheets API wrapper (read / append / update)
  App.jsx              Auth gate and top-level layout
  main.jsx             React entry point
  components/
    InventoryList.jsx  Inventory table with expiry highlighting
    ItemForm.jsx       Add / edit form
  styles/
    index.css          All styles
.github/workflows/
  deploy.yml           Build and deploy to GitHub Pages on push to main
```

## Roadmap

- **Milestone 2** — Photo recognition: snap a photo of packaging, GPT-4o mini fills the form automatically
- **Milestone 3** — Expiry dashboard: dedicated view for items expiring soon
- **Milestone 4** — Symptom lookup: "what do I have for a headache?"
