import { useEffect, useMemo, useRef, useState } from "react";
import type { FaTab, IndexEntry } from "../types";

interface HeaderProps {
  symbol: string;
  tab: FaTab;
  tickers: IndexEntry[];
  theme: "dark" | "light";
  onSelectSymbol: (sym: string) => void;
  onSelectTab: (tab: FaTab) => void;
  onToggleTheme: () => void;
}

export function Header({
  symbol,
  tab,
  tickers,
  theme,
  onSelectSymbol,
  onSelectTab,
  onToggleTheme,
}: HeaderProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return tickers.slice(0, 12);
    return tickers
      .filter((t) =>
        t.symbol.includes(q) || (t.name || "").toUpperCase().includes(q),
      )
      .slice(0, 12);
  }, [query, tickers]);

  const handlePick = (sym: string) => {
    onSelectSymbol(sym);
    setQuery("");
    setOpen(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = (filtered[0]?.symbol || query).toUpperCase().trim();
    if (target) handlePick(target);
  };

  return (
    <header className="border-b border-ink-800/70 bg-ink-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <a href="#" className="flex items-center gap-2 group">
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden>
            <rect width="64" height="64" rx="12" fill="#0d1117"/>
            <path d="M8 44 L20 30 L30 38 L44 18 L56 28" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="44" cy="18" r="3.5" fill="#4ade80"/>
          </svg>
          <span className="text-lg font-semibold tracking-tight">
            Stock <span className="text-accent-400">Lens</span>
          </span>
        </a>

        <form
          ref={wrapRef as React.RefObject<HTMLFormElement>}
          onSubmit={onSubmit}
          className="relative flex-1 max-w-md sm:ml-6"
        >
          <div className="relative" ref={wrapRef}>
            <input
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder={`Search ticker (current: ${symbol})`}
              className="w-full px-3 py-1.5 pl-9 rounded-md border border-ink-700 bg-ink-900/70 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              autoComplete="off"
              spellCheck={false}
            />
            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            {open && filtered.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1 max-h-72 overflow-auto rounded-md border border-ink-700 bg-ink-900 shadow-xl z-40">
                {filtered.map((t) => (
                  <li key={t.symbol}>
                    <button
                      type="button"
                      onClick={() => handlePick(t.symbol)}
                      className="w-full text-left px-3 py-1.5 hover:bg-ink-800 flex items-center justify-between"
                    >
                      <span className="font-mono font-semibold text-accent-400">{t.symbol}</span>
                      <span className="text-xs text-ink-400 truncate ml-3">{t.name}</span>
                    </button>
                  </li>
                ))}
                {query && !filtered.some((t) => t.symbol === query.toUpperCase()) && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handlePick(query.toUpperCase())}
                      className="w-full text-left px-3 py-1.5 hover:bg-ink-800 text-ink-300 italic"
                    >
                      Try "{query.toUpperCase()}" (data may be missing)
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </form>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-ink-700 overflow-hidden">
            {(["fa", "ta"] as FaTab[]).map((t) => (
              <button
                key={t}
                onClick={() => onSelectTab(t)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-accent-500/20 text-accent-400"
                    : "bg-transparent text-ink-300 hover:bg-ink-800"
                }`}
              >
                {t === "fa" ? "Fundamentals" : "Technicals"}
              </button>
            ))}
          </div>
          <button onClick={onToggleTheme} className="btn" title="Toggle theme" aria-label="Toggle theme">
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
