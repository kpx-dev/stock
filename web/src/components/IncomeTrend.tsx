import { useMemo } from "react";
import { PlotlyChart } from "./PlotlyChart";
import type { StatementPeriod } from "../types";

interface IncomeTrendProps {
  periods: StatementPeriod[];
  theme: "dark" | "light";
  granularity: "annual" | "quarterly";
}

export function IncomeTrend({ periods, theme, granularity }: IncomeTrendProps) {
  const { data, layout } = useMemo(() => {
    // sort ascending
    const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
    const limited = granularity === "annual" ? sorted.slice(-6) : sorted.slice(-12);
    const x = limited.map((p) => p.period);
    const revenue = limited.map((p) => p.items["Total Revenue"] ?? p.items["Operating Revenue"] ?? null);
    const netIncome = limited.map((p) => p.items["Net Income"] ?? p.items["Net Income Common Stockholders"] ?? null);
    const opIncome = limited.map((p) => p.items["Operating Income"] ?? p.items["Total Operating Income As Reported"] ?? null);

    const data: Plotly.Data[] = [
      {
        x,
        y: revenue,
        name: "Revenue",
        type: "bar",
        marker: { color: "rgba(74, 222, 128, 0.85)" },
        hovertemplate: "<b>%{x}</b><br>Revenue: $%{y:,.2s}<extra></extra>",
      },
      {
        x,
        y: opIncome,
        name: "Operating Income",
        type: "bar",
        marker: { color: "rgba(56, 189, 248, 0.85)" },
        hovertemplate: "<b>%{x}</b><br>Op Income: $%{y:,.2s}<extra></extra>",
      },
      {
        x,
        y: netIncome,
        name: "Net Income",
        type: "bar",
        marker: { color: "rgba(45, 212, 191, 0.9)" },
        hovertemplate: "<b>%{x}</b><br>Net Income: $%{y:,.2s}<extra></extra>",
      },
    ];

    const fontColor = theme === "dark" ? "#e6ebf2" : "#181d27";
    const gridColor = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      barmode: "group",
      font: { color: fontColor, family: "Inter, ui-sans-serif, system-ui, sans-serif", size: 12 },
      margin: { l: 50, r: 16, t: 10, b: 40 },
      height: 280,
      xaxis: { gridcolor: gridColor, type: "category", tickangle: -30 },
      yaxis: { gridcolor: gridColor, tickformat: "$.2s", zerolinecolor: gridColor },
      legend: { orientation: "h", y: 1.12, x: 0 },
      hovermode: "x unified",
    };
    return { data, layout };
  }, [periods, theme, granularity]);

  return <PlotlyChart data={data} layout={layout} className="w-full" />;
}
