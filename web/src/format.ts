export function fmtMoney(v: number | null | undefined, currency = "USD"): string {
  if (v == null || !isFinite(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  let n: number, suffix: string;
  if (abs >= 1e12) { n = abs / 1e12; suffix = "T"; }
  else if (abs >= 1e9) { n = abs / 1e9; suffix = "B"; }
  else if (abs >= 1e6) { n = abs / 1e6; suffix = "M"; }
  else if (abs >= 1e3) { n = abs / 1e3; suffix = "K"; }
  else { n = abs; suffix = ""; }
  const rounded = n >= 100 ? n.toFixed(0) : n.toFixed(2);
  const sym = currency === "USD" ? "$" : "";
  return `${sign}${sym}${rounded}${suffix}`;
}

export function fmtNumber(v: number | null | undefined, digits = 2): string {
  if (v == null || !isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function fmtPercent(v: number | null | undefined, digits = 2): string {
  if (v == null || !isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtPercentRaw(v: number | null | undefined, digits = 2): string {
  // value already in percent (e.g. surprisePct)
  if (v == null || !isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtRatio(v: number | null | undefined, digits = 2): string {
  if (v == null || !isFinite(v)) return "—";
  return v.toFixed(digits);
}
