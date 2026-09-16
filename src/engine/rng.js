/** Lab RNG: Numerical Recipes LCG, Box–Muller pair, Ornstein–Uhlenbeck. */

export function createLcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createRng(seedStr) {
  const s = String(seedStr || '').trim();
  if (!s) return Math.random;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return createLcg(h >>> 0);
}

export function gaussian(rng = Math.random) {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function correlatedPair(rho, rng = Math.random) {
  const z1 = gaussian(rng);
  const z2 = gaussian(rng);
  const s = Math.sqrt(Math.max(0, 1 - rho * rho));
  return [z1, rho * z1 + s * z2];
}

export function ouStep(x, theta, mu, sigma, dt, z) {
  return x + theta * (mu - x) * dt + sigma * Math.sqrt(Math.max(0, dt)) * z;
}
