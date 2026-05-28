import type { IndexFile, TickerData } from "./types";

const cache = new Map<string, Promise<TickerData>>();
let indexPromise: Promise<IndexFile> | null = null;

function dataUrl(path: string): string {
  // Vite injects BASE_URL (e.g. "/" or "/stock/").
  const base = import.meta.env.BASE_URL || "/";
  const trimmed = base.endsWith("/") ? base : base + "/";
  return `${trimmed}data/${path}`;
}

export async function loadIndex(): Promise<IndexFile> {
  if (!indexPromise) {
    indexPromise = fetch(dataUrl("index.json"), { cache: "force-cache" }).then(async (r) => {
      if (!r.ok) throw new Error(`Failed to load index.json: ${r.status}`);
      return (await r.json()) as IndexFile;
    });
  }
  return indexPromise;
}

export async function loadTicker(symbol: string): Promise<TickerData> {
  const sym = symbol.toUpperCase();
  if (!cache.has(sym)) {
    cache.set(
      sym,
      fetch(dataUrl(`${sym}.json`), { cache: "force-cache" }).then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load ${sym}.json: ${r.status}`);
        return (await r.json()) as TickerData;
      }),
    );
  }
  return cache.get(sym)!;
}
