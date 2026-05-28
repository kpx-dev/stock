import { useEffect, useMemo, useState } from "react";
import type { TickerData } from "../types";
import { PlotlyChart } from "./PlotlyChart";
import { sma, bollinger, rsi, macd } from "../indicators";
import { fmtMoney, fmtPercentRaw } from "../format";

type Period = "1d" | "3d" | "1w" | "1m" | "6m" | "1y" | "5y" | "all";

const PERIODS: { id: Period; label: string; days: number | "all" }[] = [
  { id: "1d", label: "1D", days: 1 },
  { id: "3d", label: "3D", days: 3 },
  { id: "1w", label: "1W", days: 5 },
  { id: "1m", label: "1M", days: 21 },
  { id: "6m", label: "6M", days: 126 },
  { id: "1y", label: "1Y", days: 252 },
  { id: "5y", label: "5Y", days: 252 * 5 },
  { id: "all", label: "All", days: "all" },
];

interface Toggles {
  candles: boolean;
  bb: boolean;
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  volume: boolean;
  rsi: boolean;
  macd: boolean;
}

const DEFAULT_TOGGLES: Toggles = {
  candles: true,
  bb: true,
  sma20: true,
  sma50: true,
  sma200: true,
  volume: true,
  rsi: true,
  macd: true,
};

const STORAGE_KEY = "stock-lens.ta.v1";

interface SavedState {
  period: Period;
  toggles: Toggles;
}

function loadState(): SavedState {
  if (typeof window === "undefined") return { period: "1y", toggles: DEFAULT_TOGGLES };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { period: "1y", toggles: DEFAULT_TOGGLES };
    const parsed = JSON.parse(raw);
    return {
      period: parsed.period || "1y",
      toggles: { ...DEFAULT_TOGGLES, ...(parsed.toggles || {}) },
    };
  } catch {
    return { period: "1y", toggles: DEFAULT_TOGGLES };
  }
}

