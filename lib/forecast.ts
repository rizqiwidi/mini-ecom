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
  const raw = Array.from({ length: 7 }, (_, k) => level + (k + 1) * slope);
  return raw.map((value, index) => {
    const lastActual = values[values.length - 1];
    if (slope < 0) {
      return Math.min(lastActual, Math.max(0, value));
    }
    if (slope > 0) {
      return Math.max(lastActual, value);
    }
    return Math.max(0, value);
  });
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
