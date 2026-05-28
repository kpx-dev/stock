import type { ReactNode } from "react";

export interface Metric {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "bad" | "muted";
}

const TONE: Record<NonNullable<Metric["tone"]>, string> = {
  default: "text-ink-100",
  good: "text-accent-400",
  bad: "text-rose-400",
  muted: "text-ink-300",
};

export function MetricGrid({ metrics, columns = 4 }: { metrics: Metric[]; columns?: 2 | 3 | 4 | 6 }) {
  const cols: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-6",
  };
  return (
    <div className={`grid ${cols[columns]} gap-3`}>
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg border border-ink-700/60 bg-ink-900/40 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wide text-ink-400">{m.label}</div>
          <div className={`text-lg font-semibold tabular-nums ${TONE[m.tone || "default"]}`}>{m.value}</div>
          {m.hint && <div className="text-[11px] text-ink-400 mt-0.5">{m.hint}</div>}
        </div>
      ))}
    </div>
  );
}
