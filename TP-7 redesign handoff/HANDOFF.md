# Home Pharmacy → TP-7 Core — Implementation Handoff

**For:** an implementing agent (Claude Opus) working in the existing **React 18 + Vite 6** codebase.
**Goal:** Re-skin the existing Home Pharmacy app onto the **TP-7 Core** design system (industrial minimalism — monochrome chassis + a single Record-Orange accent, tactile depth-based states). **Restyle only.** Keep every field, control, piece of state, and integration exactly as it is today.

> **Reference implementation:** `Home Pharmacy.dc.html` (in this project) is a fully interactive prototype of the target result. It is written in a streaming template runtime, **not** React — treat it as a visual/behavioral spec, not code to copy. Port its *look and structure* into the real React components listed below. The structure-validation doc is `Redesign Structure.dc.html`.

---

## 0. Hard rules (do not violate)

1. **Do not change behavior, data, or integrations.** Keep all existing logic: Google Sheets calls (`getRows`/`appendRow`/`updateRow`/`getHistory`/`appendHistory`), the OpenAI `gpt-4o-mini` calls (symptom advice + photo OCR), Web Speech API voice input, the `i18n` layer (`useLang`, `t()`), routing/tab state, sorting/filtering, the add-next loop, sticky-box `localStorage`. Only JSX markup + styling change.
2. **Keep every field and control.** The per-file checklists below enumerate them. Nothing is added or removed.
3. **The orange discipline:** `--orange-500 #FF4F00` appears **at most once per view**, reserved for the most critical/destructive/live element. Per-view assignments are fixed (see §2). Everywhere else uses the grey ramp.
4. **State is shown by depth, not hue.** No coloured row washes. Expired/expiring rows use a recessed groove + a monospace status tag (see §5). No glassmorphism, no blur, no decorative gradients.
5. **Numbers are telemetry:** dates (`2026-07`), box numbers, counts, quantities, timestamps render in **JetBrains Mono**, `tabular-nums`, units as a separate uppercase tracked token.
6. **Radii are machined:** 2px keys/cards, 4px panels/inputs, 8px modules. Borders are hairline. No soft rounding.
7. **Language:** Ukrainian-first. The EN/UA toggle stays in the header but its switching can remain stubbed (visual only) for now — wire it to the existing `i18n` if/when desired. Do not delete it.

---

## 1. Installing the design system

The system ships as plain CSS tokens + a set of React component files (provided in `handoff/design-system/`).

### 1.1 Tokens (load once, e.g. in `main.jsx` or your root CSS)
```js
import './design-system/styles.css'; // @imports the six token files below
```
`styles.css` pulls in `tokens/colors.css`, `typography.css`, `spacing.css`, `elevation.css`, `fonts.css`, `base.css`. After this, every `var(--*)` token referenced in this doc is available. `fonts.css` loads Archivo / Archivo Expanded / JetBrains Mono from Google Fonts (swap for licensed faces in production).

### 1.2 Components
Copy `handoff/design-system/components/**` into the app (e.g. `src/ds/`). They are dependency-free React components. Import what each screen needs:
```jsx
import { Button }           from '@/ds/components/core/Button.jsx';
import { IconButton }       from '@/ds/components/core/IconButton.jsx';
import { Card }             from '@/ds/components/core/Card.jsx';
import { Badge }            from '@/ds/components/core/Badge.jsx';
import { Input }            from '@/ds/components/forms/Input.jsx';
import { Select }           from '@/ds/components/forms/Select.jsx';
import { SegmentedControl } from '@/ds/components/navigation/SegmentedControl.jsx';
import { TapeReel }         from '@/ds/components/data/TapeReel.jsx';
import { AppIcon }          from '@/ds/components/brand/AppIcon.jsx';
```

### 1.3 Component APIs (verified from source)

| Component | Key props |
|---|---|
| `Button` | `variant: 'surface'\|'routine'\|'critical'\|'ghost'` (default `surface`), `size: 'sm'\|'md'\|'lg'`, `active`, `disabled`, `startIcon`, plus native `onClick` etc. (spreads `...rest` to `<button>`). |
| `IconButton` | same variant/size model; `active` for latched toggles; **always pass `aria-label`**; SVG as `children`. |
| `Card` | `variant: 'surface'\|'sunken'\|'screen'\|'flat'`, `label` (etched corner tag), `padding`. |
| `Badge` | `variant: 'neutral'\|'solid'\|'live'\|'outline'`, `dot` (pulses when `live`). Content is mono uppercase. |
| `Input` | `label`, `unit`, `mono`, `invalid`, `disabled`; spreads `...rest` to native `<input>` → **`value`/`onChange` work as a normal controlled input.** Renders a recessed well. |
| `Select` | `label`, `disabled`; pass `<option>`s as `children`; spreads `...rest` to native `<select>` → controlled. |
| `SegmentedControl` | `options: [{value,label}]` or `string[]`, `value`, `onChange(value)`, `size`. Exactly one engaged. |
| `TapeReel` | `spinning`, `progress` (0..1), `rpm`, `size`, `label` (hub text). The signature loader — use instead of any spinner/progress bar. |
| `AppIcon` | `line1`, `line2`, `badge` (default `M`), `size`. Use `line1="HOME" line2="PHARMACY"`. |
| `Readout` | `caption`, `value`, `unit`, `size`, `color` — LED telemetry on a dark screen (optional, for counters). |

