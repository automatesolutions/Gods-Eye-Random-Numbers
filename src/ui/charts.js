// Live SVG charts. Marks carry CSS classes (.c-bar, .c-dot, …) so colours
// live in style.css; this file only sets geometry and per-value opacity.

const NS = 'http://www.w3.org/2000/svg';
const BAR_W = 10;
const H = 100;

function el(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

function extent(vals) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of vals) {
    if (d.v < lo) lo = d.v;
    if (d.v > hi) hi = d.v;
  }
  return [lo, hi - lo || 1];
}

const f1 = (x) => Math.round(x * 10) / 10;

export function createHeat(svg) {
  let n = 0;
  let freq = [];
  let bars = [];
  let line = null;

  function build(count) {
    n = count;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${n * BAR_W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const gFreq = el('g', { class: 'c-freq-layer' }, svg);
    const gBars = el('g', { class: 'c-bar-layer' }, svg);
    freq = [];
    bars = [];
    for (let i = 0; i < n; i++) {
      const x = i * BAR_W + 0.6;
      freq.push(el('rect', { class: 'c-freq', x, width: BAR_W - 1.6, y: H, height: 0 }, gFreq));
      bars.push(el('rect', { class: 'c-bar', x, width: BAR_W - 1.6, y: H, height: 0 }, gBars));
    }
    line = el('path', { class: 'c-line', d: '' }, svg);
  }

  return function update(vals, chosen, showFreq) {
    if (!vals.length) return;
    if (vals.length !== n) build(vals.length);
    const [lo, span] = extent(vals);
    let d = '';
    for (let i = 0; i < n; i++) {
      const v = (vals[i].v - lo) / span;
      const bh = 5 + v * 90;
      const pick = chosen.has(vals[i].n);
      const b = bars[i];
      b.setAttribute('y', f1(H - bh));
      b.setAttribute('height', f1(bh));
      b.setAttribute('fill-opacity', pick ? 1 : f1((0.1 + v * 0.22) * 100) / 100);
      b.classList.toggle('is-pick', pick);

      const fh = showFreq ? 4 + (vals[i].freq || 0) * 88 : 0;
      freq[i].setAttribute('y', f1(H - fh));
      freq[i].setAttribute('height', f1(fh));

      d += (i ? 'L' : 'M') + f1(i * BAR_W + BAR_W / 2) + ' ' + f1(H - 5 - v * 90);
    }
    line.setAttribute('d', d);
  };
}

export function createOrbit(svg, { labels = true } = {}) {
  const S = 200;
  const C = S / 2;
  const R = 88;
  let n = 0;
  let dots = [];
  let halos = [];
  let tags = [];

  function build(count) {
    n = count;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${S} ${S}`);
    const gRings = el('g', { class: 'c-ring-layer' }, svg);
    for (let k = 1; k <= 3; k++) el('circle', { class: 'c-ring', cx: C, cy: C, r: f1((R * k) / 3) }, gRings);
    const gDots = el('g', { class: 'c-dot-layer' }, svg);
    dots = [];
    for (let i = 0; i < n; i++) dots.push(el('circle', { class: 'c-dot', cx: C, cy: C, r: 1 }, gDots));
    const gPicks = el('g', { class: 'c-pick-layer' }, svg);
    halos = [];
    tags = [];
    for (let j = 0; j < 6; j++) {
      halos.push(el('circle', { class: 'c-halo', cx: -50, cy: -50, r: 6 }, gPicks));
      if (labels) tags.push(el('text', { class: 'c-label', x: -50, y: -50 }, gPicks));
    }
    el('circle', { class: 'c-core', cx: C, cy: C, r: 1.2 }, svg);
  }

  return function update(vals, chosen, t) {
    if (!vals.length) return;
    if (vals.length !== n) build(vals.length);
    const [lo, span] = extent(vals);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const v = (vals[i].v - lo) / span;
      const ang = i * 2.399963 + t * 0.06;
      const rad = Math.sqrt((i + 0.5) / n) * R;
      const x = f1(C + Math.cos(ang) * rad);
      const y = f1(C + Math.sin(ang) * rad);
      const pick = chosen.has(vals[i].n);
      const dot = dots[i];
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', pick ? 2.2 : f1(0.6 + v * 1.4));
      dot.setAttribute('fill-opacity', pick ? 1 : f1((0.15 + v * 0.55) * 100) / 100);
      dot.classList.toggle('is-pick', pick);
      if (pick && j < 6) {
        halos[j].setAttribute('cx', x);
        halos[j].setAttribute('cy', y);
        halos[j].setAttribute('r', f1(6 + Math.sin(t * 2 + i) * 1));
        if (labels) {
          tags[j].setAttribute('x', f1(x + 8));
          tags[j].setAttribute('y', f1(y + 2.5));
          tags[j].textContent = String(vals[i].n);
        }
        j++;
      }
    }
    for (; j < 6; j++) {
      halos[j].setAttribute('cx', -50);
      if (labels) tags[j].setAttribute('x', -50);
    }
  };
}
