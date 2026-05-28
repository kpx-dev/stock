import { useMemo } from "react";
import { PlotlyChart } from "./PlotlyChart";
import type { StatementPeriod } from "../types";
import { fmtMoney } from "../format";

interface SankeyProps {
  period: StatementPeriod;

  currency?: string;
}

interface Flow {
  source: string;
  target: string;
  value: number;
  color: string;
}

/**
 * Build a Sankey diagram of income flow:
 *   Total Revenue ─► Cost Of Revenue
 *                 ─► Gross Profit ─► Operating Expenses (SG&A, R&D, Other)
 *                                  ─► Operating Income ─► Tax Provision
 *                                                       ─► Net Income
 *   (Other / non-operating income flows in/out are also shown when present.)
 *
 * Sankey diagrams require balanced flows. We compute pieces directly from the
 * line items and only add edges when both ends are positive — yfinance line
 * names are stable so this works for the major US tickers we ship.
 */
function buildFlows(items: Record<string, number | null>): {
  flows: Flow[];
  revenue: number;
  netIncome: number | null;
} {
  const get = (k: string): number | null => {
    const v = items[k];
    return v == null || !isFinite(v) ? null : v;
  };

  const revenue = get("Total Revenue") || get("Operating Revenue") || 0;
  const costOfRevenue = get("Cost Of Revenue") ?? get("Reconciled Cost Of Revenue") ?? 0;
  let grossProfit = get("Gross Profit");
  if (grossProfit == null) grossProfit = revenue - costOfRevenue;

  const operatingIncome = get("Operating Income") ?? get("Total Operating Income As Reported") ?? null;
  const sga = get("Selling General And Administration") ?? get("Selling And Marketing Expense");
  const rd = get("Research And Development");
  const otherOpExp = get("Other Operating Expenses");
  let opExpenseTotal = get("Operating Expense");
  if (opExpenseTotal == null && grossProfit != null && operatingIncome != null) {
    opExpenseTotal = grossProfit - operatingIncome;
  }

  const taxProvision = get("Tax Provision");
  const pretaxIncome = get("Pretax Income");
  const netIncome = get("Net Income") ?? get("Net Income Common Stockholders");

  const COLOR_REVENUE = "rgba(74, 222, 128, 0.55)";
  const COLOR_GROSS = "rgba(34, 197, 94, 0.55)";
  const COLOR_COST = "rgba(248, 113, 113, 0.55)";
  const COLOR_OPEX = "rgba(251, 146, 60, 0.55)";
  const COLOR_OPINCOME = "rgba(56, 189, 248, 0.55)";
  const COLOR_TAX = "rgba(244, 114, 182, 0.55)";
  const COLOR_NET = "rgba(45, 212, 191, 0.6)";

  const flows: Flow[] = [];

  if (revenue > 0 && costOfRevenue > 0) {
    flows.push({ source: "Revenue", target: "Cost of Revenue", value: costOfRevenue, color: COLOR_COST });
  }
  if (revenue > 0 && grossProfit != null && grossProfit > 0) {
    flows.push({ source: "Revenue", target: "Gross Profit", value: grossProfit, color: COLOR_GROSS });
  }

  // Gross profit -> operating expenses (broken out where available) + operating income
  const expenseParts: Array<{ name: string; value: number | null }> = [
    { name: "R&D", value: rd },
    { name: "SG&A", value: sga },
    { name: "Other Op Ex", value: otherOpExp },
  ];
  let totalNamedExpenses = 0;
  for (const e of expenseParts) {
    if (e.value != null && e.value > 0) {
      flows.push({ source: "Gross Profit", target: e.name, value: e.value, color: COLOR_OPEX });
      totalNamedExpenses += e.value;
    }
  }
  // If we have an op expense total bigger than the named parts, add the residual.
  if (opExpenseTotal != null && opExpenseTotal > totalNamedExpenses + 1e6) {
    flows.push({
      source: "Gross Profit",
      target: "Other Op Ex",
      value: opExpenseTotal - totalNamedExpenses,
      color: COLOR_OPEX,
    });
  }
  if (operatingIncome != null && operatingIncome > 0 && grossProfit != null && grossProfit > 0) {
    flows.push({ source: "Gross Profit", target: "Operating Income", value: operatingIncome, color: COLOR_OPINCOME });
  }

  // Operating income -> pretax income (with the +/- tweak from non-operating income)
  if (operatingIncome != null && operatingIncome > 0 && pretaxIncome != null && pretaxIncome > 0) {
    const passthrough = Math.min(operatingIncome, pretaxIncome);
    flows.push({ source: "Operating Income", target: "Pretax Income", value: passthrough, color: COLOR_OPINCOME });
    if (pretaxIncome > operatingIncome) {
      flows.push({
        source: "Other Income",
        target: "Pretax Income",
        value: pretaxIncome - operatingIncome,
        color: COLOR_GROSS,
      });
    } else if (operatingIncome > pretaxIncome) {
      flows.push({
        source: "Operating Income",
        target: "Other Expense",
        value: operatingIncome - pretaxIncome,
        color: COLOR_COST,
      });
    }
  }

  // Pretax -> Tax + Net Income
  if (pretaxIncome != null && pretaxIncome > 0) {
    if (taxProvision != null && taxProvision > 0) {
      flows.push({ source: "Pretax Income", target: "Tax", value: taxProvision, color: COLOR_TAX });
    }
    if (netIncome != null && netIncome > 0) {
      flows.push({ source: "Pretax Income", target: "Net Income", value: netIncome, color: COLOR_NET });
    }
  } else if (operatingIncome != null && operatingIncome > 0) {
    // fallback: connect operating income directly to tax/net income if pretax missing
    if (taxProvision != null && taxProvision > 0) {
      flows.push({ source: "Operating Income", target: "Tax", value: taxProvision, color: COLOR_TAX });
    }
    if (netIncome != null && netIncome > 0) {
      flows.push({ source: "Operating Income", target: "Net Income", value: netIncome, color: COLOR_NET });
    }
  }

  void COLOR_REVENUE;
  return { flows, revenue, netIncome };
}

