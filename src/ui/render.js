import { GAMES, PICK_COUNT } from '../config.js';

const $ = (id) => document.getElementById(id);

let picksKey = null;

export function mountChips(onSelect) {
  const root = $('game-chips');
  root.innerHTML = '';
  for (const g of GAMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.game = g.id;
    b.textContent = g.label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => onSelect(g.id));
    root.appendChild(b);
  }
}

function paintFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const pct = ((Number(input.value) - min) / (max - min || 1)) * 100;
  input.style.setProperty('--fill', pct + '%');
}

export function bindControls(handlers) {
  $('min').addEventListener('change', (e) => handlers.onMin(e.target.value));
  $('max').addEventListener('change', (e) => handlers.onMax(e.target.value));
  $('octaves').addEventListener('input', (e) => handlers.onOct(e.target.value));
  $('scale').addEventListener('input', (e) => handlers.onScale(e.target.value));
  $('alpha').addEventListener('input', (e) => handlers.onAlpha(e.target.value));
  $('seed').addEventListener('change', (e) => handlers.onSeed(e.target.value));
  $('generate').addEventListener('click', () => handlers.onGenerate());
  $('copy').addEventListener('click', () => handlers.onCopy());
  for (const b of document.querySelectorAll('#mode-chips button')) {
    b.addEventListener('click', () => handlers.onMode(b.dataset.mode));
  }
}

export function flashCopied(ok) {
  const btn = $('copy');
  const text = $('copy-text');
  const use = btn.querySelector('use');
  btn.classList.toggle('done', ok);
  text.textContent = ok ? 'Copied' : 'Copy failed';
  if (ok) use.setAttribute('href', '#i-check');
  clearTimeout(flashCopied.t);
  flashCopied.t = setTimeout(() => {
    btn.classList.remove('done');
    text.textContent = 'Copy';
    use.setAttribute('href', '#i-copy');
  }, 1600);
}

