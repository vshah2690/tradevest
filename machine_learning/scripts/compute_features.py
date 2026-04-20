import pandas as pd
import numpy as np
import ta
import os
import glob

DATA_DIR = r'C:\Users\vshah\Desktop\Viraj\Projects\tradevest\machine_learning\data'

def clean_dataframe(df):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df.columns = [str(c).strip() for c in df.columns]
    df = df[~df.index.astype(str).str.contains('Price|Ticker|^$', na=False)]
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df.dropna(subset=['Close', 'Open', 'High', 'Low', 'Volume'], inplace=True)
    return df

def add_indicators(df):
    close = df['Close'].astype(float)
    high = df['High'].astype(float)
    low = df['Low'].astype(float)
    volume = df['Volume'].astype(float)

    df['rsi'] = ta.momentum.RSIIndicator(close, window=14).rsi()
    df['stoch'] = ta.momentum.StochasticOscillator(high, low, close).stoch()
    macd = ta.trend.MACD(close)
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_diff'] = macd.macd_diff()
    df['ema_20'] = ta.trend.EMAIndicator(close, window=20).ema_indicator()
    df['ema_50'] = ta.trend.EMAIndicator(close, window=50).ema_indicator()
    df['ema_200'] = ta.trend.EMAIndicator(close, window=200).ema_indicator()
    bb = ta.volatility.BollingerBands(close, window=20)
    df['bb_upper'] = bb.bollinger_hband()
    df['bb_lower'] = bb.bollinger_lband()
    df['bb_mid'] = bb.bollinger_mavg()
    df['bb_width'] = bb.bollinger_wband()
    df['atr'] = ta.volatility.AverageTrueRange(high, low, close).average_true_range()
    df['volume_sma'] = volume.rolling(window=20).mean()
    df['volume_ratio'] = volume / df['volume_sma']
    df['obv'] = ta.volume.OnBalanceVolumeIndicator(close, volume).on_balance_volume()
    df['returns'] = close.pct_change()
    df['log_returns'] = np.log(close / close.shift(1))
    df['hl_pct'] = (high - low) / close * 100
    df['price_change'] = close - close.shift(1)
    df['target_1d'] = (close.shift(-1) > close).astype(int)
    df['target_3d'] = (close.shift(-3) > close).astype(int)
    df['target_5d'] = (close.shift(-5) > close).astype(int)
    df.dropna(inplace=True)
    return df

print("=" * 50)
print("  TradeVest — Feature Engineering")
print("=" * 50)

daily_files = glob.glob(DATA_DIR + '/*_daily.csv')
print(f"\n  Found {len(daily_files)} daily files\n")

success = 0
failed = 0

for filepath in daily_files:
    filename = os.path.basename(filepath)
    symbol = filename.replace('_daily.csv', '')
    print(f"  Processing {symbol}...", flush=True)

    try:
        df = pd.read_csv(filepath, index_col=0)
        df = clean_dataframe(df)

        if df.empty or len(df) < 50:
            print(f"  Not enough data — skipping")
            failed += 1
            continue

        df = add_indicators(df)
        out_path = DATA_DIR + f'/{symbol}_features.csv'
        df.to_csv(out_path)
        print(f"  Saved: {len(df)} rows, {len(df.columns)} features")
        success += 1

    except Exception as e:
        print(f"  Error: {e}", flush=True)
        failed += 1

print("\n" + "=" * 50)
print(f"  Done! {success} succeeded, {failed} failed")
print("  Ready for model training in Sprint 3")
print("=" * 50)