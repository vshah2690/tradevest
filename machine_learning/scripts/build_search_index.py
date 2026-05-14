# """
# TradeVest — Global Stock Search Index Builder
# ===============================================
# Dynamically fetches stock lists from official
# exchange sources. No hardcoding.

# Sources:
#     NSE India   — Official CSV
#     BSE India   — Official API  
#     US          — NASDAQ API
#     Australia   — ASX Official CSV
#     UK          — Wikipedia FTSE100/250
#     Germany     — Wikipedia DAX
#     Canada      — Wikipedia TSX
#     Hong Kong   — Wikipedia Hang Seng
#     Japan       — Wikipedia Nikkei
#     France      — Wikipedia CAC40
#     Spain       — Wikipedia IBEX35
#     Switzerland — Wikipedia SMI
# """

# import json
# import os
# import time
# import requests
# import pandas as pd

# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# OUTPUT   = os.path.join(BASE_DIR, 'data', 'search_index.json')

# stocks = []
# seen   = set()

# def add_stock(symbol, name, exchange, flag, country, sector=''):
#     if not symbol or not name:
#         return
#     symbol = symbol.strip().upper()
#     if symbol in seen or len(symbol) > 20:
#         return
#     seen.add(symbol)
#     stocks.append({
#         "symbol":   symbol,
#         "name":     name.strip(),
#         "exchange": exchange,
#         "flag":     flag,
#         "country":  country,
#         "sector":   sector,
#     })

# def fetch_wikipedia_table(url, symbol_col, name_col, suffix, exchange, flag, country):
#     """Fetches stock list from Wikipedia tables — works for most indices."""
#     try:
#         tables = pd.read_html(url)
#         # Try each table until we find one with our columns
#         for table in tables:
#             cols = [str(c).lower() for c in table.columns]
#             sym_idx  = next((i for i, c in enumerate(cols) if symbol_col.lower() in c), None)
#             name_idx = next((i for i, c in enumerate(cols) if name_col.lower() in c), None)
#             if sym_idx is not None and name_idx is not None:
#                 count = 0
#                 for _, row in table.iterrows():
#                     sym  = str(row.iloc[sym_idx]).strip()
#                     name = str(row.iloc[name_idx]).strip()
#                     if sym and name and sym != 'nan':
#                         add_stock(f"{sym}{suffix}", name, exchange, flag, country)
#                         count += 1
#                 return count
#         return 0
#     except Exception as e:
#         return 0

# # ── NSE India ─────────────────────────────────────────────────────────────────
# print("Fetching NSE India...")
# try:
#     url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
#     df  = pd.read_csv(url, storage_options={'User-Agent': 'Mozilla/5.0'})
#     for _, row in df.iterrows():
#         sym  = str(row.get('SYMBOL', '')).strip()
#         name = str(row.get('NAME OF COMPANY', '')).strip()
#         add_stock(f"{sym}.NS", name, 'NSE', '🇮🇳', 'India')
#     print(f"  NSE: {len([s for s in stocks if s['exchange'] == 'NSE'])} stocks")
# except Exception as e:
#     print(f"  NSE failed: {e}")

# # ── BSE India ─────────────────────────────────────────────────────────────────
# print("Fetching BSE India...")
# try:
#     url     = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?segment=Equity&status=Active"
#     headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bseindia.com'}
#     res     = requests.get(url, headers=headers, timeout=20)
#     data    = res.json()
#     for item in data.get('Table', []):
#         sym  = str(item.get('SCRIP_CD', '')).strip()
#         name = str(item.get('Scrip_Name', '')).strip()
#         add_stock(f"{sym}.BO", name, 'BSE', '🇮🇳', 'India')
#     print(f"  BSE: {len([s for s in stocks if s['exchange'] == 'BSE'])} stocks")
# except Exception as e:
#     print(f"  BSE failed: {e}")

# # ── US Stocks ─────────────────────────────────────────────────────────────────
# print("Fetching US stocks...")
# try:
#     url     = "https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&offset=0"
#     headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
#     res     = requests.get(url, headers=headers, timeout=20)
#     data    = res.json()
#     for row in data.get('data', {}).get('table', {}).get('rows', []):
#         sym  = str(row.get('symbol', '')).strip()
#         name = str(row.get('name', '')).strip()
#         if '/' not in sym and '^' not in sym:
#             add_stock(sym, name, row.get('exchange', 'NASDAQ'),
#                      '🇺🇸', 'United States', row.get('sector', ''))
#     print(f"  US: {len([s for s in stocks if s['country'] == 'United States'])} stocks")
# except Exception as e:
#     print(f"  US failed: {e}")

