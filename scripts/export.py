"""Export per-ticker JSON from SQLite into web/public/data/."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "stock.sqlite"
OUT_DIR = ROOT / "web" / "public" / "data"


# yfinance .info numeric keys we want to expose to the frontend
INFO_NUMERIC_KEYS = [
    "marketCap",
    "enterpriseValue",
    "trailingPE",
    "forwardPE",
    "priceToBook",
    "priceToSalesTrailing12Months",
    "pegRatio",
    "trailingEps",
    "forwardEps",
    "profitMargins",
    "operatingMargins",
    "grossMargins",
    "ebitdaMargins",
    "returnOnAssets",
    "returnOnEquity",
    "revenueGrowth",
    "earningsGrowth",
    "earningsQuarterlyGrowth",
    "totalRevenue",
    "ebitda",
    "netIncomeToCommon",
    "totalCash",
    "totalDebt",
    "freeCashflow",
    "operatingCashflow",
    "dividendYield",
    "dividendRate",
    "payoutRatio",
    "fiveYearAvgDividendYield",
    "trailingAnnualDividendYield",
    "beta",
    "fiftyTwoWeekHigh",
    "fiftyTwoWeekLow",
    "fiftyDayAverage",
    "twoHundredDayAverage",
    "averageVolume",
    "regularMarketPrice",
    "currentPrice",
    "targetMeanPrice",
    "targetHighPrice",
    "targetLowPrice",
    "recommendationMean",
    "numberOfAnalystOpinions",
    "sharesOutstanding",
    "floatShares",
    "bookValue",
]
INFO_STRING_KEYS = [
    "shortName",
    "longName",
    "exchange",
    "currency",
    "sector",
    "industry",
    "longBusinessSummary",
    "website",
    "country",
    "city",
    "recommendationKey",
]


def num(v):
    if v is None or v == "":
        return None
    try:
        f = float(v)
        if f != f:  # NaN
            return None
        return f
    except (TypeError, ValueError):
        return None


def fetch_info(cur, symbol: str) -> dict:
    cur.execute("SELECT key, value FROM info_kv WHERE symbol=?", (symbol,))
    raw = {k: v for k, v in cur.fetchall()}
    info: dict = {}
    for k in INFO_NUMERIC_KEYS:
        if k in raw:
            info[k] = num(raw[k])
    for k in INFO_STRING_KEYS:
        if k in raw and raw[k] is not None:
            info[k] = raw[k]
    return info


def fetch_statement(cur, table: str, symbol: str) -> dict:
    """Returns {annual: [...], quarterly: [...]} where each entry is {period, items: {line: value}}."""
    out = {"annual": [], "quarterly": []}
    cur.execute(
        f"SELECT period_end, period_type, line_item, value FROM {table} WHERE symbol=? ORDER BY period_end DESC",
        (symbol,),
    )
    rows = cur.fetchall()
    by_period: dict = {}
    for period_end, period_type, line_item, value in rows:
        key = (period_type, period_end)
        by_period.setdefault(key, {})[line_item] = num(value)
    for (period_type, period_end), items in by_period.items():
        out[period_type].append({"period": period_end, "items": items})
    out["annual"].sort(key=lambda x: x["period"], reverse=True)
    out["quarterly"].sort(key=lambda x: x["period"], reverse=True)
    return out


def fetch_prices(cur, symbol: str) -> list:
    cur.execute(
        "SELECT date, open, high, low, close, adj_close, volume FROM prices WHERE symbol=? ORDER BY date ASC",
        (symbol,),
    )
    out = []
    for date, o, h, l, c, ac, v in cur.fetchall():
        out.append({
            "date": date,
            "open": num(o),
            "high": num(h),
            "low": num(l),
            "close": num(c),
            "adjClose": num(ac),
            "volume": int(v) if v is not None else None,
        })
    return out


def fetch_earnings(cur, symbol: str) -> list:
    cur.execute(
        "SELECT earnings_date, eps_estimate, eps_actual, surprise_pct FROM earnings_history WHERE symbol=? ORDER BY earnings_date DESC",
        (symbol,),
    )
    return [
        {
            "date": d,
            "epsEstimate": num(est),
            "epsActual": num(act),
            "surprisePct": num(s),
        }
        for d, est, act, s in cur.fetchall()
    ]


def fetch_ticker_meta(cur, symbol: str) -> dict:
    cur.execute(
        "SELECT name, sector, industry, exchange, currency, last_refreshed FROM tickers WHERE symbol=?",
        (symbol,),
    )
    row = cur.fetchone()
    if not row:
        return {"symbol": symbol}
    name, sector, industry, exchange, currency, last_refreshed = row
    return {
        "symbol": symbol,
        "name": name,
        "sector": sector,
        "industry": industry,
        "exchange": exchange,
        "currency": currency,
        "asOf": last_refreshed,
    }


def export_one(cur, symbol: str) -> dict:
    meta = fetch_ticker_meta(cur, symbol)
    info = fetch_info(cur, symbol)
    income = fetch_statement(cur, "income_statement", symbol)
    balance = fetch_statement(cur, "balance_sheet", symbol)
    cashflow = fetch_statement(cur, "cash_flow", symbol)
    prices = fetch_prices(cur, symbol)
    earnings = fetch_earnings(cur, symbol)

    payload = {
        **meta,
        "info": info,
        "income": income,
        "balance": balance,
        "cashflow": cashflow,
        "earnings": earnings,
        "prices": prices,
    }
    return payload


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT symbol FROM tickers ORDER BY symbol")
    symbols = [r[0] for r in cur.fetchall()]
    if not symbols:
        print("[export] no tickers in DB; run fetch.py first.")
        return

    index = []
    for sym in symbols:
        payload = export_one(cur, sym)
        out_path = OUT_DIR / f"{sym}.json"
        with out_path.open("w") as f:
            json.dump(payload, f, separators=(",", ":"))
        size_kb = out_path.stat().st_size / 1024
        print(f"[export] {sym} -> {out_path.relative_to(ROOT)} ({size_kb:.1f} KB)")
        index.append({
            "symbol": sym,
            "name": payload.get("name"),
            "sector": payload.get("sector"),
            "industry": payload.get("industry"),
            "asOf": payload.get("asOf"),
        })

    with (OUT_DIR / "index.json").open("w") as f:
        json.dump({
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tickers": index,
        }, f, indent=2)
    print(f"[export] wrote index with {len(index)} tickers")
    conn.close()


if __name__ == "__main__":
    main()
