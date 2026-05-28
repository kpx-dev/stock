import Plotly from "plotly.js-dist-min";
import { useEffect, useRef } from "react";

export interface PlotlyChartProps {
  data: Plotly.Data[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_CONFIG: Partial<Plotly.Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
};

// Dark hover popup styling applied to every chart so tooltip text stays readable
// even when individual layouts don't override hoverlabel.
const DARK_HOVERLABEL: Partial<Plotly.Layout["hoverlabel"]> = {
  bgcolor: "#0b1020",
  bordercolor: "#334155",
  font: { color: "#e6ebf2", family: "Inter, system-ui, sans-serif", size: 12 },
};

export function PlotlyChart({ data, layout, config, className, style }: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const merged = { ...DEFAULT_CONFIG, ...config };
    const mergedLayout: Partial<Plotly.Layout> = {
      ...(layout || {}),
      hoverlabel: { ...DARK_HOVERLABEL, ...((layout && layout.hoverlabel) || {}) },
    };
    Plotly.react(el, data, mergedLayout, merged);
    const onResize = () => Plotly.Plots.resize(el);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [data, layout, config]);

  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el) Plotly.purge(el);
    };
  }, []);

  return <div ref={ref} className={className} style={{ width: "100%", ...style }} />;
}
