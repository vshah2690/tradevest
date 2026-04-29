"""
Builds a global stock search index from free sources.
Run once to generate search_index.json
"""
import json
import os
import pandas as pd
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT   = os.path.join(BASE_DIR, 'data', 'search_index.json')

stocks = []

# ── NSE India ─────────────────────────────────────────────────────────────────
print("Fetching NSE stocks...")
try:
    url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    headers = { 'User-Agent': 'Mozilla/5.0' }
    df = pd.read_csv(url, storage_options={'User-Agent': 'Mozilla/5.0'})
    for _, row in df.iterrows():
        sym = str(row.get('SYMBOL', '')).strip()
        name = str(row.get('NAME OF COMPANY', '')).strip()
        if sym and name:
            stocks.append({
                "symbol":   f"{sym}.NS",
                "name":     name,
                "exchange": "NSE",
                "flag":     "🇮🇳",
                "country":  "India"
            })
    print(f"  NSE: {len([s for s in stocks if 'NSE' in s['exchange']])} stocks")
except Exception as e:
    print(f"  NSE failed: {e}")

# ── BSE India ─────────────────────────────────────────────────────────────────
print("Fetching BSE stocks...")
try:
    url = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?segment=Equity&status=Active"
    headers = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bseindia.com' }
    res = requests.get(url, headers=headers, timeout=15)
    data = res.json()
    bse_count = 0
    for item in data.get('Table', []):
        sym  = str(item.get('SCRIP_CD', '')).strip()
        name = str(item.get('Scrip_Name', '')).strip()
        if sym and name:
            stocks.append({
                "symbol":   f"{sym}.BO",
                "name":     name,
                "exchange": "BSE",
                "flag":     "🇮🇳",
                "country":  "India"
            })
            bse_count += 1
    print(f"  BSE: {bse_count} stocks")
except Exception as e:
    print(f"  BSE failed: {e}")

# ── US Stocks (NASDAQ + NYSE) ─────────────────────────────────────────────────
print("Fetching US stocks...")
try:
    # NASDAQ listed stocks
    url = "https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&offset=0"
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    }
    res  = requests.get(url, headers=headers, timeout=15)
    data = res.json()
    us_count = 0
    for row in data.get('data', {}).get('table', {}).get('rows', []):
        sym  = str(row.get('symbol', '')).strip()
        name = str(row.get('name', '')).strip()
        if sym and name and '/' not in sym:
            stocks.append({
                "symbol":   sym,
                "name":     name,
                "exchange": row.get('exchange', 'NASDAQ'),
                "flag":     "🇺🇸",
                "country":  "United States",
                "sector":   row.get('sector', ''),
            })
            us_count += 1
    print(f"  US: {us_count} stocks")
except Exception as e:
    print(f"  US failed: {e}")

# ── Save index ────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
with open(OUTPUT, 'w') as f:
    json.dump(stocks, f)

print(f"\nTotal: {len(stocks)} stocks saved to {OUTPUT}")