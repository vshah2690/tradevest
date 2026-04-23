"""
TradeVest — Market Data Downloader
====================================
Purpose:
    Downloads historical OHLCV (Open, High, Low, Close, Volume) price data
    for 25 global stocks (Indian NSE + US markets) using the yfinance library.
    Saves two CSV files per symbol:
        1. Daily data   — 10 years of daily candles (for model training)
        2. Intraday data — 60 days of 5-minute candles (for intraday analysis)

Usage:
    python scripts/download_data.py

Output:
    data/{SYMBOL}_daily.csv   — ~2,500 rows per symbol
    data/{SYMBOL}_5min.csv    — ~4,500 rows per symbol

Why yfinance over Alpha Vantage for downloads?
    - Alpha Vantage free tier: 25 calls/day, 5 calls/minute
    - Downloading 25 symbols × 2 timeframes = 50 API calls minimum
    - yfinance: unlimited calls, no API key required
    - Alpha Vantage is used in the live app for real-time price streaming
    - yfinance is used here for bulk historical download only

Why 10 years of daily data?
    - More data = more market cycles for the model to learn from
    - Includes bull markets (2020-2021), bear markets (2022), recoveries
    - Indian stocks on NSE go back reliably ~10 years on yfinance
    - US stocks go back further but 10 years is consistent across both markets

Why .NS suffix for Indian stocks?
    - Yahoo Finance uses exchange suffixes to identify markets
    - .NS = National Stock Exchange (NSE) India
    - .BO = Bombay Stock Exchange (BSE) India
    - No suffix = US markets (NYSE/NASDAQ)

Note on TATAMOTORS.NS:
    - This symbol may show "delisted" errors on yfinance
    - The actual ticker on NSE is TATAMOTORS.NS but Yahoo Finance
      sometimes has issues with it — safe to ignore, 24 other symbols work

Author: Viraj Shah
Version: 2.0 (production ready)
"""

import yfinance as yf
import pandas as pd
import os

# ── Symbol Registry ───────────────────────────────────────────────────────────
# 25 symbols across Indian and US markets for diverse training data.
# More diverse training data = better model generalisation across sectors.
# Covers: IT, Banking, Finance, Auto, Pharma, Energy (India) +
#         Tech, Finance, Retail, Entertainment (US)
SYMBOLS = {
    # Indian IT — largest sector by market cap on NSE
    # High liquidity, heavily traded by FIIs (Foreign Institutional Investors)
    'TCS.NS': 'Tata Consultancy Services',
    'INFY.NS': 'Infosys',
    'WIPRO.NS': 'Wipro',
    'HCLTECH.NS': 'HCL Technologies',
    'TECHM.NS': 'Tech Mahindra',

    # Indian Banking & Finance — second largest sector on NSE
    # Sensitive to RBI interest rate decisions and credit growth
    'HDFCBANK.NS': 'HDFC Bank',
    'ICICIBANK.NS': 'ICICI Bank',
    'AXISBANK.NS': 'Axis Bank',
    'KOTAKBANK.NS': 'Kotak Mahindra Bank',
    'BAJFINANCE.NS': 'Bajaj Finance',

    # Indian Other Sectors — diversifies training across industries
    # Different sectors respond differently to macro events
    'RELIANCE.NS': 'Reliance Industries',     # Energy + Retail + Telecom
    'TATAMOTORS.NS': 'Tata Motors',           # Auto — may fail on yfinance
    'SUNPHARMA.NS': 'Sun Pharma',             # Pharma
    'MARUTI.NS': 'Maruti Suzuki',             # Auto
    'ADANIENT.NS': 'Adani Enterprises',       # Conglomerate

    # US Tech — highest liquidity globally, most news coverage
    # Good for model to learn from high-volume, well-followed stocks
    'AAPL': 'Apple Inc',
    'MSFT': 'Microsoft',
    'NVDA': 'NVIDIA',
    'GOOGL': 'Alphabet',
    'TSLA': 'Tesla',

    # US Finance & Others — sector diversification
    'AMZN': 'Amazon',
    'META': 'Meta Platforms',
    'JPM': 'JPMorgan Chase',
    'NFLX': 'Netflix',
    'AMD': 'AMD',
}

# ── Configuration ─────────────────────────────────────────────────────────────
# Use relative path so this works on any machine that clones the repo.
# os.path.dirname(__file__) = the scripts/ folder
# '..' goes up one level to machine_learning/
# 'data' is the target folder
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR   = os.path.dirname(SCRIPT_DIR)
DATA_DIR   = os.path.join(BASE_DIR, 'data')

# How much historical data to download for model training
# 10 years gives ~2,500 daily rows per symbol (accounting for weekends/holidays)
DAILY_PERIOD = '10y'

# Intraday data period — yfinance limits 5-minute data to last 60 days
# This is a Yahoo Finance API restriction, not our choice
INTRADAY_PERIOD = '60d'
INTRADAY_INTERVAL = '5m'


