function fit(canvas) {
  if (!canvas) return null;
  const r = canvas.getBoundingClientRect();
  if (!r.width) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(r.width * dpr);
  const h = Math.round(r.height * dpr);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  return { ctx, w: r.width, h: r.height };
}

function extentV(vals) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of vals) {
    if (d.v < lo) lo = d.v;
    if (d.v > hi) hi = d.v;
  }
  return [lo, hi || 1];
}

export function drawHeat(canvas, vals, chosen, showFreq) {
  const a = fit(canvas);
  if (!a || !vals.length) return;
  const { ctx, w, h } = a;
  const [lo, hi] = extentV(vals);
  const n = vals.length;
  const bw = w / n;
  const norm = (d) => (d.v - lo) / (hi - lo || 1);

  if (showFreq) {
    for (let i = 0; i < n; i++) {
      const f = vals[i].freq || 0;
      const bh = 6 + f * (h - 16);
      ctx.fillStyle = 'rgba(111,168,184,0.22)';
      ctx.fillRect(i * bw + 0.5, h - bh, Math.max(1, bw - 1.5), bh);
    }
  }

  for (let i = 0; i < n; i++) {
    const v = norm(vals[i]);
    const bh = 8 + v * (h - 18);
    const sel = chosen.has(vals[i].n);
    ctx.fillStyle = sel ? 'rgba(232,161,60,0.95)' : 'rgba(242,237,230,' + (0.08 + v * 0.2) + ')';
    ctx.fillRect(i * bw + 0.5, h - bh, Math.max(1, bw - 1.5), bh);
  }

  ctx.strokeStyle = 'rgba(111,168,184,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = i * bw + bw / 2;
    const y = h - 8 - norm(vals[i]) * (h - 18);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}

export function drawOrbit(canvas, vals, chosen, t) {
  const b = fit(canvas);
  if (!b || !vals.length) return;
  const { ctx, w, h } = b;
  const [lo, hi] = extentV(vals);
  const norm = (d) => (d.v - lo) / (hi - lo || 1);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.44;

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (R * k) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  const n = vals.length;
  for (let i = 0; i < n; i++) {
    const v = norm(vals[i]);
    const ang = i * 2.399963 + t * 0.06;
    const rad = Math.sqrt((i + 0.5) / n) * R;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    const sel = chosen.has(vals[i].n);
    if (sel) {
      ctx.fillStyle = 'rgba(232,161,60,1)';
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,161,60,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 9 + Math.sin(t * 2 + i) * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(242,237,230,0.92)';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.fillText(String(vals[i].n), x + 13, y + 4);
    } else {
      ctx.fillStyle = 'rgba(111,168,184,' + (0.12 + v * 0.55) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + v * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
  ctx.fill();
}