export function Sankey({ period, currency = "USD" }: SankeyProps) {
  const { data, layout } = useMemo(() => {
    const { flows, revenue } = buildFlows(period.items);

    const nodeOrder: string[] = [];
    const nodeIdx = new Map<string, number>();
    const ensure = (name: string) => {
      if (!nodeIdx.has(name)) {
        nodeIdx.set(name, nodeOrder.length);
        nodeOrder.push(name);
      }
      return nodeIdx.get(name)!;
    };
    // Make sure "Revenue" is always first.
    ensure("Revenue");
    for (const f of flows) {
      ensure(f.source);
      ensure(f.target);
    }

    const NODE_COLOR: Record<string, string> = {
      Revenue: "#4ade80",
      "Gross Profit": "#22c55e",
      "Cost of Revenue": "#f87171",
      "Operating Income": "#38bdf8",
      "R&D": "#fb923c",
      "SG&A": "#fbbf24",
      "Other Op Ex": "#f59e0b",
      "Other Income": "#34d399",
      "Other Expense": "#f87171",
      "Pretax Income": "#60a5fa",
      Tax: "#f472b6",
      "Net Income": "#2dd4bf",
    };
    const nodeColors = nodeOrder.map((n) => NODE_COLOR[n] ?? "#94a3b8");

    const labels = nodeOrder.map((n) => {
      // Show $ value next to node label where possible.
      // We'll compute the inflow into each node (or for the source: outflow).
      let total = 0;
      if (n === "Revenue") {
        total = revenue;
      } else {
        for (const f of flows) {
          if (f.target === n) total += f.value;
        }
      }
      const moneyLabel = revenue > 0 ? `${fmtMoney(total, currency)} • ${((total / revenue) * 100).toFixed(1)}%` : fmtMoney(total, currency);
      return `${n}<br><span style="font-size:11px;opacity:0.75">${moneyLabel}</span>`;
    });

    const linkColors = flows.map((f) => f.color);

    const sankeyTrace: Plotly.Data = {
      type: "sankey",
      orientation: "h",
      arrangement: "snap",
      valueformat: ".3s",
      valuesuffix: "",
      node: {
        pad: 18,
        thickness: 18,
        line: { color: "rgba(0,0,0,0.4)", width: 0.5 },
        label: labels,
        color: nodeColors,
      },
      link: {
        source: flows.map((f) => nodeIdx.get(f.source)!),
        target: flows.map((f) => nodeIdx.get(f.target)!),
        value: flows.map((f) => f.value),
        color: linkColors,
        hovertemplate:
          "<b>%{source.label}</b> → <b>%{target.label}</b><br>" +
          "$%{value:,.0f}<extra></extra>",
      },
    } as unknown as Plotly.Data;

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {
        color: "#e6ebf2",
        size: 12,
        family: "Inter, ui-sans-serif, system-ui, sans-serif",
      },
      margin: { l: 10, r: 10, t: 10, b: 10 },
      height: 460,
    };

    return { data: [sankeyTrace], layout };
  }, [period, currency]);

  return <PlotlyChart data={data} layout={layout} className="w-full" />;
}
