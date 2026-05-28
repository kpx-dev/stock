import { useMemo, useState } from "react";
import type { TickerData } from "../types";
import { PlotlyChart } from "./PlotlyChart";
import { sma, bollinger, rsi, macd } from "../indicators";
import { fmtMoney, fmtPercentRaw } from "../format";

type Period = "1y" | "3y" | "5y";

const PERIOD_DAYS: Record<Period, number> = { "1y": 252, "3y": 252 * 3, "5y": 252 * 5 };

interface TaViewProps {
  data: TickerData;
  theme: "dark" | "light";
}

export function TaView({ data, theme }: TaViewProps) {
  const [period, setPeriod] = useState<Period>("1y");

  const { price, indicators } = useMemo(() => {
    // Compute indicators on the FULL history (so SMA200 etc. are valid even on 1y window),
    // then slice the trailing N days for display.
    const all = data.prices.filter((p) => p.close != null);
    const closes = all.map((p) => p.close as number);
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const sma200 = sma(closes, 200);
    const bb = bollinger(closes, 20, 2);
    const rsi14 = rsi(closes, 14);
    const macdRes = macd(closes, 12, 26, 9);

    const days = PERIOD_DAYS[period];
    const start = Math.max(0, all.length - days);
    const slice = (arr: any[]) => arr.slice(start);

    return {
      price: slice(all),
      indicators: {
        sma20: slice(sma20),
        sma50: slice(sma50),
        sma200: slice(sma200),
        bbUpper: slice(bb.upper),
        bbLower: slice(bb.lower),
        bbMid: slice(bb.mid),
        rsi: slice(rsi14),
        macdLine: slice(macdRes.macd),
        macdSignal: slice(macdRes.signal),
        macdHist: slice(macdRes.histogram),
      },
    };
  }, [data, period]);

  const x = price.map((p) => p.date);
  const fontColor = theme === "dark" ? "#e6ebf2" : "#181d27";
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const currency = data.currency || "USD";

  // Performance summary for header
  const last = price[price.length - 1];
  const first = price[0];
  const pctChange = first && last && first.close && last.close ? ((last.close - first.close) / first.close) * 100 : null;

  // Combined price + overlays + volume + RSI + MACD using subplots
  const priceData: Plotly.Data[] = [
    {
      x,
      open: price.map((p) => p.open),
      high: price.map((p) => p.high),
      low: price.map((p) => p.low),
      close: price.map((p) => p.close),
      type: "candlestick",
      name: "Price",
      yaxis: "y",
      increasing: { line: { color: "#22c55e" }, fillcolor: "rgba(34,197,94,0.7)" },
      decreasing: { line: { color: "#f87171" }, fillcolor: "rgba(248,113,113,0.7)" },
      hoverlabel: { bgcolor: "#0d1117" },
    } as Plotly.Data,
    {
      x,
      y: indicators.bbUpper,
      type: "scatter",
      mode: "lines",
      name: "BB Upper",
      yaxis: "y",
      line: { color: "rgba(168, 85, 247, 0.45)", width: 1, dash: "dot" },
      hoverinfo: "skip",
    },
    {
      x,
      y: indicators.bbLower,
      type: "scatter",
      mode: "lines",
      name: "BB Lower",
      yaxis: "y",
      line: { color: "rgba(168, 85, 247, 0.45)", width: 1, dash: "dot" },
      fill: "tonexty",
      fillcolor: "rgba(168, 85, 247, 0.06)",
      hoverinfo: "skip",
    },
    {
      x,
      y: indicators.sma20,
      type: "scatter",
      mode: "lines",
      name: "SMA 20",
      yaxis: "y",
      line: { color: "#facc15", width: 1.4 },
    },
    {
      x,
      y: indicators.sma50,
      type: "scatter",
      mode: "lines",
      name: "SMA 50",
      yaxis: "y",
      line: { color: "#fb923c", width: 1.4 },
    },
    {
      x,
      y: indicators.sma200,
      type: "scatter",
      mode: "lines",
      name: "SMA 200",
      yaxis: "y",
      line: { color: "#38bdf8", width: 1.6 },
    },
    {
      x,
      y: price.map((p) => p.volume),
      type: "bar",
      name: "Volume",
      yaxis: "y2",
      marker: {
        color: price.map((p, i) => {
          const prev = i > 0 ? price[i - 1].close : p.close;
          return p.close != null && prev != null && p.close >= prev
            ? "rgba(34,197,94,0.55)"
            : "rgba(248,113,113,0.55)";
        }),
      },
      hovertemplate: "Volume: %{y:,.2s}<extra></extra>",
    },
  ];

  const priceLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: fontColor, family: "Inter, ui-sans-serif, system-ui, sans-serif", size: 12 },
    margin: { l: 60, r: 30, t: 10, b: 30 },
    height: 520,
    xaxis: {
      gridcolor: gridColor,
      rangeslider: { visible: false },
      type: "date",
    },
    yaxis: {
      gridcolor: gridColor,
      domain: [0.28, 1],
      tickformat: "$.2f",
      title: { text: "Price", font: { size: 11 } },
    },
    yaxis2: {
      gridcolor: gridColor,
      domain: [0, 0.22],
      title: { text: "Volume", font: { size: 11 } },
      tickformat: ".2s",
    },
    legend: {
      orientation: "h",
      y: 1.06,
      x: 0,
      font: { size: 11 },
    },
    hovermode: "x unified",
    showlegend: true,
  };

  const rsiData: Plotly.Data[] = [
    {
      x,
      y: indicators.rsi,
      type: "scatter",
      mode: "lines",
      name: "RSI(14)",
      line: { color: "#a78bfa", width: 1.6 },
    },
  ];
  const rsiLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: fontColor, family: "Inter, ui-sans-serif, system-ui, sans-serif", size: 12 },
    margin: { l: 60, r: 30, t: 6, b: 28 },
    height: 180,
    xaxis: { gridcolor: gridColor, type: "date" },
    yaxis: {
      gridcolor: gridColor,
      range: [0, 100],
      title: { text: "RSI", font: { size: 11 } },
    },
    shapes: [
      {
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: 70,
        y1: 70,
        line: { color: "rgba(248,113,113,0.5)", dash: "dot", width: 1 },
      },
      {
        type: "line",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: 30,
        y1: 30,
        line: { color: "rgba(74,222,128,0.5)", dash: "dot", width: 1 },
      },
      {
        type: "rect",
        xref: "paper",
        x0: 0,
        x1: 1,
        yref: "y",
        y0: 30,
        y1: 70,
        fillcolor: "rgba(167,139,250,0.05)",
        line: { width: 0 },
      },
    ],
    hovermode: "x unified",
    showlegend: false,
  };

  const macdData: Plotly.Data[] = [
    {
      x,
      y: indicators.macdHist,
      type: "bar",
      name: "Histogram",
      marker: {
        color: indicators.macdHist.map((v) =>
          v >= 0 ? "rgba(34,197,94,0.6)" : "rgba(248,113,113,0.6)",
        ),
      },
      hovertemplate: "Hist: %{y:.3f}<extra></extra>",
    },
    {
      x,
      y: indicators.macdLine,
      type: "scatter",
      mode: "lines",
      name: "MACD",
      line: { color: "#38bdf8", width: 1.6 },
    },
    {
      x,
      y: indicators.macdSignal,
      type: "scatter",
      mode: "lines",
      name: "Signal",
      line: { color: "#fb923c", width: 1.4 },
    },
  ];
  const macdLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: fontColor, family: "Inter, ui-sans-serif, system-ui, sans-serif", size: 12 },
    margin: { l: 60, r: 30, t: 6, b: 28 },
    height: 200,
    xaxis: { gridcolor: gridColor, type: "date" },
    yaxis: {
      gridcolor: gridColor,
      title: { text: "MACD", font: { size: 11 } },
      zerolinecolor: gridColor,
    },
    legend: { orientation: "h", y: 1.18, x: 0, font: { size: 11 } },
    hovermode: "x unified",
  };

  return (
    <div className="space-y-4">
      <section className="card p-4 sm:p-5">
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
                  {pctChange >= 0 ? "▲" : "▼"} {fmtPercentRaw(pctChange)} over {period}
                </span>
              )}
              <span className="text-xs text-ink-400">{last?.date}</span>
            </div>
          </div>
          <div className="inline-flex rounded-md border border-ink-700 overflow-hidden">
            {(["1y", "3y", "5y"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  period === p
                    ? "bg-accent-500/20 text-accent-400"
                    : "bg-transparent text-ink-300 hover:bg-ink-800"
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <PlotlyChart data={priceData} layout={priceLayout} className="w-full" />
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="text-xs uppercase tracking-wide text-ink-400 mb-1">RSI (14)</div>
        <PlotlyChart data={rsiData} layout={rsiLayout} className="w-full" />
      </section>

      <section className="card p-4 sm:p-5">
        <div className="text-xs uppercase tracking-wide text-ink-400 mb-1">MACD (12, 26, 9)</div>
        <PlotlyChart data={macdData} layout={macdLayout} className="w-full" />
      </section>
    </div>
  );
}
