import './style.css';
import {
  DEFAULT_GAME,
  DRIFT_X,
  GAMES,
  HISTORY_ALPHA_DEFAULT,
  PICK_COUNT,
} from './config.js';
import { buildField, clampRange, commitPeaks, seedOffset } from './engine/predict.js';
import { createRng, gaussian, ouStep } from './engine/rng.js';
import { loadHistory } from './data/sheets.js';
import {
  readDaily,
  readDrawMode,
  writeDaily,
  writeDrawMode,
} from './data/daily.js';
import { createHeat, createOrbit } from './ui/charts.js';
import { initMotion } from './ui/motion.js';
import { bindControls, flashCopied, mountChips, renderChrome } from './ui/render.js';

const defaultGame = GAMES.find((g) => g.id === DEFAULT_GAME) || GAMES[2];

const state = {
  gameId: defaultGame.id,
  min: defaultGame.min,
  max: defaultGame.max,
  octaves: 4,
  scaleRaw: 34,
  historyAlpha: HISTORY_ALPHA_DEFAULT,
  drawMode: readDrawMode(),
  dailyLocked: false,
  seed: '',
  picks: [],
  draws: 0,
  energy: 0,
  sep: 0,
  stats: null,
  recentDraws: [],
  sheetStatus: '',
  sheetError: null,
  sheetLoading: false,
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const drawHeat = createHeat(document.getElementById('heat'));
const drawOrbit = createOrbit(document.getElementById('orbit'));
const introOrbitEl = document.getElementById('intro-orbit');
const drawIntroOrbit = createOrbit(introOrbitEl, { labels: false });
let introVisible = true;
new IntersectionObserver((entries) => {
  introVisible = entries[entries.length - 1].isIntersecting;
}).observe(introOrbitEl);

let vals = [];
let chosen = new Set();
let t0 = 0;
let lastOu = 0;
let ou = 0;
let rng = Math.random;
let raf = 0;
let histToken = 0;
let dirty = true;
let commitT = 0;

function render() {
  dirty = true;
  renderChrome(state);
}

function formatFetched(ms) {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function applyCommit(result, persistDaily) {
  chosen = result.chosen;
  state.picks = result.picks;
  state.sep = result.sep;
  state.energy = result.energy;
  state.draws += 1;
  if (persistDaily && state.drawMode === 'daily') {
    writeDaily(state.gameId, state.min, state.max, {
      picks: state.picks,
      sep: state.sep,
      energy: state.energy,
      chosen: [...chosen],
    });
    state.dailyLocked = true;
  } else if (state.drawMode === 'manual') {
    state.dailyLocked = false;
  }
  render();
}

function restoreSaved(saved) {
  state.picks = saved.picks;
  state.sep = saved.sep ?? 0;
  state.energy = saved.energy ?? 0;
  chosen = new Set(saved.chosen || saved.picks.map((p) => p.n));
  state.dailyLocked = state.drawMode === 'daily';
  render();
}

function sample(t) {
  return buildField({
    min: state.min,
    max: state.max,
    octaves: state.octaves,
    scale: state.scaleRaw / 10,
    t,
    ou,
    seedOff: seedOffset(state.seed),
    stats: state.stats,
    alpha: state.historyAlpha,
  });
}

function commitNow(persistDaily) {
  const t = (performance.now() - t0) / 1000;
  commitT = t;
  vals = sample(t);
  applyCommit(commitPeaks(vals, PICK_COUNT, state.stats), persistDaily);
}

function settleDraw() {
  if (state.drawMode === 'daily') {
    const saved = readDaily(state.gameId, state.min, state.max);
    if (saved) {
      restoreSaved(saved);
      return;
    }
    commitNow(true);
    return;
  }
  state.dailyLocked = false;
  if (!state.picks.length) commitNow(false);
  else render();
}

function generate() {
  if (state.drawMode === 'daily' && state.dailyLocked) return;
  commitNow(state.drawMode === 'daily');
}

async function loadGameHistory() {
  const token = ++histToken;
  const game = GAMES.find((g) => g.id === state.gameId);
  const max = game ? game.max : state.max;
  state.sheetStatus = 'Loading…';
  state.sheetError = null;
  state.sheetLoading = true;
  render();
  const result = await loadHistory(state.gameId, max);
  if (token !== histToken) return;
  state.sheetLoading = false;
  state.stats = result.stats;
  state.recentDraws = result.draws.slice(-8).reverse();
  state.sheetError = result.error;
  if (result.offline && !result.error) {
    state.sheetStatus = 'No sheet set for this game. Using equal weight.';
  } else if (result.error && !result.draws.length) {
    state.sheetStatus = 'Sheet error: ' + result.error;
  } else {
    const when = result.fetchedAt ? ', updated ' + formatFetched(result.fetchedAt) : '';
    const tag = result.cached ? ' (cached)' : '';
    state.sheetStatus = result.stats.count.toLocaleString() + ' past draws' + when + tag;
  }
  settleDraw();
}

function setGame(id) {
  const g = GAMES.find((x) => x.id === id);
  if (!g) return;
  state.gameId = g.id;
  state.min = g.min;
  state.max = g.max;
  state.picks = [];
  state.dailyLocked = false;
  loadGameHistory();
}

function setRange(min, max) {
  const [lo, hi] = clampRange(min, max);
  state.min = lo;
  state.max = hi;
  const match = GAMES.find((g) => g.min === lo && g.max === hi);
  if (match) {
    if (match.id !== state.gameId) {
      state.gameId = match.id;
      state.picks = [];
      state.dailyLocked = false;
      loadGameHistory();
      return;
    }
  } else {
    state.gameId = '';
    state.stats = null;
    state.recentDraws = [];
    state.sheetStatus = 'Custom range. Past draws not used.';
    state.sheetError = null;
  }
  settleDraw();
}

function setMode(mode) {
  state.drawMode = mode === 'manual' ? 'manual' : 'daily';
  writeDrawMode(state.drawMode);
  settleDraw();
}

async function copyPicks() {
  if (!state.picks.length) return;
  const text = state.picks.map((p) => p.label).join(' ');
  try {
    await navigator.clipboard.writeText(text);
    flashCopied(true);
  } catch {
    flashCopied(false);
  }
}

mountChips(setGame);
bindControls({
  onMin: (v) => setRange(parseInt(v, 10), state.max),
  onMax: (v) => setRange(state.min, parseInt(v, 10)),
  onOct: (v) => {
    state.octaves = parseInt(v, 10);
    render();
  },
  onScale: (v) => {
    state.scaleRaw = parseInt(v, 10);
    render();
  },
  onAlpha: (v) => {
    state.historyAlpha = parseInt(v, 10) / 100;
    render();
  },
  onSeed: (v) => {
    state.seed = v;
    rng = createRng(state.seed);
    render();
  },
  onGenerate: generate,
  onCopy: copyPicks,
  onMode: setMode,
});

document.getElementById('drift-label').textContent = DRIFT_X.toFixed(2) + ' /s';

function loop(now) {
  raf = requestAnimationFrame(loop);
  const t = (now - t0) / 1000;
  const dt = Math.min(0.05, (now - lastOu) / 1000 || 0.016);
  lastOu = now;
  if (reduceMotion.matches) {
    // Hold a still frame; redraw only when something changed.
    if (!dirty) return;
    dirty = false;
    vals = sample(commitT);
    drawHeat(vals, chosen, Boolean(state.stats?.loaded));
    drawOrbit(vals, chosen, commitT);
    drawIntroOrbit(vals, chosen, commitT);
    return;
  }
  ou = ouStep(ou, 1.2, 0, 0.12, dt, gaussian(rng));
  vals = sample(t);
  drawHeat(vals, chosen, Boolean(state.stats?.loaded));
  drawOrbit(vals, chosen, t);
  if (introVisible) drawIntroOrbit(vals, chosen, t);
}

t0 = performance.now();
lastOu = t0;
rng = createRng(state.seed);
render();
raf = requestAnimationFrame(loop);
loadGameHistory();
initMotion();

window.addEventListener('resize', () => { dirty = true; });
reduceMotion.addEventListener?.('change', () => { dirty = true; });
window.addEventListener('beforeunload', () => cancelAnimationFrame(raf));