def download_symbol(symbol, name):
    """
    Downloads daily and intraday OHLCV data for a single stock symbol.

    Data cleaning steps:
        1. Flatten MultiIndex columns (yfinance v0.2+ adds ticker as column level)
        2. Keep only OHLCV columns (drop any extras yfinance adds)
        3. Convert all values to float (yfinance sometimes returns strings)
        4. Drop rows with any NaN values (missing data points)
        5. Name the index 'Date' for consistency

    Args:
        symbol (str): Yahoo Finance ticker symbol e.g. 'TCS.NS' or 'AAPL'
        name   (str): Human readable company name for logging

    Returns:
        None. Saves CSV files to DATA_DIR.

    Files saved:
        {DATA_DIR}/{symbol}_daily.csv   — daily OHLCV, 10 years
        {DATA_DIR}/{symbol}_5min.csv    — 5-minute OHLCV, 60 days
    """
    print(f"\nDownloading {name} ({symbol})...")

    try:
        # ── Daily Data ────────────────────────────────────────────────────────
        # auto_adjust=True: adjusts prices for splits and dividends
        # This is important — without it, stock splits create huge fake drops
        # progress=False: suppresses yfinance's download progress bar
        daily = yf.download(
            symbol,
            period=DAILY_PERIOD,
            interval='1d',
            auto_adjust=True,
            progress=False
        )

        if daily.empty:
            print(f"  No data found for {symbol} — possibly delisted or "
                  f"invalid ticker. Skipping.")
            return

        # yfinance v0.2+ returns MultiIndex columns like:
        # (Close, TCS.NS), (High, TCS.NS) etc.
        # We flatten to just: Close, High, Low, Open, Volume
        if isinstance(daily.columns, pd.MultiIndex):
            daily.columns = daily.columns.get_level_values(0)

        # Keep only standard OHLCV columns — yfinance sometimes adds extras
        daily = daily[['Open', 'High', 'Low', 'Close', 'Volume']]

        # Ensure all values are numeric floats
        # errors='coerce' turns unparseable values to NaN
        for col in daily.columns:
            daily[col] = pd.to_numeric(daily[col], errors='coerce')
        daily.dropna(inplace=True)

        # Name the index for clean CSV output
        daily.index.name = 'Date'

        # Save — replace dots with underscores for valid filenames
        # e.g. TCS.NS -> TCS_NS_daily.csv
        filename = symbol.replace('.', '_')
        daily.to_csv(f"{DATA_DIR}/{filename}_daily.csv")
        print(f"  Daily:    {len(daily)} rows saved "
              f"({daily.index[0].date()} to {daily.index[-1].date()})")

        # ── Intraday Data ─────────────────────────────────────────────────────
        # 5-minute candles for the last 60 days
        # Used for intraday analysis in the live dashboard
        # Note: yfinance restricts intraday history to 60 days maximum
        intraday = yf.download(
            symbol,
            period=INTRADAY_PERIOD,
            interval=INTRADAY_INTERVAL,
            auto_adjust=True,
            progress=False
        )

        if not intraday.empty:
            if isinstance(intraday.columns, pd.MultiIndex):
                intraday.columns = intraday.columns.get_level_values(0)

            intraday = intraday[['Open', 'High', 'Low', 'Close', 'Volume']]

            for col in intraday.columns:
                intraday[col] = pd.to_numeric(intraday[col], errors='coerce')
            intraday.dropna(inplace=True)

            intraday.index.name = 'Date'
            intraday.to_csv(f"{DATA_DIR}/{filename}_5min.csv")
            print(f"  Intraday: {len(intraday)} rows saved "
                  f"({INTRADAY_INTERVAL} candles, last {INTRADAY_PERIOD})")
        else:
            print(f"  Intraday: no data available for {symbol}")

    except Exception as e:
        print(f"  Error downloading {symbol}: {e}")


# ── Main Execution ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Create data directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)

    print("=" * 55)
    print("  TradeVest — Market Data Downloader")
    print(f"  Symbols : {len(SYMBOLS)} (Indian NSE + US markets)")
    print(f"  Daily   : {DAILY_PERIOD} history per symbol")
    print(f"  Intraday: last {INTRADAY_PERIOD} at {INTRADAY_INTERVAL} intervals")
    print("=" * 55)

    success = 0
    failed = 0

    for symbol, name in SYMBOLS.items():
        try:
            download_symbol(symbol, name)
            success += 1
        except Exception as e:
            print(f"  Failed: {symbol} — {e}")
            failed += 1

    print("\n" + "=" * 55)
    print(f"  Complete!")
    print(f"  Downloaded : {success} symbols")
    print(f"  Failed     : {failed} symbols")
    print(f"  Output dir : {DATA_DIR}")
    print(f"  Next step  : python scripts/compute_features.py")
    print("=" * 55)