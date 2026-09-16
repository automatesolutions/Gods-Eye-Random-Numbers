import { GAMES, PICK_COUNT } from '../config.js';
import { calendarDay } from '../data/daily.js';

const $ = (id) => document.getElementById(id);

export function mountChips(onSelect) {
  const root = $('game-chips');
  root.innerHTML = '';
  for (const g of GAMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.game = g.id;
    b.textContent = g.label;
    b.addEventListener('click', () => onSelect(g.id));
    root.appendChild(b);
  }
}

export function bindControls(handlers) {
  $('min').addEventListener('change', (e) => handlers.onMin(e.target.value));
  $('max').addEventListener('change', (e) => handlers.onMax(e.target.value));
  $('octaves').addEventListener('input', (e) => handlers.onOct(e.target.value));
  $('scale').addEventListener('input', (e) => handlers.onScale(e.target.value));
  $('alpha').addEventListener('input', (e) => handlers.onAlpha(e.target.value));
  $('seed').addEventListener('change', (e) => handlers.onSeed(e.target.value));
  $('generate').addEventListener('click', () => handlers.onGenerate());
  for (const b of document.querySelectorAll('#mode-chips button')) {
    b.addEventListener('click', () => handlers.onMode(b.dataset.mode));
  }
}

function pad4(n) {
  return String(n).padStart(4, '0');
}

export function renderChrome(state) {
  const n = state.max - state.min + 1;
  const daily = state.drawMode === 'daily';
  const lockedToday = daily && state.dailyLocked;
  $('draw-label').textContent = daily ? 'DAY ' + calendarDay() : 'DRAW ' + pad4(state.draws);
  $('mode-label').textContent = daily ? 'DAILY' : 'MANUAL';
  $('min').value = String(state.min);
  $('max').value = String(state.max);
  $('pool-label').textContent = 'pool ' + n + ' candidates';
  $('octaves').value = String(state.octaves);
  $('oct-label').textContent = String(state.octaves);
  $('scale').value = String(state.scaleRaw);
  $('scale-label').textContent = (state.scaleRaw / 10).toFixed(1);
  $('alpha').value = String(Math.round(state.historyAlpha * 100));
  $('alpha-label').textContent = state.historyAlpha.toFixed(2);
  if (document.activeElement !== $('seed')) $('seed').value = state.seed;
  $('axis-min').textContent = String(state.min);
  $('axis-mid').textContent = String(Math.round((state.min + state.max) / 2));
  $('axis-max').textContent = String(state.max);
  $('orbit-meta').textContent = n + ' BODIES · ' + PICK_COUNT + ' LOCKED';
  $('field-caption').textContent = state.stats?.loaded
    ? 'live · drifting · frequency ghost'
    : 'live · drifting · uniform';
  $('sep-label').textContent = state.sep.toFixed(1);
  $('energy-label').textContent = state.energy.toFixed(3);
  const histOn = Boolean(state.stats?.loaded);
  $('cal-label').textContent = histOn ? 'history prior' : 'uniform prior';
  $('cal-label').style.color = histOn ? '#e8a13c' : '#6fa8b8';
  $('cal-mean').textContent = histOn
    ? 'Sheet is on. Ten-year frequency, recency, and pairs tilt the field; this is still not a forecast of the next draw.'
    : 'No sheet loaded. Every number starts equal; only the live field chooses the six peaks.';

  for (const b of document.querySelectorAll('#mode-chips button')) {
    b.classList.toggle('active', b.dataset.mode === state.drawMode);
  }

  const gen = $('generate');
  gen.disabled = lockedToday;
  gen.classList.toggle('held', lockedToday);
  gen.textContent = lockedToday
    ? 'LOCKED UNTIL TOMORROW'
    : daily
      ? 'GENERATE TODAY'
      : 'GENERATE';
  $('draw-hint').textContent = lockedToday
    ? 'Today’s six numbers for this game are saved. Switch to Manual if you want a new set before tomorrow.'
    : daily
      ? 'One six-number set per game per calendar day. It stays until midnight local time.'
      : 'Click Generate whenever you want a new set. Nothing auto-refreshes.';

  for (const b of document.querySelectorAll('#game-chips button')) {
    b.classList.toggle(
      'active',
      b.dataset.game === state.gameId && state.min === 1 && state.max === Number(state.gameId),
    );
  }

  const picksEl = $('picks');
  picksEl.innerHTML = '';
  for (const p of state.picks) {
    const card = document.createElement('div');
    card.className = 'pick';
    card.innerHTML =
      '<div class="pk">PEAK ' +
      p.rankLabel +
      '</div><div class="pn">' +
      p.label +
      '</div><div class="conf"><i style="width:' +
      p.confPct +
      '"></i></div><div class="pc">' +
      p.confPct +
      ' conf</div>';
    picksEl.appendChild(card);
  }

  const st = $('sheet-status');
  st.classList.toggle('err', Boolean(state.sheetError));
  st.textContent = state.sheetStatus;

  const strip = $('history-strip');
  const recent = state.recentDraws || [];
  if (!recent.length) {
    strip.innerHTML =
      '<div class="empty-hist">' +
      (state.sheetError
        ? 'Could not load sheet: ' + state.sheetError
        : 'No history loaded. Publish the sheet and paste CSV URLs in src/config.js.') +
      '</div>';
    return;
  }
  strip.innerHTML = '';
  for (const d of recent) {
    const el = document.createElement('div');
    el.className = 'draw';
    const when = document.createElement('div');
    when.className = 'when';
    when.textContent = d.date || 'undated';
    const nums = document.createElement('div');
    nums.className = 'nums';
    nums.textContent = d.numbers.map((n) => String(n).padStart(2, '0')).join('  ');
    el.appendChild(when);
    el.appendChild(nums);
    strip.appendChild(el);
  }
}
