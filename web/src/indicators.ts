// Simple lightweight TA indicators implemented in JS.
// Inputs are arrays of close prices (or whatever); outputs are aligned arrays of equal
// length where leading values that cannot be computed are NaN.

export function sma(values: number[], window: number): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(NaN);
  if (window <= 0 || window > n) return out;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

export function ema(values: number[], window: number): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(NaN);
  if (window <= 0 || n === 0) return out;
  const k = 2 / (window + 1);
  // Seed with SMA over the first `window` values.
  if (n < window) return out;
  let seed = 0;
  for (let i = 0; i < window; i++) seed += values[i];
  seed /= window;
  out[window - 1] = seed;
  for (let i = window; i < n; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

export function bollinger(values: number[], window = 20, mult = 2): {
  mid: number[];
  upper: number[];
  lower: number[];
} {
  const n = values.length;
  const mid = sma(values, window);
  const upper = new Array<number>(n).fill(NaN);
  const lower = new Array<number>(n).fill(NaN);
  for (let i = window - 1; i < n; i++) {
    const m = mid[i];
    if (!isFinite(m)) continue;
    let sq = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const d = values[j] - m;
      sq += d * d;
    }
    const sd = Math.sqrt(sq / window);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { mid, upper, lower };
}

export function rsi(values: number[], window = 14): number[] {
  const n = values.length;
  const out = new Array<number>(n).fill(NaN);
  if (n <= window) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= window; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / window;
  let avgLoss = loss / window;
  out[window] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = window + 1; i < n; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (window - 1) + g) / window;
    avgLoss = (avgLoss * (window - 1) + l) / window;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const n = values.length;
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const m = new Array<number>(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (isFinite(fastEma[i]) && isFinite(slowEma[i])) m[i] = fastEma[i] - slowEma[i];
  }
  // EMA on the macd line — but only where defined; copy the defined values into
  // a compact array and re-pad.
  const start = m.findIndex((v) => isFinite(v));
  const sig = new Array<number>(n).fill(NaN);
  if (start >= 0) {
    const compact = m.slice(start);
    const sigCompact = ema(compact, signal);
    for (let i = 0; i < sigCompact.length; i++) sig[start + i] = sigCompact[i];
  }
  const hist = m.map((v, i) => (isFinite(v) && isFinite(sig[i]) ? v - sig[i] : NaN));
  return { macd: m, signal: sig, histogram: hist };
}
