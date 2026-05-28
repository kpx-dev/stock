import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { FaView } from "./components/FaView";
import { TaView } from "./components/TaView";
import { loadIndex, loadTicker } from "./data";
import { useHashRoute } from "./hashRoute";
import type { IndexFile, TickerData } from "./types";
import { fmtDate } from "./format";

export default function App() {
  const [route, setRoute] = useHashRoute();
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    loadTicker(route.symbol)
      .then((d) => {
        if (!cancelled) setTicker(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route.symbol]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        symbol={route.symbol}
        tab={route.tab}
        tickers={index?.tickers || []}
        onSelectSymbol={(sym) => setRoute({ symbol: sym })}
        onSelectTab={(tab) => setRoute({ tab })}
      />

      <main
        className={`flex-1 w-full ${
          route.tab === "ta"
            ? "max-w-none px-2 sm:px-3 py-4"
            : "max-w-7xl mx-auto px-4 sm:px-6 py-6"
        }`}
      >
        {ticker && (
          <div className="mb-5">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="font-mono text-accent-400">{ticker.symbol}</span>
              </h1>
            </div>
            <div className="text-xs text-ink-400 mt-1">
              Data as of {fmtDate(ticker.asOf)} · cached locally · refresh via{" "}
              <code className="text-ink-300">make refresh</code>
            </div>
          </div>
        )}

        {error && (
          <div className="card p-5 border-rose-500/40 text-rose-300">
            <div className="font-semibold">Couldn’t load {route.symbol}</div>
            <div className="text-sm mt-1">{error}</div>
            <div className="text-sm mt-2 text-ink-400">
              Try one of: {(index?.tickers || []).map((t) => t.symbol).join(", ")}
            </div>
          </div>
        )}

        {loading && !ticker && !error && <Skeleton />}

        {ticker && !error && (
          <>
            {route.tab === "fa" ? (
              <FaView data={ticker} />
            ) : (
              <TaView data={ticker} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-ink-800/70 py-4 text-center text-xs text-ink-400">
        Data via Yahoo Finance / yfinance · Educational use only · Not investment advice
      </footer>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="card p-5 animate-pulse h-32" />
      <div className="card p-5 animate-pulse h-72" />
      <div className="card p-5 animate-pulse h-48" />
    </div>
  );
}
