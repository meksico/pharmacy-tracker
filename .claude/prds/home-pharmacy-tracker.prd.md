# Home Pharmacy Tracker

## Problem
A household's first-aid kit is an invisible, unmanaged inventory: medications expire undetected, duplicates get purchased because existing stock is forgotten, and the right item is missing when urgently needed. Leaving this unsolved means wasted money on duplicates and real risk when a needed medication is expired or absent.

## Evidence
- Expired medications discovered in the kit in recent months.
- Ongoing low-grade friction from not knowing what's on hand — no dramatic incident, but a clear recurring pain.
- Assumption: photo-based recognition is faster than manual entry — needs validation via prototype testing.

## Users
- **Primary**: Household members (2+ people) who share a single first-aid kit and jointly consume or restock it.
- **Not for**: Medical professionals, people managing prescriptions, multi-household caregivers.

## Hypothesis
We believe a **photo-first digital inventory with expiry alerts and symptom-based lookup** will **eliminate unnoticed expired medications and wasted duplicate purchases** for a household.
We'll know we're right when **the household has zero expired medications go unnoticed for 3 months** and **duplicate purchases drop noticeably after initial inventory setup**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Expired meds caught proactively | 100% of expiring items flagged before expiry | Expiry alert sent ≥ 30 days before date |
| Inventory entry friction | < 60 sec per item via photo flow | Manual timing during prototype test |
| Symptom lookup success | User finds a usable item for their symptom | Subjective test across 5 common conditions |

## Spreadsheet Schema (Google Sheets)
Columns for the backing `Inventory` sheet:

| Column | Type | Notes |
|---|---|---|
| ID | Auto (row #) | Stable reference |
| Title | Text | Medication/product name (AI-filled) |
| Category | Dropdown | e.g. Pain Relief, Wound Care, Cold & Flu, Digestive, Allergy, Other |
| Conditions / Symptoms | Text (comma-separated) | What it treats — enables symptom lookup (AI-filled) |
| Quantity | Number | Current count of units/packages |
| Unit | Text | e.g. tablets, ml, pieces |
| Expiration Date | Date | MM/YYYY or exact date |
| Date Added | Date | Auto-stamped on entry |
| Notes | Text | Free-form; AI-generated description from photo is pasted here |
| Status | Dropdown | Active, Low, Empty, Expired |

## Scope

**MVP** — The minimum to test the hypothesis:
1. **Photo → inventory entry**: User takes/uploads a photo of packaging; GPT-4o mini extracts Title, Category, Conditions, Expiration Date, and writes a row to Google Sheets.
2. **Inventory view**: Web UI (GitHub Pages) lists all items with expiry status highlighted.
3. **Expiry alerts**: Items expiring within 30 days are surfaced prominently in the UI (email alert is post-MVP).
4. **Symptom lookup**: User types a symptom (e.g. "headache") and sees matching items from their inventory.

**Out of scope**
- Dosage recommendations or drug interaction warnings — medical advice is a liability and regulatory issue.
- Multi-household sharing — single Google Sheet, single household only for v1.
- Native mobile app — web-first; camera access via browser is sufficient.
- Prescription medication tracking — OTC and first-aid items only; Rx introduces compliance complexity.
- Email/push notifications — deferred to v2; browser-based expiry surfacing is sufficient for MVP test.
- Low-stock alerts — deferred; requires defining "normal" quantities per item, which needs usage data first.
- Shopping list generation — deferred; builds naturally on low-stock data once that's in place.

## Delivery Milestones

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Inventory foundation | User can manually add, edit, and view medications in a Google Sheet via the web UI | complete | `.claude/plans/home-pharmacy-tracker.plan.md` |
| 2 | Photo recognition flow | User photographs a package and AI fills in the entry form automatically | pending | — |
| 3 | Expiry dashboard | Inventory view highlights items expiring in ≤ 30 days; expired items flagged red | pending | — |
| 4 | Symptom lookup | User types a symptom and sees matching items from their active inventory | pending | — |

## Open Questions
- [x] ~~How will the app authenticate with Google Sheets?~~ **Decided**: Google OAuth; access restricted to a whitelist of permitted Google account IDs.
- [x] ~~Where are photos stored?~~ **Decided**: Photos are not stored. Camera/file input sends the image to the LLM, which returns a text description that is written to the sheet. No image retention.
- [x] ~~Is a GitHub Pages static site sufficient, or does the AI recognition call require a server-side proxy?~~ **Decided**: OpenAI calls will be routed through a Vercel or Netlify serverless function to keep the API key server-side. Static UI hosted on GitHub Pages.
- [x] ~~What constitutes "low quantity"?~~ **Decided**: Out of scope — deferred indefinitely.
- [x] ~~Single vs. multiple kit locations?~~ **Decided**: Single kit location; no location tracking needed.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GPT-4o mini misreads packaging (poor photo, non-English text) | Medium | Medium | Always show editable prefilled form; user confirms before saving |
| OpenAI API key exposed in static GitHub Pages site | Mitigated | — | Resolved: AI calls routed through Vercel/Netlify serverless function |
| Google Sheets API quota limits at scale | Low | Low | Single household = trivial request volume; not a real concern for v1 |
| Household members don't adopt photo flow | Medium | High | Make manual entry equally easy as a fallback |

---
*Status: DRAFT — requirements only. Implementation planning pending via `/plan`.*
