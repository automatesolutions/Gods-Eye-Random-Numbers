function todayStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function keyFor(gameId, min, max) {
  const id = gameId || 'custom-' + min + '-' + max;
  return 'ge-daily-' + id;
}

export function calendarDay() {
  return todayStamp();
}

export function readDaily(gameId, min, max) {
  try {
    const raw = localStorage.getItem(keyFor(gameId, min, max));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved?.picks?.length || saved.date !== todayStamp()) return null;
    return saved;
  } catch {
    return null;
  }
}

export function writeDaily(gameId, min, max, payload) {
  try {
    localStorage.setItem(
      keyFor(gameId, min, max),
      JSON.stringify({ date: todayStamp(), ...payload }),
    );
  } catch {
    /* quota */
  }
}

export function readDrawMode() {
  try {
    const m = localStorage.getItem('ge-draw-mode');
    return m === 'manual' ? 'manual' : 'daily';
  } catch {
    return 'daily';
  }
}

export function writeDrawMode(mode) {
  try {
    localStorage.setItem('ge-draw-mode', mode);
  } catch {
    /* quota */
  }
}
