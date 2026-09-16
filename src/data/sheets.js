import { HISTORY_CACHE_MS, sheetUrl } from '../config.js';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => String(x).trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((x) => String(x).trim())) rows.push(row);
  }
  return rows;
}

function isDateCell(raw) {
  const t = String(raw).trim();
  if (!t) return false;
  if (/20\d{2}/.test(t) && /[/\-.]/.test(t)) return true;
  if (/^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$/.test(t)) return true;
  if (/^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/.test(t)) return true;
  if (t.length >= 6 && !Number.isNaN(Date.parse(t))) return true;
  return false;
}

function dateFromRow(row) {
  for (const cell of row) {
    if (isDateCell(cell)) {
      const t = String(cell).trim();
      const ms = Date.parse(t);
      return { label: t, ms: Number.isNaN(ms) ? null : ms };
    }
  }
  return { label: '', ms: null };
}

function intsFromCell(cell, max) {
  const t = String(cell).trim();
  if (/^\d{1,2}$/.test(t)) {
    const n = parseInt(t, 10);
    return n >= 1 && n <= max ? [n] : [];
  }
  if (/^\d{1,2}([,\s\-/]+\d{1,2}){4,}$/.test(t)) {
    return t
      .split(/[,\s\-/]+/)
      .map((x) => parseInt(x, 10))
      .filter((n) => n >= 1 && n <= max);
  }
  return [];
}

function numbersFromRow(row, max) {
  const found = [];
  const seen = new Set();
  for (const cell of row) {
    if (isDateCell(cell)) continue;
    for (const n of intsFromCell(cell, max)) {
      if (!seen.has(n)) {
        seen.add(n);
        found.push(n);
      }
    }
  }
  return found.length >= 6 ? found.slice(0, 6).sort((a, b) => a - b) : null;
}

export function parseDraws(text, max) {
  const normalized =
    !text.includes(',') && text.includes('\t') ? text.replace(/\t/g, ',') : text;
  const rows = parseCsv(normalized);
  const draws = [];
  const dup = new Set();
  for (const row of rows) {
    const numbers = numbersFromRow(row, max);
    if (!numbers) continue;
    const date = dateFromRow(row);
    const key = (date.label || '') + '|' + numbers.join(',');
    if (dup.has(key)) continue;
    dup.add(key);
    draws.push({ date: date.label, ms: date.ms, numbers });
  }
  const dated = draws.filter((d) => d.ms != null);
  const undated = draws.filter((d) => d.ms == null);
  dated.sort((a, b) => a.ms - b.ms);
  return dated.concat(undated);
}

export function buildStats(draws, min, max) {
  if (!draws?.length) {
    return { loaded: false, count: 0, freq: [], overdue: [], pairRho: () => 0, hits: [] };
  }
  const hits = new Array(max + 1).fill(0);
  const lastIndex = new Array(max + 1).fill(-1);
  const pairCounts = new Map();

  draws.forEach((draw, idx) => {
    const nums = draw.numbers.filter((n) => n >= min && n <= max);
    for (const n of nums) {
      hits[n]++;
      lastIndex[n] = idx;
    }
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = Math.min(nums[i], nums[j]);
        const b = Math.max(nums[i], nums[j]);
        const key = a + ',' + b;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  });

  let maxHits = 1;
  for (let n = min; n <= max; n++) if (hits[n] > maxHits) maxHits = hits[n];
  let maxPair = 1;
  for (const v of pairCounts.values()) if (v > maxPair) maxPair = v;

  const freq = new Array(max + 1).fill(0);
  const overdue = new Array(max + 1).fill(0);
  const lastDrawIdx = draws.length - 1;
  const overdueNorm = Math.max(20, draws.length * 0.05);

  for (let n = min; n <= max; n++) {
    freq[n] = hits[n] / maxHits;
    const since = lastIndex[n] < 0 ? draws.length : lastDrawIdx - lastIndex[n];
    overdue[n] = Math.min(1, since / overdueNorm);
  }

  const pairRho = (a, b) => {
    if (a === b) return 0;
    const key = Math.min(a, b) + ',' + Math.max(a, b);
    return (pairCounts.get(key) || 0) / maxPair;
  };

  return { loaded: true, count: draws.length, freq, overdue, pairRho, hits };
}

function cacheKey(gameId) {
  return 'ge-history-' + gameId;
}

export function sheetConfigured(gameId) {
  return Boolean(sheetUrl(gameId));
}

export async function loadHistory(gameId, max) {
  const direct = sheetUrl(gameId);
  const key = cacheKey(gameId);
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.draws && Date.now() - cached.at < HISTORY_CACHE_MS) {
        const stats = buildStats(cached.draws, 1, max);
        return {
          draws: cached.draws,
          stats,
          offline: false,
          error: null,
          fetchedAt: cached.at,
          cached: true,
        };
      }
    }
  } catch {
    /* ignore bad cache */
  }

  const urls = [`/_sheets/${gameId}`];
  if (direct) urls.push(direct);
  let lastErr = 'could not fetch sheet';
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        lastErr = 'HTTP ' + res.status;
        continue;
      }
      const text = await res.text();
      if (!text || /<!DOCTYPE html>/i.test(text.slice(0, 200))) {
        lastErr = 'not a CSV';
        continue;
      }
      const draws = parseDraws(text, max);
      if (!draws.length) {
        lastErr = 'no 6-number rows in 1–' + max;
        continue;
      }
      const at = Date.now();
      try {
        sessionStorage.setItem(key, JSON.stringify({ at, draws }));
      } catch {
        /* quota */
      }
      return {
        draws,
        stats: buildStats(draws, 1, max),
        offline: false,
        error: null,
        fetchedAt: at,
        cached: false,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  const quiet =
    !direct && (lastErr === 'not a CSV' || lastErr === 'HTTP 404' || lastErr === 'HTTP 500');
  return {
    draws: [],
    stats: buildStats([], 1, max),
    offline: true,
    error: quiet ? null : lastErr,
    fetchedAt: null,
  };
}
