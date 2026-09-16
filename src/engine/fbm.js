/** CPU port of the God's Eye thermal.js / lab value-noise FBM. */

export function fract(x) {
  return x - Math.floor(x);
}

export function mix(a, b, t) {
  return a + (b - a) * t;
}

export function hash2(x, y) {
  let px = fract(x * 0.1031);
  let py = fract(y * 0.1031);
  let pz = fract(x * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px += d;
  py += d;
  pz += d;
  return fract((px + py) * pz);
}

export function valueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
}

export function fbm(x, y, octaves = 4) {
  let v = 0;
  let a = 0.5;
  let px = x;
  let py = y;
  const oct = Math.max(1, Math.min(8, octaves | 0));
  for (let i = 0; i < oct; i++) {
    v += a * valueNoise(px, py);
    px = px * 2 + 100;
    py = py * 2 + 100;
    a *= 0.5;
  }
  return v;
}

/** FNV-1a 32-bit — lab hashSeed. */
export function hashSeed(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