# # ── Australia / ASX ───────────────────────────────────────────────────────────
# print("Fetching Australia/ASX...")
# try:
#     url = "https://www.asx.com.au/asx/research/ASXListedCompanies.csv"
#     df  = pd.read_csv(url, skiprows=1, header=0)
#     df.columns = [c.strip() for c in df.columns]
#     for _, row in df.iterrows():
#         sym  = str(row.get('ASX code', row.get('Code', ''))).strip()
#         name = str(row.get('Company name', row.get('Name', ''))).strip()
#         if sym and name and sym != 'nan':
#             add_stock(f"{sym}.AX", name, 'ASX', '🇦🇺', 'Australia')
#     print(f"  ASX: {len([s for s in stocks if s['exchange'] == 'ASX'])} stocks")
# except Exception as e:
#     print(f"  ASX failed: {e}")

# # ── UK — FTSE 100 + FTSE 250 via Wikipedia ────────────────────────────────────
# print("Fetching UK stocks via Wikipedia...")
# try:
#     count = 0
#     # FTSE 100
#     count += fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/FTSE_100_index',
#         'ticker', 'company', '.L', 'LSE', '🇬🇧', 'United Kingdom'
#     )
#     # FTSE 250
#     count += fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/FTSE_250_Index',
#         'ticker', 'company', '.L', 'LSE', '🇬🇧', 'United Kingdom'
#     )
#     print(f"  UK: {len([s for s in stocks if s['country'] == 'United Kingdom'])} stocks")
# except Exception as e:
#     print(f"  UK failed: {e}")

# # ── Germany — DAX + MDAX via Wikipedia ───────────────────────────────────────
# print("Fetching Germany stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/DAX',
#         'ticker', 'company', '.DE', 'XETRA', '🇩🇪', 'Germany'
#     )
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/MDAX',
#         'ticker', 'company', '.DE', 'XETRA', '🇩🇪', 'Germany'
#     )
#     print(f"  Germany: {len([s for s in stocks if s['country'] == 'Germany'])} stocks")
# except Exception as e:
#     print(f"  Germany failed: {e}")

# # ── France — CAC 40 via Wikipedia ─────────────────────────────────────────────
# print("Fetching France stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/CAC_40',
#         'ticker', 'company', '.PA', 'Euronext', '🇫🇷', 'France'
#     )
#     print(f"  France: {len([s for s in stocks if s['country'] == 'France'])} stocks")
# except Exception as e:
#     print(f"  France failed: {e}")

# # ── Switzerland — SMI via Wikipedia ──────────────────────────────────────────
# print("Fetching Switzerland stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/Swiss_Market_Index',
#         'ticker', 'company', '.SW', 'SIX', '🇨🇭', 'Switzerland'
#     )
#     print(f"  Switzerland: {len([s for s in stocks if s['country'] == 'Switzerland'])} stocks")
# except Exception as e:
#     print(f"  Switzerland failed: {e}")

# # ── Japan — Nikkei 225 via Wikipedia ─────────────────────────────────────────
# print("Fetching Japan stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/Nikkei_225',
#         'symbol', 'company', '.T', 'TSE', '🇯🇵', 'Japan'
#     )
#     print(f"  Japan: {len([s for s in stocks if s['country'] == 'Japan'])} stocks")
# except Exception as e:
#     print(f"  Japan failed: {e}")

# # ── Hong Kong — Hang Seng via Wikipedia ──────────────────────────────────────
# print("Fetching Hong Kong stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/Hang_Seng_Index',
#         'ticker', 'company', '.HK', 'HKEX', '🇭🇰', 'Hong Kong'
#     )
#     print(f"  Hong Kong: {len([s for s in stocks if s['country'] == 'Hong Kong'])} stocks")
# except Exception as e:
#     print(f"  Hong Kong failed: {e}")

# # ── Canada — TSX via Wikipedia ────────────────────────────────────────────────
# print("Fetching Canada stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/S%26P/TSX_60',
#         'ticker', 'company', '.TO', 'TSX', '🇨🇦', 'Canada'
#     )
#     print(f"  Canada: {len([s for s in stocks if s['country'] == 'Canada'])} stocks")
# except Exception as e:
#     print(f"  Canada failed: {e}")

# # ── Spain — IBEX 35 via Wikipedia ────────────────────────────────────────────
# print("Fetching Spain stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/IBEX_35',
#         'ticker', 'company', '.MC', 'BME', '🇪🇸', 'Spain'
#     )
#     print(f"  Spain: {len([s for s in stocks if s['country'] == 'Spain'])} stocks")
# except Exception as e:
#     print(f"  Spain failed: {e}")

# # ── Netherlands — AEX via Wikipedia ──────────────────────────────────────────
# print("Fetching Netherlands stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/AEX_index',
#         'ticker', 'company', '.AS', 'Euronext Amsterdam', '🇳🇱', 'Netherlands'
#     )
#     print(f"  Netherlands: {len([s for s in stocks if s['country'] == 'Netherlands'])} stocks")
# except Exception as e:
#     print(f"  Netherlands failed: {e}")

