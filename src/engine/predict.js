import { fbm, hashSeed } from './fbm.js';
import {
  DRIFT_X,
  DRIFT_Y,
  OVERDUE_BETA,
  PAIR_GAMMA,
  PICK_COUNT,
} from '../config.js';

export function poolSize(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return { lo, hi, n: Math.max(2, hi - lo + 1) };
}

export function clampRange(min, max, count = PICK_COUNT) {
  let lo = Math.round(min);
  let hi = Math.round(max);
  if (!Number.isFinite(lo)) lo = 1;
  if (!Number.isFinite(hi)) hi = lo + count;
  if (hi - lo + 1 < count) hi = lo + count - 1;
  if (hi - lo + 1 > 400) hi = lo + 399;
  return [lo, hi];
}

export function extent(vals, key = 'v') {
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of vals) {
    const x = d[key];
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  return [lo, hi || 1];
}

export function seedOffset(seedStr) {
  const s = String(seedStr || '').trim();
  if (!s) return 0;
  return (hashSeed(s) / 0x100000000) * 40;
}

/**
 * Mixed field: (1-α)·FBM + α·freq + β·overdue.
 * Pair boost is applied later, at peak-commit time.
 */
export function buildField({
  min,
  max,
  octaves,
  scale,
  t,
  ou = 0,
  seedOff = 0,
  stats = null,
  alpha = 0,
}) {
  const { lo, n } = poolSize(min, max);
  const a = stats?.loaded ? alpha : 0;
  const b = stats?.loaded ? OVERDUE_BETA : 0;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const num = lo + i;
    const x = (i / Math.max(1, n - 1)) * scale;
    const f = fbm(x + t * DRIFT_X + seedOff, t * DRIFT_Y + ou * 0.25, octaves);
    const freq = stats?.freq?.[num] ?? 0;
    const overdue = stats?.overdue?.[num] ?? 0;
    const v = (1 - a) * f + a * freq + b * overdue;
    out[i] = { n: num, fbm: f, freq, overdue, v };
  }
  return out;
}

export function commitPeaks(vals, count = PICK_COUNT, stats = null) {
  if (!vals.length) {
    return { picks: [], chosen: new Set(), sep: 0, energy: 0 };
  }
  const nPick = Math.min(count, vals.length);
  const gap = Math.max(1, Math.floor(vals.length / (nPick * 2)));
  const [lo, hi] = extent(vals, 'v');
  const gamma = stats?.loaded ? PAIR_GAMMA : 0;
  const pairRho = stats?.pairRho;
  const chosen = [];

  const tryPass = (k) => {
    while (chosen.length < nPick) {
      let best = null;
      let bestV = -Infinity;
      for (const d of vals) {
        if (chosen.some((s) => s.n === d.n || Math.abs(s.n - d.n) < k)) continue;
        let v = d.v;
        if (gamma && pairRho && chosen.length) {
          let s = 0;
          for (const c of chosen) s += pairRho(c.n, d.n);
          v += gamma * (s / chosen.length);
        }
        if (v > bestV) {
          bestV = v;
          best = d;
        }
      }
      if (!best) break;
      chosen.push({ ...best, peakV: bestV });
    }
  };

  tryPass(gap);
  tryPass(1);

  const ns = chosen.map((d) => d.n).sort((a, b) => a - b);
  let sep = 0;
  for (let i = 1; i < ns.length; i++) sep += ns[i] - ns[i - 1];

  const picks = chosen
    .slice()
    .sort((a, b) => a.n - b.n)
    .map((d, i) => ({
      n: d.n,
      label: String(d.n).padStart(2, '0'),
      rankLabel: String(i + 1).padStart(2, '0'),
      confPct:
        Math.round(
          Math.min(
            99,
            Math.max(46, 46 + 50 * ((d.peakV - lo) / (hi - lo || 1))),
          ),
        ) + '%',
    }));

  return {
    picks,
    chosen: new Set(chosen.map((d) => d.n)),
    sep: ns.length > 1 ? sep / (ns.length - 1) : 0,
    energy: hi - lo,
  };
}
