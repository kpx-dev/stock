import { useEffect, useState } from "react";
import type { FaTab } from "./types";

export interface RouteState {
  symbol: string;
  tab: FaTab;
}

const DEFAULT_SYMBOL = "AMZN";

function parse(hash: string): RouteState {
  // forms: "" -> default; "#AMZN" -> AMZN/fa; "#AMZN/ta" -> AMZN/ta
  const cleaned = hash.replace(/^#/, "").trim();
  if (!cleaned) return { symbol: DEFAULT_SYMBOL, tab: "fa" };
  const [rawSymbol, rawTab] = cleaned.split("/");
  const symbol = (rawSymbol || DEFAULT_SYMBOL).toUpperCase();
  const tab: FaTab = rawTab === "ta" ? "ta" : "fa";
  return { symbol, tab };
}

function format(state: RouteState): string {
  const tabPart = state.tab === "ta" ? "/ta" : "";
  return `#${state.symbol.toUpperCase()}${tabPart}`;
}

export function useHashRoute(): [RouteState, (next: Partial<RouteState>) => void] {
  const [state, setState] = useState<RouteState>(() => parse(window.location.hash));

  useEffect(() => {
    const onHash = () => setState(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const update = (next: Partial<RouteState>) => {
    const merged = { ...state, ...next };
    const target = format(merged);
    if (window.location.hash !== target) {
      window.location.hash = target;
    } else {
      setState(merged);
    }
  };

  return [state, update];
}