# # ── Brazil — Bovespa via Wikipedia ───────────────────────────────────────────
# print("Fetching Brazil stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/Ibovespa',
#         'ticker', 'company', '.SA', 'B3', '🇧🇷', 'Brazil'
#     )
#     print(f"  Brazil: {len([s for s in stocks if s['country'] == 'Brazil'])} stocks")
# except Exception as e:
#     print(f"  Brazil failed: {e}")

# # ── South Korea — KOSPI via Wikipedia ────────────────────────────────────────
# print("Fetching South Korea stocks via Wikipedia...")
# try:
#     fetch_wikipedia_table(
#         'https://en.wikipedia.org/wiki/KOSPI_200',
#         'ticker', 'company', '.KS', 'KRX', '🇰🇷', 'South Korea'
#     )
#     print(f"  South Korea: {len([s for s in stocks if s['country'] == 'South Korea'])} stocks")
# except Exception as e:
#     print(f"  South Korea failed: {e}")

# # ── Save index ────────────────────────────────────────────────────────────────
# os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
# with open(OUTPUT, 'w', encoding='utf-8') as f:
#     json.dump(stocks, f, ensure_ascii=False)

# print(f"\n{'='*50}")
# print(f"  Total: {len(stocks)} stocks saved")
# print(f"  Output: {OUTPUT}")
# print(f"{'='*50}")

# # Summary by country
# from collections import Counter
# countries = Counter(s['country'] for s in stocks)
# for country, count in sorted(countries.items(), key=lambda x: -x[1]):
#     print(f"  {count:>5} — {country}")

"""
TradeVest — Global Stock Search Index Builder
"""

import json
import os
import time
import requests
import pandas as pd
from collections import Counter

BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT       = os.path.join(BASE_DIR, 'data', 'search_index.json')
OPENFIGI_KEY = '5aa97b3c-f022-4082-9daf-442e8715e52e'

stocks = []
seen   = set()

def add_stock(symbol, name, exchange, flag, country, sector=''):
    if not symbol or not name:
        return
    symbol = symbol.strip().upper()
    if symbol in seen or len(symbol) > 20:
        return
    seen.add(symbol)
    stocks.append({
        "symbol":   symbol,
        "name":     name.strip(),
        "exchange": exchange,
        "flag":     flag,
        "country":  country,
        "sector":   sector,
    })

# ── NSE India ─────────────────────────────────────────────────────────────────
print("Fetching NSE India...")
try:
    url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    df  = pd.read_csv(url, storage_options={'User-Agent': 'Mozilla/5.0'})
    for _, row in df.iterrows():
        sym  = str(row.get('SYMBOL', '')).strip()
        name = str(row.get('NAME OF COMPANY', '')).strip()
        add_stock(f"{sym}.NS", name, 'NSE', '🇮🇳', 'India')
    print(f"  NSE: {len([s for s in stocks if s['exchange'] == 'NSE'])} stocks")
except Exception as e:
    print(f"  NSE failed: {e}")

# ── BSE India ─────────────────────────────────────────────────────────────────
print("Fetching BSE India...")
print("  BSE: Skipped — API currently blocked, NSE covers major Indian stocks")
# try:
#     url     = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?segment=Equity&status=Active"
#     headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bseindia.com'}
#     res     = requests.get(url, headers=headers, timeout=20)
#     data    = res.json()
#     for item in data.get('Table', []):
#         sym  = str(item.get('SCRIP_CD', '')).strip()
#         name = str(item.get('Scrip_Name', '')).strip()
#         add_stock(f"{sym}.BO", name, 'BSE', '🇮🇳', 'India')
#     print(f"  BSE: {len([s for s in stocks if s['exchange'] == 'BSE'])} stocks")
# except Exception as e:
#     print(f"  BSE failed: {e}")

# ── US Stocks ─────────────────────────────────────────────────────────────────
print("Fetching US stocks...")
try:
    url     = "https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&offset=0"
    headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}
    res     = requests.get(url, headers=headers, timeout=20)
    data    = res.json()
    for row in data.get('data', {}).get('table', {}).get('rows', []):
        sym  = str(row.get('symbol', '')).strip()
        name = str(row.get('name', '')).strip()
        if '/' not in sym and '^' not in sym:
            add_stock(sym, name, row.get('exchange', 'NASDAQ'),
                     '🇺🇸', 'United States', row.get('sector', ''))
    print(f"  US: {len([s for s in stocks if s['country'] == 'United States'])} stocks")
except Exception as e:
    print(f"  US failed: {e}")

