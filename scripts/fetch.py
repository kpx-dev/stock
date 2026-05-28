"""Fetch stock data from yfinance and upsert into SQLite."""
from __future__ import annotations

import argparse
import math
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "stock.sqlite"


SCHEMA = """
CREATE TABLE IF NOT EXISTS tickers (
  symbol TEXT PRIMARY KEY,
  name TEXT,
  sector TEXT,
  industry TEXT,
  exchange TEXT,
  currency TEXT,
  last_refreshed TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS income_statement (
  symbol TEXT NOT NULL,
  period_end TEXT NOT NULL,
  period_type TEXT NOT NULL,
  line_item TEXT NOT NULL,
  value REAL,
  PRIMARY KEY(symbol, period_end, period_type, line_item)
);
CREATE TABLE IF NOT EXISTS balance_sheet (
  symbol TEXT NOT NULL,
  period_end TEXT NOT NULL,
  period_type TEXT NOT NULL,
  line_item TEXT NOT NULL,
  value REAL,
  PRIMARY KEY(symbol, period_end, period_type, line_item)
);
CREATE TABLE IF NOT EXISTS cash_flow (
  symbol TEXT NOT NULL,
  period_end TEXT NOT NULL,
  period_type TEXT NOT NULL,
  line_item TEXT NOT NULL,
  value REAL,
  PRIMARY KEY(symbol, period_end, period_type, line_item)
);
CREATE TABLE IF NOT EXISTS prices (
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  adj_close REAL,
  volume INTEGER,
  PRIMARY KEY(symbol, date)
);
CREATE TABLE IF NOT EXISTS earnings_history (
  symbol TEXT NOT NULL,
  earnings_date TEXT NOT NULL,
  eps_estimate REAL,
  eps_actual REAL,
  surprise_pct REAL,
  PRIMARY KEY(symbol, earnings_date)
);
CREATE TABLE IF NOT EXISTS info_kv (
  symbol TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY(symbol, key)
);
"""


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    return conn


def safe_float(v):
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def upsert_statement(
    conn: sqlite3.Connection,
    table: str,
    symbol: str,
    df: pd.DataFrame | None,
    period_type: str,
) -> int:
    if df is None or df.empty:
        return 0
    cur = conn.cursor()
    n = 0
    # yfinance gives columns = period end dates, rows = line items
    for col in df.columns:
        period_end = pd.Timestamp(col).strftime("%Y-%m-%d")
        for line_item, value in df[col].items():
            v = safe_float(value)
            cur.execute(
                f"INSERT OR REPLACE INTO {table} (symbol, period_end, period_type, line_item, value) VALUES (?,?,?,?,?)",
                (symbol, period_end, period_type, str(line_item), v),
            )
            n += 1
    conn.commit()
    return n


def upsert_prices(conn: sqlite3.Connection, symbol: str, df: pd.DataFrame | None) -> int:
    if df is None or df.empty:
        return 0
    cur = conn.cursor()
    n = 0
    for idx, row in df.iterrows():
        date = pd.Timestamp(idx).strftime("%Y-%m-%d")
        cur.execute(
            "INSERT OR REPLACE INTO prices (symbol, date, open, high, low, close, adj_close, volume) VALUES (?,?,?,?,?,?,?,?)",
            (
                symbol,
                date,
                safe_float(row.get("Open")),
                safe_float(row.get("High")),
                safe_float(row.get("Low")),
                safe_float(row.get("Close")),
                safe_float(row.get("Adj Close", row.get("Close"))),
                int(row.get("Volume") or 0),
            ),
        )
        n += 1
    conn.commit()
    return n


def upsert_earnings(conn: sqlite3.Connection, symbol: str, df: pd.DataFrame | None) -> int:
    if df is None or df.empty:
        return 0
    cur = conn.cursor()
    n = 0
    for idx, row in df.iterrows():
        try:
            edate = pd.Timestamp(idx).strftime("%Y-%m-%d")
        except Exception:
            edate = str(idx)[:10]
        eps_est = safe_float(row.get("EPS Estimate"))
        eps_actual = safe_float(row.get("Reported EPS"))
        surprise = safe_float(row.get("Surprise(%)"))
        cur.execute(
            "INSERT OR REPLACE INTO earnings_history (symbol, earnings_date, eps_estimate, eps_actual, surprise_pct) VALUES (?,?,?,?,?)",
            (symbol, edate, eps_est, eps_actual, surprise),
        )
        n += 1
    conn.commit()
    return n


