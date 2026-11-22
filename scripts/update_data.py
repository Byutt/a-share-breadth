#!/usr/bin/env python3
"""Collect A-share end-of-day breadth through the configured Tushare relay."""
import argparse
import datetime as dt
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "history.json"
TOKEN = os.getenv("STOCK_API_TOKEN", "").strip()
URL = os.getenv("STOCK_API_URL", "http://tus.sxdata.top/tu_share/").strip()
WAIT = float(os.getenv("STOCK_API_WAIT_SECONDS", "2"))
CN = ZoneInfo("Asia/Shanghai")
CODE_RE = re.compile(r"^\d{6}\.(SH|SZ|BJ)$")


def api_call(name, params, fields=""):
    payload = json.dumps({"api_name": name, "token": TOKEN,
                          "params": params, "fields": fields}).encode("utf-8")
    last_error = None
    for attempt in range(4):
        try:
            request = urllib.request.Request(
                URL, data=payload, method="POST",
                headers={"Content-Type": "application/json", "User-Agent": "BreadthLab/1.0"})
            with urllib.request.urlopen(request, timeout=60) as response:
                data = json.load(response)
            if str(data.get("code")) != "0":
                raise ValueError("API %s: code=%s msg=%s" % (name, data.get("code"), data.get("msg")))
            result = data.get("data") or {}
            cols = result.get("fields") or []
            rows = result.get("items") or []
            if not isinstance(cols, list) or not isinstance(rows, list):
                raise ValueError("invalid Tushare response fields/items")
            time.sleep(WAIT)
            return [dict(zip(cols, row)) for row in rows]
        except (OSError, ValueError, urllib.error.URLError) as exc:
            last_error = exc
            if attempt < 3:
                delay = min(30, 3 * (2 ** attempt)) + random.random()
                print("%s failed, retry in %.1fs: %s" % (name, delay, type(exc).__name__), file=sys.stderr)
                time.sleep(delay)
    raise RuntimeError("%s request failed after 4 attempts: %s" % (name, type(last_error).__name__))


def trading_dates(number):
    today = dt.datetime.now(CN).date()
    start = today - dt.timedelta(days=max(40, number * 2 + 21))
    rows = api_call("trade_cal", {
        "exchange": "SSE",
        "start_date": start.strftime("%Y%m%d"),
        "end_date": today.strftime("%Y%m%d")
    }, "cal_date,is_open")
    dates = sorted({str(r["cal_date"]) for r in rows if str(r.get("is_open")) in ("1", "1.0", "True")})
    if not dates:
        raise ValueError("Trading calendar returned no trading dates")
    return dates[-number:]


def valid_code(code):
    if not CODE_RE.fullmatch(code):
        return False
    return not (code.startswith("200") and code.endswith(".SZ")
                or code.startswith("900") and code.endswith(".SH"))


def aggregate(date, rows):
    r = {"trade_date": date, "total": 0, "up": 0, "down": 0, "flat": 0,
         "up_volume": 0., "down_volume": 0., "flat_volume": 0.,
         "up_amount": 0., "down_amount": 0., "flat_amount": 0.}
    seen = set()
    for item in rows:
        code = str(item.get("ts_code", "")).upper()
        if code in seen or not valid_code(code) or str(item.get("trade_date")) != date:
            continue
        try:
            close, prior = float(item["close"]), float(item["pre_close"])
            volume, amount = float(item["vol"]), float(item["amount"])
        except (KeyError, ValueError, TypeError):
            continue
        if min(close, prior) <= 0 or min(volume, amount) < 0:
            continue
        seen.add(code)
        direction = "up" if close > prior + 1e-7 else "down" if close < prior - 1e-7 else "flat"
        r["total"] += 1
        r[direction] += 1
        r[direction + "_volume"] += volume
        r[direction + "_amount"] += amount * 1000   # Tushare amount = 1000 CNY
    for key in ("up_volume", "down_volume", "flat_volume",
                "up_amount", "down_amount", "flat_amount"):
        r[key] = round(r[key], 2)
    r["total_volume"] = round(r["up_volume"] + r["down_volume"] + r["flat_volume"], 2)
    r["total_amount"] = round(r["up_amount"] + r["down_amount"] + r["flat_amount"], 2)
    if r["total"]:
        r["up_ratio"] = round(100 * r["up"] / r["total"], 4)
        r["down_ratio"] = round(100 * r["down"] / r["total"], 4)
    else:
        r["up_ratio"] = r["down_ratio"] = 0
    r["adr"] = round(100 * r["up"] / r["down"], 5) if r["down"] else None
    for key, label in (("volume", "trin_volume"), ("amount", "trin_amount")):
        up, down = r["up_" + key], r["down_" + key]
        r[label] = round((r["up"] / r["down"]) / (up / down), 5) if r["down"] and up and down else None
    return r


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=1)
    args = parser.parse_args()
    if not 1 <= args.days <= 250:
        parser.error("--days must be within 1..250")
    if not TOKEN:
        print("STOCK_API_TOKEN missing. Showing clearly marked screenshot demo until secret is configured.")
        return
    if URL.startswith("http://"):
        print("Warning: relay HTTP transport does not encrypt the API token. Prefer HTTPS if available.", file=sys.stderr)
    dates = trading_dates(args.days)
    now = dt.datetime.now(CN)
    if args.days == 1 and dates[-1] == now.strftime("%Y%m%d") and now.hour < 17:
        print("EOD data may not be ready; skipping until next scheduled check.")
        return
    previous = json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else {"records": []}
    existing = {row["trade_date"]: row for row in previous.get("records", []) if isinstance(row, dict) and row.get("trade_date")}
    failures = []
    successes = 0
    for index, date in enumerate(dates, 1):
        try:
            print("[%s/%s] Downloading %s" % (index, len(dates), date), flush=True)
            rows = api_call("daily", {"trade_date": date},
                            "ts_code,trade_date,close,pre_close,vol,amount")
            stats = aggregate(date, rows)
            if stats["total"] < 3000:
                raise ValueError("%s: only %s valid shares; refusing incomplete data" % (date, stats["total"]))
            existing[date] = stats
            successes += 1
            print("  %s valid; up=%s down=%s" % (stats["total"], stats["up"], stats["down"]), flush=True)
        except Exception as exc:
            failures.append("%s: %s" % (date, str(exc)))
            print(failures[-1], file=sys.stderr)
            if args.days == 1:
                raise
    if successes:
        updated = {"version": 1, "source": "Tushare relay / daily",
                   "updated_at": dt.datetime.now(CN).isoformat(timespec="seconds"),
                   "records": [existing[k] for k in sorted(existing)][-1000:]}
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Saved %d trading days" % len(updated["records"]))
    if failures:
        raise RuntimeError("Some trading days failed: %s" % "; ".join(failures))


if __name__ == "__main__":
    main()