> **Note on labels:** keep multi-word button/badge labels from wrapping by using a non-breaking space between words (e.g. `Знайти\u00A0ліки`) or `white-space:nowrap` on the element — the keys are sized to content.

---

## 2. Orange (critical accent) — per-view assignment

| View | The one orange | Everything else |
|---|---|---|
| Advisor | the **live mic indicator** (record dot / `Badge variant="live"` while listening) | grey |
| Cabinet | the **expired-count alert** (`Badge variant="live" dot`) | soon-count is `Badge variant="outline"`; rows are greyscale |
| Item detail (modal) | **none** | status is a neutral mono chip |
| Item form | **none** | photo-remove `×` may use `IconButton variant="critical"` as the single destructive accent |
| Expiring | the **"Прострочено" section dot** | "Закінчуються 30 днів" marker is grey |

The header logo (`AppIcon`) carries the brand's own orange — it is fixed identity chrome and is exempt from the per-view count.

---

## 3. App shell (persistent — wraps all tabs)

Replace the blue title bar with a dark "screen" chassis (`background: var(--surface-screen)`, `box-shadow: var(--shadow-panel)`, sticky top).

- **Left:** `<AppIcon line1="HOME" line2="PHARMACY" size={46} />` + wordmark "Home Pharmacy" (Archivo Expanded, `var(--grey-50)`) + sub-label "Домашня аптечка" (mono, uppercase, `var(--grey-500)`).
- **Right:** EN/UA `SegmentedControl size="sm"` (kept, stub ok) · user avatar (34px recessed square well, mono initials) · "Вийти" `Button variant="ghost"` (override text colour to `--grey-50` on the dark bar).
- **Tabs:** the three text tabs (`Радник / Аптечка / Закінчуються`) become a single full-width `SegmentedControl` in the recessed channel. `options=[{value:'advisor',label:'Радник'},{value:'cabinet',label:'Аптечка'},{value:'expiring',label:'Закінчуються'}]`. Wire to the existing active-tab state.

The content column is `max-width: 920px; margin: 0 auto`.

---

## 4. Per-file checklists

For each, the existing component, its current controls, and the TP-7 mapping. **Keep the existing component's state/effects/handlers; change only the returned JSX + styling.**

### 4.1 `SymptomAdvisor.jsx` — tab "Радник"
State preserved: `symptoms`, `listening`, `status (idle|loading|done|error)`, `answer`, `errorMsg`, `history`, `activeHistoryIdx`, speech recog ref.

| Control | TP-7 |
|---|---|
| Title `adv.title` + hint `adv.hint` | `h2` (`var(--type-heading)`) + body `p` (`--text-tertiary`) |
| Symptom `<textarea>` (3 rows) | recessed well: `background:var(--grey-50)`, `box-shadow:var(--shadow-inset)`, `border:1px solid var(--border-channel)`, `radius 2px`. (Or `Input` if you prefer a single line — keep it multi-line.) |
| Mic toggle (`🎙/⏹`, `hasSpeech` gated) | `IconButton variant="surface"` with a mic glyph, `active={listening}`. While listening, show `Badge variant="live" dot>REC</Badge>` beside it. **This is the view's orange.** |
| Submit `adv.find` / `adv.checking`, disabled when empty/loading | `Button variant="routine" size="lg"`. |
| Loading state | center a `<TapeReel spinning progress={...} label="•••" />` + mono caption "Перевіряю аптечку" (replaces any spinner). |
| Answer panel `.advisor-answer` | `<Card variant="screen" label="ПОРАДА">` with the answer text in `--grey-50`, `white-space:pre-line`. |
| Error `.error` | inline mono note, `--text-secondary`. |
| History `adv.history` list (timestamp + preview, click to expand/collapse, active highlight) | mono section label; each entry a flat key card (`--surface-raised`, hairline, `--shadow-key`); the active entry latches to `--shadow-key-pressed` + `--border-strong`. Timestamp mono `tabular-nums`. Keep the click-to-toggle behavior and `fmtTimestamp`. |