function saveState(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

interface TaViewProps {
  data: TickerData;
}

export function TaView({ data }: TaViewProps) {
  const initial = useMemo(loadState, []);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [toggles, setToggles] = useState<Toggles>(initial.toggles);

  useEffect(() => {
    saveState({ period, toggles });
  }, [period, toggles]);

  const setToggle = (k: keyof Toggles) => setToggles((t) => ({ ...t, [k]: !t[k] }));

  const fontColor = "#e6ebf2";
  const gridColor = "rgba(255,255,255,0.06)";
  const currency = data.currency || "USD";

  const { price, ind } = useMemo(() => {
    const all = data.prices.filter((p) => p.close != null);
    const closes = all.map((p) => p.close as number);
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);
    const bb = bollinger(closes, 20, 2);
    const rsi14 = rsi(closes, 14);
    const macdRes = macd(closes, 12, 26, 9);

    const def = PERIODS.find((p) => p.id === period)!;
    const days = def.days === "all" ? all.length : def.days;
    const start = Math.max(0, all.length - days);
    const slice = <T,>(arr: T[]) => arr.slice(start);

    return {
      price: slice(all),
      ind: {
        sma20: slice(sma20),
        sma50: slice(sma50),
        sma200: slice(sma200),
        bbUpper: slice(bb.upper),
        bbLower: slice(bb.lower),
        rsi: slice(rsi14),
        macdLine: slice(macdRes.macd),
        macdSignal: slice(macdRes.signal),
        macdHist: slice(macdRes.histogram),
      },
    };
  }, [data, period]);

  const x = price.map((p) => p.date);
  const last = price[price.length - 1];
  const first = price[0];
  const pctChange =
    first && last && first.close && last.close
      ? ((last.close - first.close) / first.close) * 100
      : null;

  // ---- Layout the subplots dynamically based on toggles ----
  // Always reserve space for the price pane; Volume, RSI, MACD each get 0.18
  // of the vertical space when enabled. Compute domains top-down.
  const subPanels: ("price" | "volume" | "rsi" | "macd")[] = ["price"];
  if (toggles.volume) subPanels.push("volume");
  if (toggles.rsi) subPanels.push("rsi");
  if (toggles.macd) subPanels.push("macd");

  const subHeights: Record<string, number> = {
    price: 0.55,
    volume: 0.15,
    rsi: 0.15,
    macd: 0.15,
  };

  // Normalize to 1 with a small gap budget.
  const gap = 0.025;
  const totalContent = subPanels.reduce((s, k) => s + subHeights[k], 0);
  const totalGap = (subPanels.length - 1) * gap;
  const scale = (1 - totalGap) / totalContent;
  const domains: Record<string, [number, number]> = {};
  let cursor = 1;
  for (const k of subPanels) {
    const h = subHeights[k] * scale;
    domains[k] = [cursor - h, cursor];
    cursor -= h + gap;
  }

  const yMap: Record<string, string> = {
    price: "y",
    volume: "y2",
    rsi: "y3",
    macd: "y4",
  };

  // ---- Build trace list ----
  const traces: any[] = [];

  if (toggles.candles) {
    traces.push({
      x,
      open: price.map((p) => p.open),
      high: price.map((p) => p.high),
      low: price.map((p) => p.low),
      close: price.map((p) => p.close),
      type: "candlestick",
      name: "Price",
      yaxis: yMap.price,
      increasing: { line: { color: "#22c55e" }, fillcolor: "rgba(34,197,94,0.7)" },
      decreasing: { line: { color: "#f87171" }, fillcolor: "rgba(248,113,113,0.7)" },
    });
  }

  if (toggles.bb) {
    traces.push({
      x,
      y: ind.bbUpper,
      type: "scatter",
      mode: "lines",
      name: "BB Upper",
      yaxis: yMap.price,
      line: { color: "rgba(168, 85, 247, 0.55)", width: 1, dash: "dot" },
      hoverinfo: "skip",
      legendgroup: "bb",
    });
    traces.push({
      x,
      y: ind.bbLower,
      type: "scatter",
      mode: "lines",
      name: "BB Lower",
      yaxis: yMap.price,
      line: { color: "rgba(168, 85, 247, 0.55)", width: 1, dash: "dot" },
      fill: "tonexty",
      fillcolor: "rgba(168, 85, 247, 0.06)",
      hoverinfo: "skip",
      legendgroup: "bb",
      showlegend: false,
    });
  }

  if (toggles.sma20)
    traces.push({
      x,
      y: ind.sma20,
      type: "scatter",
      mode: "lines",
      name: "SMA 20",
      yaxis: yMap.price,
      line: { color: "#facc15", width: 1.5 },
    });
  if (toggles.sma50)
    traces.push({
      x,
      y: ind.sma50,
      type: "scatter",
      mode: "lines",
      name: "SMA 50",
      yaxis: yMap.price,
      line: { color: "#fb923c", width: 1.5 },
    });
  if (toggles.sma200)
    traces.push({
      x,
      y: ind.sma200,
      type: "scatter",
      mode: "lines",
      name: "SMA 200",
      yaxis: yMap.price,
      line: { color: "#38bdf8", width: 1.6 },
    });

  if (toggles.volume) {
    traces.push({
      x,
      y: price.map((p) => p.volume),
      type: "bar",
      name: "Volume",
      yaxis: yMap.volume,
      marker: {
        color: price.map((p, i) => {
          const prev = i > 0 ? price[i - 1].close : p.close;
          return p.close != null && prev != null && p.close >= prev
            ? "rgba(34,197,94,0.55)"
            : "rgba(248,113,113,0.55)";
        }),
      },
      hovertemplate: "Volume: %{y:,.2s}<extra></extra>",
    });
  }

  if (toggles.rsi) {
    traces.push({
      x,
      y: ind.rsi,
      type: "scatter",
      mode: "lines",
      name: "RSI(14)",
      yaxis: yMap.rsi,
      line: { color: "#a78bfa", width: 1.6 },
    });
  }

  if (toggles.macd) {
    traces.push({
      x,
      y: ind.macdHist,
      type: "bar",
      name: "MACD Hist",
      yaxis: yMap.macd,
      marker: {
        color: ind.macdHist.map((v) =>
          v >= 0 ? "rgba(34,197,94,0.6)" : "rgba(248,113,113,0.6)"
        ),
      },
      hovertemplate: "Hist: %{y:.3f}<extra></extra>",
    });
    traces.push({
      x,
      y: ind.macdLine,
      type: "scatter",
      mode: "lines",
      name: "MACD",
      yaxis: yMap.macd,
      line: { color: "#38bdf8", width: 1.6 },
    });
    traces.push({
      x,
      y: ind.macdSignal,
      type: "scatter",
      mode: "lines",
      name: "Signal",
      yaxis: yMap.macd,
      line: { color: "#fb923c", width: 1.4 },
    });
  }

  // ---- Layout ----
  const totalHeight = Math.max(540, 380 + subPanels.length * 90);
  const layout: any = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: fontColor, family: "Inter, ui-sans-serif, system-ui, sans-serif", size: 12 },
    margin: { l: 60, r: 30, t: 20, b: 30 },
    height: totalHeight,
    autosize: true,
    xaxis: {
      gridcolor: gridColor,
      type: "date",
      rangeslider: { visible: false },
    },
    yaxis: {
      gridcolor: gridColor,
      domain: domains.price,
      tickformat: "$.2f",
      title: { text: "Price", font: { size: 11 } },
    },
    yaxis2: toggles.volume
      ? {
          gridcolor: gridColor,
          domain: domains.volume,
          tickformat: ".2s",
          title: { text: "Volume", font: { size: 11 } },
        }
      : undefined,
    yaxis3: toggles.rsi
      ? {
          gridcolor: gridColor,
          domain: domains.rsi,
          range: [0, 100],
          title: { text: "RSI", font: { size: 11 } },
        }
      : undefined,
    yaxis4: toggles.macd
      ? {
          gridcolor: gridColor,
          domain: domains.macd,
          title: { text: "MACD", font: { size: 11 } },
          zerolinecolor: gridColor,
        }
      : undefined,
    legend: {
      orientation: "h",
      y: 1.04,
      x: 0,
      font: { color: fontColor, size: 12 },
      bgcolor: "rgba(15,23,42,0.85)",
      bordercolor: "rgba(148,163,184,0.35)",
      borderwidth: 1,
    },
    hovermode: "x unified",
    showlegend: true,
    shapes: toggles.rsi
      ? [
          {
            type: "line",
            xref: "paper",
            x0: 0,
            x1: 1,
            yref: "y3",
            y0: 70,
            y1: 70,
            line: { color: "rgba(248,113,113,0.4)", dash: "dot", width: 1 },
          },
          {
            type: "line",
            xref: "paper",
            x0: 0,
            x1: 1,
            yref: "y3",
            y0: 30,
            y1: 30,
            line: { color: "rgba(74,222,128,0.4)", dash: "dot", width: 1 },
          },
        ]
      : [],
  };

  const togglePillClass = (on: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
      on
        ? "bg-accent-500/20 text-accent-300 border-accent-500/40"
        : "bg-ink-800/40 text-ink-400 border-ink-700/50 hover:bg-ink-800/70"
    }`;

  return (
    <div className="space-y-3">
      <section className="card p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-400">Price</div>
            <div className="flex items-baseline gap-3 mt-0.5 flex-wrap">
              <span className="text-2xl font-semibold tabular-nums">
                {fmtMoney(last?.close, currency)}
              </span>
              {pctChange != null && (
                <span
                  className={`text-sm font-medium tabular-nums ${
                    pctChange >= 0 ? "text-accent-400" : "text-rose-400"
                  }`}
                >
                  {pctChange >= 0 ? "▲" : "▼"} {fmtPercentRaw(pctChange)} over{" "}
                  {PERIODS.find((p) => p.id === period)?.label}
                </span>
              )}
              <span className="text-xs text-ink-400">{last?.date}</span>
            </div>
          </div>
          <div className="inline-flex rounded-md border border-ink-700 overflow-hidden flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1.5 text-xs sm:text-sm font-medium ${
                  period === p.id
                    ? "bg-accent-500/20 text-accent-400"
                    : "bg-transparent text-ink-300 hover:bg-ink-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => setToggle("candles")} className={togglePillClass(toggles.candles)}>
            Candles
          </button>
          <button onClick={() => setToggle("bb")} className={togglePillClass(toggles.bb)}>
            Bollinger
          </button>
          <button onClick={() => setToggle("sma20")} className={togglePillClass(toggles.sma20)}>
            SMA 20
          </button>
          <button onClick={() => setToggle("sma50")} className={togglePillClass(toggles.sma50)}>
            SMA 50
          </button>
          <button onClick={() => setToggle("sma200")} className={togglePillClass(toggles.sma200)}>
            SMA 200
          </button>
          <span className="mx-1 w-px self-stretch bg-ink-700/60" />
          <button onClick={() => setToggle("volume")} className={togglePillClass(toggles.volume)}>
            Volume
          </button>
          <button onClick={() => setToggle("rsi")} className={togglePillClass(toggles.rsi)}>
            RSI
          </button>
          <button onClick={() => setToggle("macd")} className={togglePillClass(toggles.macd)}>
            MACD
          </button>
        </div>
        <div className="mt-3">
          <PlotlyChart data={traces} layout={layout} className="w-full" />
        </div>
      </section>
    </div>
  );
}