function friendlyDate() {
  try {
    return new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function renderPicks(state) {
  const key = state.picks.map((p) => p.n).join(',');
  if (key === picksKey) return;
  const animate = picksKey !== null && key !== '';
  picksKey = key;

  const root = $('picks');
  root.innerHTML = '';
  if (!state.picks.length) {
    for (let i = 0; i < PICK_COUNT; i++) {
      const li = document.createElement('li');
      li.className = 'pick ghost';
      li.setAttribute('aria-hidden', 'true');
      li.innerHTML = '<div class="pn">··</div><div class="pc">&nbsp;</div>';
      root.appendChild(li);
    }
    return;
  }
  state.picks.forEach((p) => {
    const li = document.createElement('li');
    li.className = 'pick';
    li.setAttribute('aria-label', p.n + ', peak strength ' + p.confPct);
    li.innerHTML =
      '<div class="pn">' + p.label + '</div>' +
      '<div class="conf" aria-hidden="true"><i style="width:' + p.confPct + '"></i></div>' +
      '<div class="pc" aria-hidden="true">' + p.confPct + '<span class="pc-word"> strength</span></div>';
    root.appendChild(li);
  });
  // motion.js animates the new cards in.
  if (animate) root.dispatchEvent(new CustomEvent('picks:new'));
}

function renderHistory(state) {
  const strip = $('history-strip');
  const recent = state.recentDraws || [];
  if (!recent.length) {
    let title = 'No past draws yet';
    let body = 'Every number starts with equal weight until history loads.';
    if (state.sheetError) {
      title = 'Couldn’t load past draws';
      body = 'Using equal weight for every number. Try again later.';
    } else if (!state.gameId) {
      title = 'Custom range';
      body = 'Past draws only apply to the preset games. Pick one above to use them.';
    } else if (state.sheetLoading) {
      title = 'Loading past draws…';
      body = '';
    }
    strip.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'empty';
    const strong = document.createElement('strong');
    strong.textContent = title;
    box.appendChild(strong);
    if (body) box.appendChild(document.createTextNode(body));
    strip.appendChild(box);
    return;
  }
  const picked = new Set(state.picks.map((p) => p.n));
  strip.innerHTML = '';
  for (const d of recent) {
    const el = document.createElement('div');
    el.className = 'draw';
    const when = document.createElement('div');
    when.className = 'when';
    when.textContent = d.date || 'Undated';
    const nums = document.createElement('div');
    nums.className = 'nums';
    for (const n of d.numbers) {
      const s = document.createElement('span');
      s.textContent = String(n).padStart(2, '0');
      if (picked.has(n)) {
        s.className = 'hit';
        s.title = 'Also in your set';
      }
      nums.appendChild(s);
    }
    el.appendChild(when);
    el.appendChild(nums);
    strip.appendChild(el);
  }
}

export function renderChrome(state) {
  const n = state.max - state.min + 1;
  const daily = state.drawMode === 'daily';
  const lockedToday = daily && state.dailyLocked;
  const histOn = Boolean(state.stats?.loaded);
  const game = GAMES.find((g) => g.id === state.gameId);

  $('draw-label').textContent = daily
    ? friendlyDate()
    : 'Draw #' + state.draws;
  $('hero-lede').textContent =
    (game ? game.label : 'Custom ' + state.min + '–' + state.max) +
    ' · ' +
    (daily ? 'today’s set' : 'manual draws');

  $('min').value = String(state.min);
  $('max').value = String(state.max);
  $('pool-label').textContent = n + ' numbers in the pool';
  for (const [id, val] of [
    ['octaves', state.octaves],
    ['scale', state.scaleRaw],
    ['alpha', Math.round(state.historyAlpha * 100)],
  ]) {
    const input = $(id);
    input.value = String(val);
    paintFill(input);
  }
  $('oct-label').textContent = String(state.octaves);
  $('scale-label').textContent = (state.scaleRaw / 10).toFixed(1);
  $('alpha-label').textContent = state.historyAlpha.toFixed(2);
  if (document.activeElement !== $('seed')) $('seed').value = state.seed;

  $('axis-min').textContent = String(state.min);
  $('axis-mid').textContent = String(Math.round((state.min + state.max) / 2));
  $('axis-max').textContent = String(state.max);
  $('orbit-meta').textContent = n + ' numbers · ' + PICK_COUNT + ' picked';
  $('field-caption').textContent = histOn ? 'live · history on' : 'live · equal weight';
  $('legend-freq').hidden = !histOn;

  $('sep-label').textContent = state.picks.length ? state.sep.toFixed(1) : '—';
  $('energy-label').textContent = state.picks.length ? state.energy.toFixed(3) : '—';
  const cal = $('cal-label');
  cal.textContent = histOn ? 'History prior' : 'Uniform prior';
  cal.className = 'v word ' + (histOn ? 'on' : 'off');
  $('cal-mean').textContent = histOn
    ? 'Past frequency, recency and pairs tilt the field.'
    : 'No history. Every number starts equal.';

  for (const b of document.querySelectorAll('#mode-chips button')) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === state.drawMode));
  }
  for (const b of document.querySelectorAll('#game-chips button')) {
    b.setAttribute('aria-pressed', String(b.dataset.game === state.gameId));
  }

  const gen = $('generate');
  gen.disabled = lockedToday;
  gen.classList.toggle('held', lockedToday);
  gen.querySelector('use').setAttribute('href', lockedToday ? '#i-lock' : '#i-refresh');
  $('generate-text').textContent = lockedToday
    ? 'Saved for today'
    : daily
      ? 'Get today’s numbers'
      : 'New numbers';
  $('draw-hint').textContent = lockedToday
    ? 'Come back tomorrow for a new set, or switch to Manual to draw again now.'
    : daily
      ? 'One set per game per day. It stays until midnight.'
      : 'Draw as often as you like. Nothing changes until you press the button.';
  $('copy').disabled = !state.picks.length;

  const pill = $('sheet-pill');
  pill.classList.toggle('on', histOn && !state.sheetError);
  pill.classList.toggle('err', Boolean(state.sheetError));
  $('sheet-pill-text').textContent = state.sheetLoading
    ? 'Loading history…'
    : state.sheetError
      ? 'History error'
      : histOn
        ? 'History on'
        : 'History off';
  pill.title = state.sheetStatus;

  const st = $('sheet-status');
  st.classList.toggle('err', Boolean(state.sheetError));
  st.textContent = state.sheetStatus;

  renderPicks(state);
  renderHistory(state);
}