def upsert_info(conn: sqlite3.Connection, symbol: str, info: dict) -> int:
    if not info:
        return 0
    cur = conn.cursor()
    n = 0
    for k, v in info.items():
        if v is None:
            continue
        try:
            sval = str(v)
        except Exception:
            continue
        cur.execute(
            "INSERT OR REPLACE INTO info_kv (symbol, key, value) VALUES (?,?,?)",
            (symbol, k, sval),
        )
        n += 1
    conn.commit()
    return n


def upsert_ticker(conn: sqlite3.Connection, symbol: str, info: dict) -> None:
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO tickers (symbol, name, sector, industry, exchange, currency, last_refreshed) VALUES (?,?,?,?,?,?,?)",
        (
            symbol,
            info.get("longName") or info.get("shortName") or symbol,
            info.get("sector"),
            info.get("industry"),
            info.get("exchange"),
            info.get("currency"),
            datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        ),
    )
    conn.commit()


def fetch_ticker(symbol: str, conn: sqlite3.Connection) -> dict:
    print(f"[fetch] {symbol}: starting", flush=True)
    t = yf.Ticker(symbol)

    info = {}
    try:
        info = t.info or {}
    except Exception as e:
        print(f"[fetch] {symbol}: info failed: {e}", flush=True)

    upsert_ticker(conn, symbol, info)
    upsert_info(conn, symbol, info)

    counts = {"info": len(info)}

    try:
        n = upsert_statement(conn, "income_statement", symbol, t.income_stmt, "annual")
        counts["income_annual"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: income_stmt failed: {e}", flush=True)
    try:
        n = upsert_statement(conn, "income_statement", symbol, t.quarterly_income_stmt, "quarterly")
        counts["income_quarterly"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: quarterly_income_stmt failed: {e}", flush=True)

    try:
        n = upsert_statement(conn, "balance_sheet", symbol, t.balance_sheet, "annual")
        counts["balance_annual"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: balance_sheet failed: {e}", flush=True)
    try:
        n = upsert_statement(conn, "balance_sheet", symbol, t.quarterly_balance_sheet, "quarterly")
        counts["balance_quarterly"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: quarterly_balance_sheet failed: {e}", flush=True)

    try:
        n = upsert_statement(conn, "cash_flow", symbol, t.cashflow, "annual")
        counts["cashflow_annual"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: cashflow failed: {e}", flush=True)
    try:
        n = upsert_statement(conn, "cash_flow", symbol, t.quarterly_cashflow, "quarterly")
        counts["cashflow_quarterly"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: quarterly_cashflow failed: {e}", flush=True)

    try:
        hist = t.history(period="5y", auto_adjust=False)
        n = upsert_prices(conn, symbol, hist)
        counts["prices"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: prices failed: {e}", flush=True)

    try:
        edf = t.earnings_dates
        if edf is not None and not edf.empty:
            n = upsert_earnings(conn, symbol, edf)
            counts["earnings"] = n
    except Exception as e:
        print(f"[fetch] {symbol}: earnings_dates failed: {e}", flush=True)

    print(f"[fetch] {symbol}: done {counts}", flush=True)
    return counts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tickers", nargs="*", help="ticker symbols")
    ap.add_argument("--sleep", type=float, default=1.0, help="seconds between tickers")
    args = ap.parse_args()

    tickers = [t.upper() for t in args.tickers] or ["AMZN"]

    conn = get_conn()
    for i, sym in enumerate(tickers):
        try:
            fetch_ticker(sym, conn)
        except Exception as e:
            print(f"[fetch] {sym}: ERROR {e}", flush=True)
        if i + 1 < len(tickers):
            time.sleep(args.sleep)
    conn.close()
    print("[fetch] all done", flush=True)


if __name__ == "__main__":
    main()
