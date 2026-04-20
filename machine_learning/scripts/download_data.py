#Downloading the symbols and train the AI model....

import yfinance as yf
import pandas as pd
import os

SYMBOLS = {
    # Indian IT
    'TCS.NS': 'Tata Consultancy Services',
    'INFY.NS': 'Infosys',
    'WIPRO.NS': 'Wipro',
    'HCLTECH.NS': 'HCL Technologies',
    'TECHM.NS': 'Tech Mahindra',

    # Indian Banking & Finance
    'HDFCBANK.NS': 'HDFC Bank',
    'ICICIBANK.NS': 'ICICI Bank',
    'AXISBANK.NS': 'Axis Bank',
    'KOTAKBANK.NS': 'Kotak Mahindra Bank',
    'BAJFINANCE.NS': 'Bajaj Finance',

    # Indian Other Sectors
    'RELIANCE.NS': 'Reliance Industries',
    'TATAMOTORS.NS': 'Tata Motors',
    'SUNPHARMA.NS': 'Sun Pharma',
    'MARUTI.NS': 'Maruti Suzuki',
    'ADANIENT.NS': 'Adani Enterprises',

    # US Tech
    'AAPL': 'Apple Inc',
    'MSFT': 'Microsoft',
    'NVDA': 'NVIDIA',
    'GOOGL': 'Alphabet',
    'TSLA': 'Tesla',

    # US Finance & Others
    'AMZN': 'Amazon',
    'META': 'Meta Platforms',
    'JPM': 'JPMorgan Chase',
    'NFLX': 'Netflix',
    'AMD': 'AMD',
}

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def download_symbol(symbol, name):
    print(f"\nDownloading {name} ({symbol})...")
    try:
        # 3 years daily data for swing + long-term model training
        daily = yf.download(symbol, period='3y', interval='1d', auto_adjust=True, progress=False)
        if daily.empty:
            print(f"  No data found for {symbol} — skipping")
            return

        filename = symbol.replace('.', '_')
        daily.to_csv(f"{DATA_DIR}/{filename}_daily.csv")
        print(f"  Daily:    {len(daily)} rows saved")

        # 60 days 5-minute data for intraday model training
        intraday = yf.download(symbol, period='60d', interval='5m', auto_adjust=True, progress=False)
        if not intraday.empty:
            intraday.to_csv(f"{DATA_DIR}/{filename}_5min.csv")
            print(f"  Intraday: {len(intraday)} rows saved")
        else:
            print(f"  Intraday: no data available")

    except Exception as e:
        print(f"  Error: {e}")

if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)

    print("=" * 50)
    print("  TradeVest — Data Downloader")
    print(f"  Downloading {len(SYMBOLS)} symbols")
    print("=" * 50)

    success = 0
    failed = 0

    for symbol, name in SYMBOLS.items():
        download_symbol(symbol, name)
        success += 1

    print("\n" + "=" * 50)
    print(f"  Done! {success} symbols downloaded")
    print(f"  Check machine_learning/data/ folder")
    print("=" * 50)