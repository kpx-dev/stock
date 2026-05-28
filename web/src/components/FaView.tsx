import { useMemo, useState } from "react";
import type { TickerData } from "../types";
import { Sankey } from "./Sankey";
import { IncomeTrend } from "./IncomeTrend";
import { MetricGrid, type Metric } from "./MetricGrid";
import { fmtMoney, fmtPercent, fmtRatio, fmtDate, fmtPercentRaw } from "../format";

interface FaViewProps {
  data: TickerData;
  theme: "dark" | "light";
}

export function FaView({ data, theme }: FaViewProps) {
  const [granularity, setGranularity] = useState<"annual" | "quarterly">("annual");
  const periods = data.income[granularity];
  const latest = periods[0];

  const earnings = data.earnings;
  const lastReportedEarning = useMemo(() => {
    return earnings.find((e) => e.epsActual != null);
  }, [earnings]);
  const upcomingEarning = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...earnings]
      .reverse()
      .find((e) => e.date.slice(0, 10) >= today && e.epsActual == null);
  }, [earnings]);

  const info = data.info;
  const currency = data.currency || "USD";

  const heroMetrics: Metric[] = useMemo(() => {
    const m: Metric[] = [
      { label: "Market Cap", value: fmtMoney(info.marketCap, currency), tone: "default" },
      {
        label: "Price",
        value: fmtMoney(info.currentPrice ?? info.regularMarketPrice, currency),
        hint: info.targetMeanPrice ? `target ${fmtMoney(info.targetMeanPrice, currency)}` : undefined,
      },
      { label: "Trailing P/E", value: fmtRatio(info.trailingPE) },
      { label: "Forward P/E", value: fmtRatio(info.forwardPE) },
      { label: "P/S", value: fmtRatio(info.priceToSalesTrailing12Months) },
      { label: "P/B", value: fmtRatio(info.priceToBook) },
      { label: "PEG", value: fmtRatio(info.pegRatio) },
      { label: "Beta", value: fmtRatio(info.beta) },
      { label: "Profit Margin", value: fmtPercent(info.profitMargins), tone: (info.profitMargins || 0) > 0 ? "good" : "bad" },
      { label: "Operating Margin", value: fmtPercent(info.operatingMargins) },
      { label: "Gross Margin", value: fmtPercent(info.grossMargins) },
      { label: "ROE", value: fmtPercent(info.returnOnEquity) },
      { label: "Revenue (TTM)", value: fmtMoney(info.totalRevenue, currency) },
      { label: "Net Income (TTM)", value: fmtMoney(info.netIncomeToCommon, currency) },
      { label: "Free Cash Flow", value: fmtMoney(info.freeCashflow, currency) },
      { label: "Dividend Yield", value: info.dividendYield != null ? `${(info.dividendYield * 100).toFixed(2)}%` : "—" },
    ];
    return m;
  }, [info, currency]);

  const earningsCard = lastReportedEarning ? (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-400">Latest Earnings</div>
          <div className="text-2xl font-semibold mt-0.5">{fmtDate(lastReportedEarning.date)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-ink-400">EPS Actual / Estimate</div>
          <div className="text-2xl font-semibold tabular-nums mt-0.5">
            {fmtRatio(lastReportedEarning.epsActual)} <span className="text-ink-400 text-base">/</span>{" "}
            <span className="text-ink-300">{fmtRatio(lastReportedEarning.epsEstimate)}</span>
          </div>
        </div>
        {lastReportedEarning.surprisePct != null && (
          <div
            className={`pill text-sm ${
              lastReportedEarning.surprisePct >= 0 ? "text-accent-400" : "text-rose-400"
            }`}
          >
            {lastReportedEarning.surprisePct >= 0 ? "▲" : "▼"} {fmtPercentRaw(lastReportedEarning.surprisePct)} surprise
          </div>
        )}
      </div>
      {upcomingEarning && (
        <div className="mt-3 text-sm text-ink-300">
          Next report:{" "}
          <span className="font-medium text-ink-100">{fmtDate(upcomingEarning.date)}</span>
          {upcomingEarning.epsEstimate != null && (
            <>
              {" "}— consensus EPS{" "}
              <span className="font-mono text-accent-400">{fmtRatio(upcomingEarning.epsEstimate)}</span>
            </>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_2fr] gap-4">
        <div className="space-y-3">{earningsCard}</div>
        <div className="card p-4 sm:p-5">
          <div className="text-xs uppercase tracking-wide text-ink-400 mb-3">Key Stats</div>
          <MetricGrid metrics={heroMetrics} columns={4} />
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-400">Income Flow</div>
            <h3 className="text-lg font-semibold">
              {granularity === "annual" ? "Annual" : "Quarterly"} —{" "}
              <span className="text-accent-400">{fmtDate(latest?.period)}</span>
            </h3>
          </div>
          <div className="inline-flex rounded-md border border-ink-700 overflow-hidden">
            {(["annual", "quarterly"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  granularity === g
                    ? "bg-accent-500/20 text-accent-400"
                    : "bg-transparent text-ink-300 hover:bg-ink-800"
                }`}
              >
                {g === "annual" ? "Annual" : "Quarterly"}
              </button>
            ))}
          </div>
        </div>
        {latest ? (
          <Sankey period={latest} theme={theme} currency={currency} />
        ) : (
          <p className="text-ink-400 text-sm">No income statement data available.</p>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <div className="text-xs uppercase tracking-wide text-ink-400 mb-1">
          {granularity === "annual" ? "Annual" : "Quarterly"} Trend (Last {granularity === "annual" ? 6 : 12} periods)
        </div>
        <h3 className="text-lg font-semibold mb-3">Revenue · Operating Income · Net Income</h3>
        {periods.length > 0 ? (
          <IncomeTrend periods={periods} theme={theme} granularity={granularity} />
        ) : (
          <p className="text-ink-400 text-sm">No data.</p>
        )}
      </section>
    </div>
  );
}

