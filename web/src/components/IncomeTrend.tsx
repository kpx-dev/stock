import { useMemo } from "react";
import { PlotlyChart } from "./PlotlyChart";
import type { StatementPeriod } from "../types";

interface IncomeTrendProps {
  periods: StatementPeriod[];
  granularity: "annual" | "quarterly";
}

const COLORS = {
  // Revenue: cool ocean blue (top-line, "scale")
  revenue: "#3b82f6",
  // Operating Income: warm amber (between revenue and bottom line)
  opIncome: "#f59e0b",
  // Net Income: vivid emerald — "real cash money"
  netIncome: "#10b981",
  // Profit margin line: light cyan/lime so it stands out as a percentage overlay
  margin: "#a3e635",
};

export function IncomeTrend({ periods, granularity }: IncomeTrendProps) {
  const { data, layout } = useMemo(() => {
    const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
    const limited = granularity === "annual" ? sorted.slice(-6) : sorted.slice(-12);
    const x = limited.map((p) => p.period);
    const revenue = limited.map(
      (p) => p.items["Total Revenue"] ?? p.items["Operating Revenue"] ?? null,
    );
    const netIncome = limited.map(
      (p) =>
        p.items["Net Income"] ??
        p.items["Net Income Common Stockholders"] ??
        null,
    );
    const opIncome = limited.map(
      (p) =>
        p.items["Operating Income"] ??
        p.items["Total Operating Income As Reported"] ??
        null,
    );
    // Profit margin = NetIncome / Revenue, in percent (null when missing).
    const margin = revenue.map((rev, i) => {
      const ni = netIncome[i];
      if (rev == null || ni == null || rev === 0) return null;
      return (ni / rev) * 100;
    });

    const data: Plotly.Data[] = [
      {
        x,
        y: revenue,
        name: "Revenue",
        type: "bar",
        marker: { color: COLORS.revenue, opacity: 0.92 },
        hovertemplate: "<b>%{x}</b><br>Revenue: $%{y:,.2s}<extra></extra>",
      },
      {
        x,
        y: opIncome,
        name: "Operating Income",
        type: "bar",
        marker: { color: COLORS.opIncome, opacity: 0.9 },
        hovertemplate: "<b>%{x}</b><br>Operating Income: $%{y:,.2s}<extra></extra>",
      },
      {
        x,
        y: netIncome,
        name: "Net Income",
        type: "bar",
        marker: { color: COLORS.netIncome, opacity: 0.95 },
        hovertemplate: "<b>%{x}</b><br>Net Income: $%{y:,.2s}<extra></extra>",
      },
      {
        x,
        y: margin,
        name: "Net Margin",
        type: "scatter",
        mode: "lines+markers",
        yaxis: "y2",
        line: { color: COLORS.margin, width: 2.5 },
        marker: { color: COLORS.margin, size: 7 },
        hovertemplate: "<b>%{x}</b><br>Net Margin: %{y:.1f}%<extra></extra>",
      },
    ];

    const fontColor = "#e6ebf2";
    const gridColor = "rgba(255,255,255,0.06)";

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      barmode: "group",
      font: {
        color: fontColor,
        family: "Inter, ui-sans-serif, system-ui, sans-serif",
        size: 12,
      },
      margin: { l: 60, r: 60, t: 16, b: 50 },
      height: 340,
      xaxis: { gridcolor: gridColor, type: "category", tickangle: -30 },
      yaxis: {
        gridcolor: gridColor,
        tickformat: "$.2s",
        zerolinecolor: gridColor,
        title: { text: "Amount", font: { size: 11 } },
      },
      yaxis2: {
        overlaying: "y",
        side: "right",
        showgrid: false,
        ticksuffix: "%",
        tickfont: { color: COLORS.margin },
        title: {
          text: "Net Margin",
          font: { color: COLORS.margin, size: 11 },
        },
        zeroline: false,
      },
      legend: {
        orientation: "h",
        y: 1.1,
        x: 0,
        font: { color: fontColor, size: 12 },
        bgcolor: "rgba(15,23,42,0.85)",
        bordercolor: "rgba(148,163,184,0.35)",
        borderwidth: 1,
      },
      hovermode: "x unified",
    };
    return { data, layout };
  }, [periods, granularity]);

  return <PlotlyChart data={data} layout={layout} className="w-full" />;
}
