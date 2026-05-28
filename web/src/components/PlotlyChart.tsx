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

export function PlotlyChart({ data, layout, config, className, style }: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const merged = { ...DEFAULT_CONFIG, ...config };
    Plotly.react(el, data, layout || {}, merged);
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