### 4.2 `InventoryList.jsx` — tab "Аптечка"
State preserved: `rows`, `loading`, `error`, `formMode`, `editTarget`, `detailTarget`, `search`, `categoryFilter`, `sortDir`. Keep `expiryClass`, the `expiringSoon/expired` filters, `categories` derivation, `visibleRows` filter+sort, and the `ItemForm`/`ItemDetail` mounting.

| Control | TP-7 |
|---|---|
| Heading `inv.heading {n}` | `h2` + mono count "{n} позицій" (`white-space:nowrap`). |
| Search `inv.search` (`type=search`, controlled) | recessed `Input` well. |
| Category filter `<select>` (controlled, options from `categories` via `t('cat.'+c)`) | `Select`; first option `inv.allCategories` with `value=""`. |
| Add `inv.addItem` | `Button variant="routine"` → `+ Додати` (existing `handleAdd`). |
| `inv.alertExpired {n}` | `Badge variant="live" dot` — **the view's orange.** |
| `inv.alertSoon {n}` | `Badge variant="outline"` (neutral; orange is taken). |
| 4-col table — `inv.colTitle` (sortable, arrow `↑/↓`), `inv.colCategory`, `inv.colExpires`, `inv.colBox`; rows clickable → detail; `row--expired/row--expiring-soon` | framed module (`--surface-raised`, hairline, `radius 4px`). Header row sits in a recessed strip (`--bg-sunken`, `--shadow-inset`, mono uppercase labels). Title header stays the sort toggle. Data cells: title + category in Archivo; expires + box in mono `tabular-nums`. **Replace the row colour wash** with the §5 groove + tag. Each row is a pressable key (hover → `--grey-50`). |
| Loading / error / empty (`inv.loading/loadError/empty`) | mono state line; loading may use a small `TapeReel`. |

**Responsive (target = both desktop & mobile):** below **760px** collapse the table into **stacked cards** — one card per item (`--surface-raised`, hairline, `--shadow-key`, groove on the left edge): title + "КОР {box}" on the top row, category + mono expiry on the second, status tag (§5) beneath. Above 760px keep the table. (Prototype switches on a `window.innerWidth < 760` resize listener; a CSS media query is equally fine in the real app.)

### 4.3 `ItemDetail.jsx` — modal
Read-only floating panel. Keep the overlay-click-to-close + `stopPropagation`, the `Field` pattern, and the `qty = [Quantity, Unit]` join.

- Overlay `rgba(20,20,20,.55)`; panel `--surface-raised`, `border:1px solid var(--border-strong)`, `radius 8px`, `box-shadow:var(--shadow-panel)`, `max-width 560`, scroll if tall.
- Close `×` → `IconButton variant="ghost" size="sm"` (keep `aria-label`).
- Title → `h2`.
- **All 8 fields, 2-col grid**, each = mono uppercase micro-label + value: `КАТЕГОРІЯ` (`Category`/`Category UA`), `СИМПТОМИ` (`Conditions`/`Conditions UA`), `КІЛЬКІСТЬ` (`qty`, mono), `ТЕРМІН ПРИДАТНОСТІ` (`Expiration Date`, mono), `СТАТУС` (neutral mono chip via `t('status.'+...)`), `КОРОБКА` (`Box`, mono), `ДАТА ДОДАВАННЯ` (`Date Added`, mono), `ПРИМІТКИ` (`Notes`/`Notes UA`, full width). Keep the `value || '—'` fallback.
- Actions: `detail.close` → `Button variant="ghost"`; `detail.edit` → `Button variant="routine"` (existing `onEdit`).

### 4.4 `ItemForm.jsx` (+ `PhotoCapture.jsx`) — add / edit
Keep **everything**: `EMPTY_FORM`, `CATEGORIES`, `STATUSES`, `BOX_KEY`/sticky box `localStorage`, `MAX_PHOTOS`, `resizeImage`, `PHOTO_PROMPT`, `handleChange`, `handleSubmit`, `handleAddNext`, `handlePhotoResult`, `openCamera`, `handleFileChange`, `removePhoto`, `handleRecognize`, `canAddNext`, `filledClass`, `titleRef` focus, the hidden file input.