# ── Australia ASX ─────────────────────────────────────────────────────────────
print("Fetching Australia ASX...")
try:
    url = "https://www.asx.com.au/asx/research/ASXListedCompanies.csv"
    df  = pd.read_csv(url, skiprows=1, header=0)
    df.columns = [c.strip() for c in df.columns]
    for _, row in df.iterrows():
        sym  = str(row.get('ASX code', row.get('Code', ''))).strip()
        name = str(row.get('Company name', row.get('Name', ''))).strip()
        if sym and name and sym != 'nan':
            add_stock(f"{sym}.AX", name, 'ASX', '🇦🇺', 'Australia')
    print(f"  ASX: {len([s for s in stocks if s['exchange'] == 'ASX'])} stocks")
except Exception as e:
    print(f"  ASX failed: {e}")

# ── OpenFIGI — Global exchanges ───────────────────────────────────────────────
print("\nFetching global stocks via OpenFIGI...")

EXCHANGES = [
    ('LN', '.L',  'LSE',      '🇬🇧', 'United Kingdom'),
    ('GY', '.DE', 'XETRA',    '🇩🇪', 'Germany'),
    ('FP', '.PA', 'Euronext', '🇫🇷', 'France'),
    ('SW', '.SW', 'SIX',      '🇨🇭', 'Switzerland'),
    ('IT', '.MI', 'Borsa',    '🇮🇹', 'Italy'),
    ('SM', '.MC', 'BME',      '🇪🇸', 'Spain'),
    ('NA', '.AS', 'Euronext', '🇳🇱', 'Netherlands'),
    ('BB', '.BR', 'Euronext', '🇧🇪', 'Belgium'),
    ('SS', '.ST', 'Nasdaq',   '🇸🇪', 'Sweden'),
    ('NO', '.OL', 'Oslo',     '🇳🇴', 'Norway'),
    ('DC', '.CO', 'Nasdaq',   '🇩🇰', 'Denmark'),
    ('FH', '.HE', 'Nasdaq',   '🇫🇮', 'Finland'),
    ('CN', '.TO', 'TSX',      '🇨🇦', 'Canada'),
    ('HK', '.HK', 'HKEX',    '🇭🇰', 'Hong Kong'),
    ('JP', '.T',  'TSE',      '🇯🇵', 'Japan'),
    ('KS', '.KS', 'KRX',      '🇰🇷', 'South Korea'),
    ('SP', '.SI', 'SGX',      '🇸🇬', 'Singapore'),
    ('IJ', '.JK', 'IDX',      '🇮🇩', 'Indonesia'),
    ('NZ', '.NZ', 'NZX',      '🇳🇿', 'New Zealand'),
    ('BZ', '.SA', 'B3',       '🇧🇷', 'Brazil'),
    ('MM', '.MX', 'BMV',      '🇲🇽', 'Mexico'),
    ('SJ', '.JO', 'JSE',      '🇿🇦', 'South Africa'),
]

SEARCH_TERMS = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z',
    'bank', 'group', 'holdings', 'corp', 'limited', 'inc',
    'fund', 'trust', 'capital', 'energy', 'tech', 'pharma'
]

def fetch_openfigi(exch_code, suffix, exchange, flag, country):
    url  = 'https://api.openfigi.com/v3/search'
    hdrs = {
        'Content-Type':      'application/json',
        'X-OPENFIGI-APIKEY': OPENFIGI_KEY
    }
    count = 0

    for term in SEARCH_TERMS:
        try:
            res = requests.post(url, headers=hdrs, timeout=15, json={
                'query':        term,
                'exchCode':     exch_code,
                'securityType': 'Common Stock',
            })

            if res.status_code == 429:
                print(f"    Rate limited — waiting 60s...")
                time.sleep(60)
                continue

            if res.status_code != 200:
                continue

            data  = res.json()
            items = data.get('data', [])

            for item in items:
                ticker = item.get('ticker', '').strip()
                name   = item.get('name', '').strip()
                if ticker and name:
                    add_stock(f"{ticker}{suffix}", name, exchange, flag, country)
                    count += 1

            time.sleep(0.25)

        except Exception:
            continue

    return count

for exch_code, suffix, exchange, flag, country in EXCHANGES:
    try:
        count = fetch_openfigi(exch_code, suffix, exchange, flag, country)
        print(f"  {flag} {country}: {count} stocks")
        time.sleep(1)
    except Exception as e:
        print(f"  {flag} {country} failed: {e}")

# ── Save index ────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(stocks, f, ensure_ascii=False)

print(f"\n{'='*50}")
print(f"  Total: {len(stocks)} stocks saved")
print(f"  Output: {OUTPUT}")
print(f"{'='*50}")

countries = Counter(s['country'] for s in stocks)
for country, count in sorted(countries.items(), key=lambda x: -x[1]):
    print(f"  {count:>6} — {country}")