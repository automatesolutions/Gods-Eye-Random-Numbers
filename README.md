# God's Eye Predictor

A web lab that picks **six numbers** from a pool of **1–42, 1–45, 1–49, 1–55, or 1–58**. It uses the correlated-field math from the [God's Eye random-number lab](https://gods-eye-random-numbers.netlify.app/) and can tilt that field with about **10 years of historical draws** from Google Sheets.

**This is not a forecast of the next official ticket.** Independent draws cannot be predicted. The app samples a history-biased field (FBM value noise, recency, co-occurrence) and shows the six highest spaced peaks.

The original design mockup is kept as reference under `Random Number Prediction UI/` and is not the running app.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/). Restart the dev server after you change `.env`.

```bash
npm run build    # production files in dist/
npm run preview  # serve the build locally
```

## Historical draws (Google Sheets)

Create a `.env` file in the project root (see `.env.example`). One URL per game:

```
VITE_SHEET_42=https://docs.google.com/spreadsheets/d/YOUR_ID/edit?usp=sharing
VITE_SHEET_45=...
VITE_SHEET_49=...
VITE_SHEET_55=...
VITE_SHEET_58=...
```

Share/edit links are converted to CSV automatically. Each sheet must be **Anyone with the link can view**. Expected columns (names can vary): a date, and six numbers, often as `28-39-29-06-32-41`.

Until URLs are set, the app still runs with a **uniform prior** (no history tilt).

Do not commit `.env`. For Netlify, add the same `VITE_SHEET_*` variables in the site settings, then rebuild. The build writes `/_sheets/{42|45|49|55|58}` proxy rules into `dist/_redirects` so the browser does not need CORS on Google.

## How to use the UI

| Control | Meaning |
| --- | --- |
| **Game** | Preset 6/42 … 6/58. Sets range `1…N` and loads that sheet. |
| **Range** | Editable min/max. A custom range drops official-game history. |
| **Picks** | Always six numbers. |
| **Octaves** | Detail in the hill-line (1 = smooth, 4–6 = more wiggles). |
| **Scale** | How many hills are stretched across the pool. |
| **History weight (α)** | Mix of live FBM vs 10-year frequency. `0` = field only; default `0.35`. |
| **Seed** | Optional. Applied the next time you generate. |
| **Draw → Daily** | One set per game per calendar day, saved in this browser until midnight. |
| **Draw → Manual** | Click **Generate** whenever you want a new set. Nothing auto-refreshes. |
| **Sheet** | Row count and last fetch. “Cached” means sessionStorage, not a new Google hit. |

The six cards are the current peaks. The bar chart is the live field (gold = picks; muted bars = historical frequency). Orbit is the same pool as points of light. **Recent draws** are the last eight official results from the sheet.

Bottom metrics describe the **lab field**, not winning odds:

- **Peak separation** — average gap between the six picks.
- **Field energy** — how peaky the live surface is.
- **Drift rate** — how fast the FBM walks in time (not draw frequency).
- **Calibration** — `history prior` if a sheet loaded, else `uniform prior`.

## Algorithm (short)

For each candidate `k` in `1…N`:

1. Sample 4-octave value-noise **FBM** across the pool (Lab 2), with slow time drift and a small Ornstein–Uhlenbeck wander (Lab 3).
2. Mix in normalized **hit frequency** from the sheet (`α`).
3. Small **overdue** tilt for numbers not seen recently.
4. After the first peak, remaining scores get a **pair** boost from historical co-occurrence (Lab 1 idea, discrete).
5. Take six peaks with a spacing filter so they are not all on one hill.

Score: `(1 − α) · FBM + α · freq + β · overdue + γ · pairBoost`.

## Project layout

```
index.html          # page shell
src/main.js         # boot, generate, animation
src/config.js       # games + sheet URL helper
src/engine/         # FBM, LCG / Box–Muller / OU, peak pick
src/data/sheets.js  # CSV fetch + parse + stats
src/data/daily.js   # daily lock in localStorage
src/ui/             # DOM + canvases
netlify.toml        # static build
```

## Deploy

Netlify: build command `npm run build`, publish directory `dist`. Set `VITE_SHEET_42` … `VITE_SHEET_58` in the host environment so history works in production.
