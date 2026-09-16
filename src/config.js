/**
 * Paste published Google Sheet CSV URLs here (one tab / gid per pool).
 *
 * File → Share → Publish to web, or:
 *   https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}
 *
 * Leave a value empty to run that game on a uniform prior (history offline).
 * Vite and Netlify proxy `/_sheets/{id}` to these URLs so the browser
 * does not need CORS on docs.google.com.
 */
export const SHEET_URLS = {
  42: '',
  45: '',
  49: '',
  55: '',
  58: '',
};

/**
 * Accepts a published CSV URL, or a normal Share/edit link
 * (`/d/{id}/edit?usp=sharing`) and returns a CSV export URL.
 */
export function toCsvUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/\/export\?/i.test(s) || /output=csv/i.test(s) || /tqx=out:csv/i.test(s)) return s;
  const idMatch = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return s;
  const gidMatch = s.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

export function sheetUrl(gameId) {
  const envKey = 'VITE_SHEET_' + gameId;
  const fromEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env[envKey]
      : '';
  return toCsvUrl(fromEnv || SHEET_URLS[gameId] || '');
}

export const GAMES = [
  { id: '42', label: '6/42', min: 1, max: 42, picks: 6 },
  { id: '45', label: '6/45', min: 1, max: 45, picks: 6 },
  { id: '49', label: '6/49', min: 1, max: 49, picks: 6 },
  { id: '55', label: '6/55', min: 1, max: 55, picks: 6 },
  { id: '58', label: '6/58', min: 1, max: 58, picks: 6 },
];

export const DEFAULT_GAME = '49';
export const PICK_COUNT = 6;
export const HISTORY_ALPHA_DEFAULT = 0.35;
export const OVERDUE_BETA = 0.12;
export const PAIR_GAMMA = 0.18;
export const HISTORY_CACHE_MS = 10 * 60 * 1000;
export const DRIFT_X = 0.18;
export const DRIFT_Y = 0.31;
