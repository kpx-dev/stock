# Stock Lens

Beautiful, static-hosted stock analysis app. **Live: https://kpx-dev.github.io/stock/**

Two views per ticker:

- **Fundamental Analysis (FA)** — latest earnings (actual vs. estimate, surprise %), key ratios (P/E, P/S, P/B, PEG, margins, ROE, FCF, dividend yield), an interactive **Plotly Sankey** of the income flow (Revenue → Cost / Gross Profit → R&D / SG&A / Operating Income → Tax / Net Income), and annual/quarterly trend bars.
- **Technical Analysis (TA)** — candlestick chart with SMA(20/50/200) and Bollinger Bands overlays, paired with a volume bar pane plus RSI(14) and MACD(12,26,9) sub-charts. 1y / 3y / 5y selector; indicators are computed on the full history.

Default ticker is **AMZN**. Pre-built datasets ship for `AMZN`, `MSFT`, `AAPL`, `GOOGL`, `NVDA`, `META`. The ticker search lets you switch between them (and you can request any other US ticker — point `make refresh` at it to add new ones).

## Stack

- **Python pipeline** (`scripts/`) → `yfinance` → SQLite (`data/stock.sqlite`).
- **Static JSON** export per ticker (`web/public/data/<TICKER>.json`) so the site reads no APIs.
- **Vite + React + TypeScript + Tailwind** in `web/`.
- **Plotly.js** for Sankey, candlesticks, and indicator charts.
- **GitHub Actions** → GitHub Pages.

## Local development

```bash
make setup        # python venv + pip install + npm install
make refresh      # fetch yfinance for the default tickers + export JSON
make dev          # Vite dev server on http://localhost:5173
```

To pull data for additional symbols:

```bash
make refresh TICKERS="TSLA NFLX"
```

## Layout

```
.
├── data/stock.sqlite              # SQLite cache (committed)
├── scripts/
│   ├── fetch.py                   # yfinance -> SQLite (idempotent)
│   └── export.py                  # SQLite  -> web/public/data/*.json
└── web/
    ├── public/data/               # static JSON consumed by the site
    └── src/                       # React + Plotly UI
```

## Deploy

Pushes to `master` trigger `.github/workflows/deploy.yml`, which builds with `--base=/stock/` and publishes via `actions/deploy-pages`. Pages source must be set to "GitHub Actions" once (already configured here).

## Notes

- Data is sourced from Yahoo Finance via `yfinance`. Cached aggressively to SQLite to avoid rate limits.
- Bundle is dominated by Plotly (~4.7 MB unzipped, ~1.4 MB gzipped) — split into its own chunk.
- Educational use only. Not investment advice.
