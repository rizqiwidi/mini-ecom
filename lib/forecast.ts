export function ewma(values: number[], alpha = 0.3) {
  if (!values.length) return 0;
  let s = values[0];
  for (let i = 1; i < values.length; i++) s = alpha * values[i] + (1 - alpha) * s;
  return s;
}

export function linearTrend(values: number[]) {
  const n = values.length;
  if (n < 2) return 0;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, y, i) => acc + x[i] * y, 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

export function forecastNext7(values: number[]) {
  const level = ewma(values);
  const slope = linearTrend(values);
  return Array.from({ length: 7 }, (_, k) => Math.max(0, level + (k + 1) * slope));
}

export function trendFlag(values: number[]) {
  const slope = linearTrend(values);
  if (values.length < 2) return "flat";
  const avg = values.reduce((acc, val) => acc + val, 0) / values.length;
  if (!Number.isFinite(avg) || avg <= 0) {
    return slope > 0 ? "up" : slope < 0 ? "down" : "flat";
  }
  const threshold = Math.max(Math.abs(avg) * 0.005, 500);
  if (slope > threshold) return "up";
  if (slope < -threshold) return "down";
  return "flat";
}

export function forecastNextValue(values: number[]) {
  if (!Array.isArray(values) || !values.length) return 0;
  const [first] = forecastNext7(values);
  if (!Number.isFinite(first)) return 0;
  return first;
}

export function forecastAccuracy(values: number[]): number | null {
  if (!Array.isArray(values) || values.length < 3) return null;
  const n = values.length;
  const horizon = Math.min(7, n - 1);
  let apeSum = 0;
  let count = 0;
  for (let idx = n - horizon; idx < n; idx++) {
    const history = values.slice(0, idx);
    if (history.length < 2) continue;
    const forecast = forecastNext7(history)[0];
    const actual = values[idx];
    if (!Number.isFinite(actual) || actual <= 0) continue;
    const predicted = Number.isFinite(forecast) ? Math.max(0, forecast) : history[history.length - 1];
    const ape = Math.abs((actual - predicted) / actual);
    if (Number.isFinite(ape)) {
      apeSum += ape;
      count += 1;
    }
  }
  if (!count) return null;
  const mape = (apeSum / count) * 100;
  const accuracy = Math.max(0, Math.min(100, 100 - mape));
  return Number(accuracy.toFixed(1));
}