| Field / control | Type | TP-7 |
|---|---|---|
| Title `form.labelTitle` (`*` in add) | text, required | `Input` well |
| Category `form.labelCategory` | select (6: Pain Relief, Wound Care, Cold & Flu, Digestive, Allergy, Other) | `Select` |
| Conditions `form.labelConditions` | text | `Input` well |
| Quantity `form.labelQuantity` | number | `Input mono` (paired row) |
| Unit `form.labelUnit` | text | `Input` (paired row) |
| Exp date `form.labelExpDate` (`*` in add) | `type=month` | `Input mono` |
| Status `form.labelStatus` | select (4: Active, Low, Empty, Expired) | `Select` (paired row) |
| Box `form.labelBox` | number, sticky | `Input mono` (paired row) |
| Notes `form.labelNotes` | textarea (3 rows) | recessed multiline well |
| Photo thumbs (`PhotoCapture`, add-mode, ≤5, `×` remove) | image grid | recessed thumb wells; remove = `IconButton variant="critical" size="sm"` (the form's single accent) |
| `form.takePhoto` (`Фото`) | opens camera | `Button variant="surface"` |
| `form.fillForm`/`form.recognizing` (`Заповнити`) — GPT OCR | AI fill | `Button variant="surface"`; while busy show a `TapeReel` ("OCR"). |
| Bottom bar | sticky cluster | fused key row: `Скасувати` (`ghost`, left) · `[Заповнити]` · `[Фото]` · add → `Додати ще` (`routine`) / edit → `Зберегти` (`routine`). Keep `disabled` logic (`!!saving`, `!canAddNext`). |
| `form.savedFlash {n}` | flash | mono line `--text-tertiary`. |
| `form.error`, `form.recognizeError` | errors | inline mono notes. |

> The prototype renders the form wells as inline-styled native inputs to suit its streaming runtime. **In the real React app, use the DS `<Input>`/`<Select>` components directly** — they're controlled (`value`/`onChange`) and render the identical recessed wells.

### 4.5 `ExpiryDashboard.jsx` — tab "Закінчуються"
Keep `parseExpiry`, `daysUntil`, the `expired`/`soon` filters + date sort, the `allGood` empty state, the `Section` sub-component, and row→`ItemDetail`.

- **Section "Прострочено (N)"** (`expiry.sectionExpired`): heading preceded by the **orange dot** (the view's accent) + mono count. Rows as stacked key-cards with a **`--grey-900` left groove**.
- **Section "Закінчуються протягом 30 днів (N)"** (`expiry.sectionSoon`): heading with a grey square marker + mono count. Rows with a **`--grey-400` left groove**.
- Each row: title + category (left), mono expiry + "КОР {box}" (right). Click → detail (`onRowClick`). Keep both tables' 4 columns of data even when rendered as cards.
- Empty: `expiry.allGood` as a centered mono line.

---

## 5. Expired / expiring treatment (replaces the colour wash)

Depth + a monospace tag, no hue:
```css
/* left groove on the row/card */
border-left: 3px solid var(--grey-900);   /* expired */
border-left: 3px solid var(--grey-400);   /* expiring ≤30d */

/* status tag chip */
.tag-expired { font:9px/1 var(--font-mono); letter-spacing:.12em; text-transform:uppercase;
  background:var(--grey-900); color:var(--grey-50); padding:2px 6px; border-radius:2px; white-space:nowrap; } /* "ПРОСТРОЧЕНО" */
.tag-soon { /* same, but */ background:var(--grey-300); color:var(--text-primary);
  border:1px solid rgba(0,0,0,.12); }   /* "≤ 30 ДНІВ" */
```
Drive expired/soon off the **existing** `expiryClass`/`parseExpiry` logic — do not change the date math.

---

## 6. Token quick-reference

```
Surfaces  --bg-primary (chassis) · --bg-sunken (channels) · --surface-card (keys)
          --surface-raised (raised top) · --surface-screen (dark display)
Text      --text-primary · --text-secondary · --text-tertiary · --text-inverse · --text-disabled
Accent    --orange-500 (#FF4F00) · --orange-600 (pressed)   ← once per view
Lines     --border-hairline · --border-strong · --border-channel · --focus-ring
Depth     --shadow-key · --shadow-key-hover · --shadow-key-pressed · --shadow-inset · --shadow-panel
Radii     --radius-sm 2 · --radius-md 4 · --radius-lg 8 · --radius-pill
Type      --font-sans (Archivo) · --font-expanded (display) · --font-mono (JetBrains)
          --type-display/-heading/-body/-ui/-readout · --tracking-label/-wide/-mono
Motion    --ease-mech · --ease-detent · --dur-press 60ms · --dur-fast 120ms · --dur-base 180ms
```

## 7. Definition of done
- [ ] All five views + detail modal restyled; **no field or control removed**.
- [ ] Exactly one orange element per view per §2 (header logo exempt).
- [ ] No coloured row washes — expired/soon use groove + mono tag (§5).
- [ ] All numbers/dates/counts in mono `tabular-nums`.
- [ ] Table collapses to stacked cards < 760px.
- [ ] Sheets / OpenAI / Speech / i18n / sticky-box logic untouched and still working.
- [ ] EN/UA toggle still present in the header.
