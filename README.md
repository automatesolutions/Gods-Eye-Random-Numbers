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
| **Game** (top of the result card) | Preset 6/42 … 6/58. Sets range `1…N` and loads that sheet. |
| **Get today's numbers / New numbers** | Draws the set. In Daily mode it turns into **Saved for today** once used. |
| **Copy** | Copies the six numbers to the clipboard. |
| **Daily / Manual** | Daily: one set per game per calendar day, saved in this browser until midnight. Manual: draw whenever you want. |
| **Range** (Tune the field) | Editable min/max. A custom range drops official-game history. |
| **Detail** | FBM octaves (1 = smooth, 4–6 = more bumps). |
| **Hills** | FBM scale: how many hills are stretched across the pool. |
| **History weight (α)** | Mix of live FBM vs 10-year frequency. `0` = field only; default `0.35`. |
| **Seed** | Optional. Applied the next time you generate. |
| **Data** / header pill | Row count and last fetch. “Cached” means sessionStorage, not a new Google hit. |

The six cards are the current picks, sorted ascending, with a peak-strength bar. The bar chart is the live field (gold = picks; muted bars = historical frequency). Orbit view is the same pool as points of light. **Recent official draws** are the last eight results from the sheet; numbers that also appear in your set are gold.

## Design and motion

The look follows [godsviewai.com](https://godsviewai.com/): neutral near-black surfaces, warm off-white ink, 2px corners, gold for highlights, and a labelled icon rail. Tokens live at the top of `src/style.css`.

- **Type:** [Switzer](https://www.fontshare.com/fonts/switzer) (Fontshare, ITF Free Font License, free for commercial use) for text, IBM Plex Mono (OFL) for numbers and data only.
- **Icons:** Lucide, copied from [Iconify](https://icon-sets.iconify.design/lucide/) into the SVG sprite in `index.html`. Colour and stroke come from CSS.
- **Charts:** live SVG (`src/ui/charts.js`). Mark colours are CSS classes (`.c-bar`, `.c-dot`, …) driven by the `--chart-*` tokens.
- **Motion:** GSAP 3 only (`src/ui/motion.js`): ScrollSmoother, a pinned hero, SplitText heading reveals, per-section scroll entrances, and the pick-card reveal. With `prefers-reduced-motion`, smoothing, pinning and movement are off, state changes fade, and the field holds a still frame.
- **Hero icon:** set `LORDICON_SRC` in `src/config.js` to a Lordicon CDN link to play it once on load (the footer adds the required credit). Empty = the built-in SVG eye draws itself.
- **Particle reveal:** Canvas UI's effect is installed through the shadcn registry (`src/components/canvasui/`) but off (`PARTICLE_REVEAL` in `src/config.js`). It needs Chrome's experimental HTML-in-Canvas API.

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
src/ui/             # DOM, SVG charts, GSAP motion
src/components/     # Canvas UI particle reveal (shadcn registry)
Dockerfile          # Cloud Run image (nginx + sheet proxy)
cloudbuild.yaml     # build image and deploy Cloud Run
netlify.toml        # optional Netlify static build
```

## Deploy on Google Cloud (Cloud Run)

The app is a static site plus a same-origin `/_sheets/{42|45|49|55|58}` proxy so the browser can load Google CSV without CORS. Cloud Run is the intended GCP target for project `gods-eye-random`.

### One-time setup

In [Google Cloud Console](https://console.cloud.google.com/) (project **Gods Eye Random** / `gods-eye-random`):

1. Enable **Cloud Run**, **Cloud Build**, and **Artifact Registry** (or Container Registry).
2. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and log in:

```bash
gcloud auth login
gcloud config set project gods-eye-random
```

### Deploy from this folder

```bash
gcloud run deploy gods-eye-predictor \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080
```

Then attach the sheet URLs (same values as local `.env`; do not put them in git):

```bash
gcloud run services update gods-eye-predictor \
  --region asia-southeast1 \
  --set-env-vars ^;^VITE_SHEET_42=YOUR_42_URL;VITE_SHEET_45=YOUR_45_URL;VITE_SHEET_49=YOUR_49_URL;VITE_SHEET_55=YOUR_55_URL;VITE_SHEET_58=YOUR_58_URL
```

On Linux/macOS use commas instead of `^;^` / `;`:

```bash
gcloud run services update gods-eye-predictor \
  --region asia-southeast1 \
  --set-env-vars VITE_SHEET_42=YOUR_42_URL,VITE_SHEET_45=YOUR_45_URL,VITE_SHEET_49=YOUR_49_URL,VITE_SHEET_55=YOUR_55_URL,VITE_SHEET_58=YOUR_58_URL
```

Cloud Run prints a `https://…run.app` URL. History should show **history prior** after a refresh.

You can also set those variables in **Cloud Run → gods-eye-predictor → Edit & deploy new revision → Variables & secrets**.

### Deploy from GitHub

Connect the `Gods-Eye-Random-Numbers` repo to **Cloud Build** with `cloudbuild.yaml` (region `asia-southeast1`, service `gods-eye-predictor`). After the first image deploy, set `VITE_SHEET_*` on the Cloud Run service as above. Later builds keep those env vars unless you replace them.

### Netlify (optional)

Build command `npm run build`, publish directory `dist`. Set `VITE_SHEET_42` … `VITE_SHEET_58` in the host environment so the client and `/_sheets/*` redirects work in production.
