import { useEffect, useMemo, useState } from "react";
import type { TickerData } from "../types";
import { Sankey } from "./Sankey";
import { IncomeTrend } from "./IncomeTrend";
import { MetricGrid, type Metric } from "./MetricGrid";
import { fmtMoney, fmtPercent, fmtRatio, fmtDate, fmtPercentRaw } from "../format";

type AnalysisView = "sankey" | "trend";
type Granularity = "annual" | "quarterly";

interface FaPrefs {
  view: AnalysisView;
  granularity: Granularity;
  statsOpen: boolean;
}

const STORAGE_KEY = "stock-lens.fa.v1";
const DEFAULT_PREFS: FaPrefs = {
  view: "sankey",
  granularity: "annual",
  statsOpen: true,
};

function loadPrefs(): FaPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: FaPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

interface FaViewProps {
  data: TickerData;
}

export function FaView({ data }: FaViewProps) {
  const initial = useMemo(loadPrefs, []);
  const [view, setView] = useState<AnalysisView>(initial.view);
  const [granularity, setGranularity] = useState<Granularity>(initial.granularity);
  const [statsOpen, setStatsOpen] = useState<boolean>(initial.statsOpen);

  useEffect(() => {
    savePrefs({ view, granularity, statsOpen });
  }, [view, granularity, statsOpen]);

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
    return [
      { label: "Market Cap", value: fmtMoney(info.marketCap, currency) },
      {
        label: "Price",
        value: fmtMoney(info.currentPrice ?? info.regularMarketPrice, currency),
        hint: info.targetMeanPrice
          ? `target ${fmtMoney(info.targetMeanPrice, currency)}`
          : undefined,
      },
      { label: "Trailing P/E", value: fmtRatio(info.trailingPE) },
      { label: "Forward P/E", value: fmtRatio(info.forwardPE) },
      { label: "P/S", value: fmtRatio(info.priceToSalesTrailing12Months) },
      { label: "P/B", value: fmtRatio(info.priceToBook) },
      { label: "PEG", value: fmtRatio(info.pegRatio) },
      { label: "Beta", value: fmtRatio(info.beta) },
      {
        label: "Profit Margin",
        value: fmtPercent(info.profitMargins),
        tone: (info.profitMargins || 0) > 0 ? "good" : "bad",
      },
      { label: "Operating Margin", value: fmtPercent(info.operatingMargins) },
      { label: "Gross Margin", value: fmtPercent(info.grossMargins) },
      { label: "ROE", value: fmtPercent(info.returnOnEquity) },
      { label: "Revenue (TTM)", value: fmtMoney(info.totalRevenue, currency) },
      {
        label: "Net Income (TTM)",
        value: fmtMoney(info.netIncomeToCommon, currency),
      },
      { label: "Free Cash Flow", value: fmtMoney(info.freeCashflow, currency) },
      {
        label: "Dividend Yield",
        value:
          info.dividendYield != null
            ? `${(info.dividendYield * 100).toFixed(2)}%`
            : "—",
      },
    ];
  }, [info, currency]);

  return (
    <div className="space-y-5">
      {/* ===== Combined Earnings + Key Stats card (collapsible) ===== */}
      <section className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setStatsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-ink-800/30 transition-colors"
          aria-expanded={statsOpen}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {lastReportedEarning ? (
              <>
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-400">
                    Latest Earnings
                  </div>
                  <div className="text-xl font-semibold mt-0.5">
                    {fmtDate(lastReportedEarning.date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-400">
                    EPS Actual / Est.
                  </div>
                  <div className="text-xl font-semibold tabular-nums mt-0.5">
                    {fmtRatio(lastReportedEarning.epsActual)}{" "}
                    <span className="text-ink-400 text-sm">/</span>{" "}
                    <span className="text-ink-300">
                      {fmtRatio(lastReportedEarning.epsEstimate)}
                    </span>
                  </div>
                </div>
                {lastReportedEarning.surprisePct != null && (
                  <span
                    className={`pill text-sm ${
                      lastReportedEarning.surprisePct >= 0
                        ? "text-accent-400"
                        : "text-rose-400"
                    }`}
                  >
                    {lastReportedEarning.surprisePct >= 0 ? "▲" : "▼"}{" "}
                    {fmtPercentRaw(lastReportedEarning.surprisePct)} surprise
                  </span>
                )}
              </>
            ) : (
              <span className="text-ink-400 text-sm">No earnings data</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-ink-400">
            <span className="text-xs uppercase tracking-wide hidden sm:inline">
              Key Stats
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${statsOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {statsOpen && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-ink-800/70">
            {upcomingEarning && (
              <div className="text-sm text-ink-300 mt-3">
                Next report:{" "}
                <span className="font-medium text-ink-100">
                  {fmtDate(upcomingEarning.date)}
                </span>
                {upcomingEarning.epsEstimate != null && (
                  <>
                    {" "}— consensus EPS{" "}
                    <span className="font-mono text-accent-400">
                      {fmtRatio(upcomingEarning.epsEstimate)}
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="mt-4">
              <MetricGrid metrics={heroMetrics} columns={4} />
            </div>
          </div>
        )}
      </section>

      {/* ===== Combined Income Flow + Revenue Trend card ===== */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-400">
              {view === "sankey" ? "Income Flow" : "Revenue & Income Trend"}
            </div>
            <h3 className="text-lg font-semibold">
              {granularity === "annual" ? "Annual" : "Quarterly"}
              {view === "sankey" && latest && (
                <>
                  {" "}— <span className="text-accent-400">{fmtDate(latest.period)}</span>
                </>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border border-ink-700 overflow-hidden">
              <button
                onClick={() => setView("sankey")}
                className={`px-3 py-1.5 text-sm font-medium ${
                  view === "sankey"
                    ? "bg-accent-500/20 text-accent-400"
                    : "bg-transparent text-ink-300 hover:bg-ink-800"
                }`}
              >
                Income Flow
              </button>
              <button
                onClick={() => setView("trend")}
                className={`px-3 py-1.5 text-sm font-medium ${
                  view === "trend"
                    ? "bg-accent-500/20 text-accent-400"
                    : "bg-transparent text-ink-300 hover:bg-ink-800"
                }`}
              >
                Revenue Trend
              </button>
            </div>
            <div className="inline-flex rounded-md border border-ink-700 overflow-hidden">
              {(["annual", "quarterly"] as Granularity[]).map((g) => (
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
        </div>

        {view === "sankey" ? (
          latest ? (
            <Sankey period={latest} currency={currency} />
          ) : (
            <p className="text-ink-400 text-sm">
              No income statement data available.
            </p>
          )
        ) : periods.length > 0 ? (
          <IncomeTrend periods={periods} granularity={granularity} />
        ) : (
          <p className="text-ink-400 text-sm">No data.</p>
        )}
      </section>
    </div>
  );
}
