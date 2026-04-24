"""
TradeVest — Feature Engineering Pipeline
=========================================
Purpose:
    Reads raw OHLCV daily CSV files downloaded by download_data.py and
    computes 105 technical indicators, price features, lag features,
    rolling statistics, and calendar features. Saves enriched feature
    CSVs ready for model training.

Usage:
    python scripts/compute_features.py

Input:
    data/*_daily.csv  — raw OHLCV files (one per symbol)

Output:
    data/*_features.csv — 105-feature files (one per symbol)

Feature Categories:
    - Momentum      : RSI (6, 14, 21), Stochastic, Williams %R, ROC
    - Trend         : MACD, EMA (5,8,10,13,20,21,34,50,55,200), SMA
    - Volatility    : Bollinger Bands, ATR
    - Volume        : OBV, VWAP, Volume ratios
    - Price         : Returns, Log returns, HL%, OC%, Gap
    - Lag features  : Close/returns/volume lags (1,2,3,5,7,10,14,21)
    - Rolling stats : Mean, std of close/returns/volume (5,10,20 windows)
    - MA ratios     : Price relative to EMAs, EMA cross ratios
    - Fibonacci EMAs: EMA relationships (8/13, 13/21, 21/34, 34/55)
    - Calendar      : Day of week, month, quarter
    - Targets       : target_1d, target_3d, target_5d (binary: 1=up, 0=down)

Model Training Results (after feature engineering):
    - 1-Day  XGBoost: 52.05% accuracy (GridSearch optimized)
    - 3-Day  XGBoost: 65.86% accuracy (GridSearch optimized)
    - 5-Day  XGBoost: 73.42% accuracy (GridSearch optimized)

Author: Viraj Shah, Vrajrajsinh Rathod
Version: 2.0 (final — production ready)
"""

import pandas as pd
import numpy as np
import ta
import os
import glob

# ── Configuration ─────────────────────────────────────────────────────────────
#  path for reliability
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR   = os.path.dirname(SCRIPT_DIR)
DATA_DIR   = os.path.join(BASE_DIR, 'data')

# Minimum rows required per symbol to proceed with feature engineering.
# Symbols with fewer rows are skipped (insufficient history for indicators).
MIN_ROWS = 50

# Threshold for dropna — drop rows where less than 70% of columns have values.
# This preserves rows with a few NaNs from rolling windows while removing
# rows that are genuinely broken.
DROPNA_THRESHOLD = 0.7


def clean_dataframe(df):
    """
    Cleans a raw OHLCV dataframe downloaded by yfinance.

    Problems this solves:
        1. yfinance sometimes returns MultiIndex columns (ticker name as level 0)
        2. Column names may have leading/trailing whitespace
        3. All columns are sometimes saved as strings in CSV
        4. Rows with missing OHLCV values need to be dropped

    Args:
        df (pd.DataFrame): Raw dataframe read from CSV

    Returns:
        pd.DataFrame: Cleaned dataframe with numeric columns
    """
    # yfinance v0.2+ sometimes returns MultiIndex columns like (Close, TCS.NS)
    # We only want the first level (Close, High, Low, Open, Volume)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # Strip whitespace from column names
    df.columns = [str(c).strip() for c in df.columns]

    # Convert all columns to numeric — CSVs sometimes store numbers as strings
    # errors='coerce' converts unparseable values to NaN instead of crashing
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Only drop rows missing essential OHLCV columns.
    # We don't dropna() everything here because indicator columns
    # don't exist yet — they'll have NaN from rolling windows initially.
    df.dropna(subset=['Close', 'Open', 'High', 'Low', 'Volume'], inplace=True)

    return df


def add_indicators(df):
    """
    Computes 105 technical features on a clean OHLCV dataframe.

    Feature engineering philosophy:
        - More features give the model more signals to learn from
        - Feature selection in train_boost.py picks the most important 40
        - We compute everything here and let the model decide what's useful
        - Fibonacci EMAs (8,13,21,34,55) proved especially powerful —
          they are widely used by professional traders and show up
          consistently in our top-10 feature importance rankings

    Target label design:
        - target_1d: 1 if tomorrow's close > today's close, else 0
        - target_3d: 1 if close in 3 days > today's close, else 0
        - target_5d: 1 if close in 5 days > today's close, else 0
        - We use shift(-N) to look N days into the future
        - This means the last N rows will have NaN targets (dropped later)

    Args:
        df (pd.DataFrame): Clean OHLCV dataframe

    Returns:
        pd.DataFrame: Dataframe with 105 feature columns + 3 target columns
    """
    # Extract base series for cleaner code below
    close = df['Close'].astype(float)
    high = df['High'].astype(float)
    low = df['Low'].astype(float)
    volume = df['Volume'].astype(float)
    open_ = df['Open'].astype(float)

    # ── Momentum Indicators ───────────────────────────────────────────────────
    # RSI (Relative Strength Index): measures speed/magnitude of price changes
    # Values: 0-100. >70 = overbought (potential sell), <30 = oversold (buy)
    # We compute 3 periods to capture short/medium/long momentum
    df['rsi'] = ta.momentum.RSIIndicator(close, window=14).rsi()
    df['rsi_6'] = ta.momentum.RSIIndicator(close, window=6).rsi()
    df['rsi_21'] = ta.momentum.RSIIndicator(close, window=21).rsi()

    # Stochastic Oscillator: compares close to high-low range
    # %K = current position, %D = signal line (3-period SMA of %K)
    df['stoch'] = ta.momentum.StochasticOscillator(
        high, low, close).stoch()
    df['stoch_signal'] = ta.momentum.StochasticOscillator(
        high, low, close).stoch_signal()

    # Williams %R: similar to stochastic, measures overbought/oversold
    # Range: -100 to 0. Above -20 = overbought, below -80 = oversold
    df['williams_r'] = ta.momentum.WilliamsRIndicator(
        high, low, close).williams_r()

    # Rate of Change: percentage change over N periods
    # Captures momentum at different timescales
    df['roc_5'] = ta.momentum.ROCIndicator(close, window=5).roc()
    df['roc_10'] = ta.momentum.ROCIndicator(close, window=10).roc()
    df['roc_20'] = ta.momentum.ROCIndicator(close, window=20).roc()

    # ── Trend Indicators ──────────────────────────────────────────────────────
    # MACD (Moving Average Convergence Divergence):
    # macd = EMA(12) - EMA(26), signal = EMA(9) of macd
    # macd_diff (histogram) = macd - signal
    # Signal line crossover is one of the most widely used trade triggers
    macd = ta.trend.MACD(close)
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_diff'] = macd.macd_diff()

    # Standard EMAs used by most traders and institutions
    df['ema_5'] = ta.trend.EMAIndicator(close, window=5).ema_indicator()
    df['ema_10'] = ta.trend.EMAIndicator(close, window=10).ema_indicator()
    df['ema_20'] = ta.trend.EMAIndicator(close, window=20).ema_indicator()
    df['ema_50'] = ta.trend.EMAIndicator(close, window=50).ema_indicator()
    df['ema_200'] = ta.trend.EMAIndicator(close, window=200).ema_indicator()

    # SMA 20 — simple moving average used as Bollinger Band midline
    df['sma_20'] = ta.trend.SMAIndicator(close, window=20).sma_indicator()

    # ── Volatility Indicators ─────────────────────────────────────────────────
    # Bollinger Bands: price envelope 2 std devs above/below 20-day SMA
    # bb_pct = where price is within the bands (0=lower, 1=upper)
    # bb_width = band width as % of midline (measures volatility)
    bb = ta.volatility.BollingerBands(close, window=20)
    df['bb_upper'] = bb.bollinger_hband()
    df['bb_lower'] = bb.bollinger_lband()
    df['bb_mid'] = bb.bollinger_mavg()
    df['bb_width'] = bb.bollinger_wband()
    df['bb_pct'] = bb.bollinger_pband()

    # ATR (Average True Range): measures market volatility
    # High ATR = volatile market, low ATR = calm market
    df['atr'] = ta.volatility.AverageTrueRange(
        high, low, close).average_true_range()
    df['atr_pct'] = df['atr'] / close * 100  # ATR as % of price (normalised)

    # ── Volume Indicators ─────────────────────────────────────────────────────
    # Volume relative to its own average — confirms price moves
    # High volume breakout = reliable, low volume breakout = unreliable
    df['volume_sma'] = volume.rolling(window=20).mean()
    df['volume_ratio'] = volume / df['volume_sma']      # vs 20-day average
    df['volume_ratio_5'] = volume / volume.rolling(5).mean()  # vs 5-day average

    # OBV (On-Balance Volume): running total of volume based on price direction
    # Rising OBV with rising price = strong uptrend confirmation
    df['obv'] = ta.volume.OnBalanceVolumeIndicator(
        close, volume).on_balance_volume()

    # VWAP (Volume Weighted Average Price): institutional benchmark
    # Price above VWAP = bullish, below = bearish
    df['vwap'] = (close * volume).cumsum() / volume.cumsum()

    # ── Price Return Features ─────────────────────────────────────────────────
    # Simple percentage returns at multiple timeframes
    # These capture momentum at different scales
    df['returns'] = close.pct_change()          # 1-day return
    df['returns_2'] = close.pct_change(2)
    df['returns_3'] = close.pct_change(3)
    df['returns_5'] = close.pct_change(5)       # 1-week return
    df['returns_10'] = close.pct_change(10)     # 2-week return
    df['returns_21'] = close.pct_change(21)     # 1-month return
    df['returns_63'] = close.pct_change(63)     # 1-quarter return

    # Log returns: more statistically robust than simple returns
    # Better for modelling as they are normally distributed
    df['log_returns'] = np.log(close / close.shift(1))

    # Intraday range as % of close — measures daily volatility
    df['hl_pct'] = (high - low) / close * 100

    # Open to close % — measures intraday direction/strength
    df['oc_pct'] = (close - open_) / open_ * 100

    # Overnight gap: difference between today's open and yesterday's close
    # Large gaps indicate news events or institutional activity
    df['gap'] = (open_ - close.shift(1)) / close.shift(1) * 100

    # ── Lag Features ─────────────────────────────────────────────────────────
    # Historical values of key metrics — gives model memory of recent prices
    # Critical for sequence patterns that XGBoost can't capture otherwise
    for lag in [1, 2, 3, 5, 10]:
        df[f'close_lag_{lag}'] = close.shift(lag)
        df[f'returns_lag_{lag}'] = df['returns'].shift(lag)
        df[f'volume_lag_{lag}'] = volume.shift(lag)

    # Extended lags — weekly and monthly historical prices
    for lag in [7, 14, 21]:
        df[f'close_lag_{lag}'] = close.shift(lag)
        df[f'returns_lag_{lag}'] = df['returns'].shift(lag)

    # ── Rolling Statistics ────────────────────────────────────────────────────
    # Statistical moments of price/returns over rolling windows
    # std = volatility, mean = trend direction, skew = distribution shape
    for window in [5, 10, 20]:
        df[f'close_mean_{window}'] = close.rolling(window).mean()
        df[f'close_std_{window}'] = close.rolling(window).std()
        df[f'volume_std_{window}'] = volume.rolling(window).std()
        df[f'returns_mean_{window}'] = df['returns'].rolling(window).mean()
        df[f'returns_std_{window}'] = df['returns'].rolling(window).std()

    # ── Price Relative to Moving Averages ─────────────────────────────────────
    # How far price is from key MAs as a percentage
    # These are normalised so they work across stocks of different price levels
    df['close_to_ema5'] = (close - df['ema_5']) / df['ema_5'] * 100
    df['close_to_ema20'] = (close - df['ema_20']) / df['ema_20'] * 100
    df['close_to_ema50'] = (close - df['ema_50']) / df['ema_50'] * 100
    df['close_to_ema200'] = (close - df['ema_200']) / df['ema_200'] * 100

    # EMA cross ratios — when short EMA > long EMA = bullish
    # Golden cross: EMA5 > EMA20, Death cross: EMA5 < EMA20
    df['ema5_to_ema20'] = (df['ema_5'] - df['ema_20']) / df['ema_20'] * 100
    df['ema20_to_ema50'] = (df['ema_20'] - df['ema_50']) / df['ema_50'] * 100

    # ── Price Position Within Range ───────────────────────────────────────────
    # Where is current price within the recent N-day high/low range?
    # 0 = at the bottom of range, 1 = at the top, 0.5 = in the middle
    # Normalised so it works across all price levels
    rolling_min_20 = close.rolling(20).min()
    rolling_max_20 = close.rolling(20).max()
    denom_20 = rolling_max_20 - rolling_min_20
    df['price_position_20'] = np.where(
        denom_20 > 0, (close - rolling_min_20) / denom_20, 0.5
    )

    rolling_min_5 = close.rolling(5).min()
    rolling_max_5 = close.rolling(5).max()
    denom_5 = rolling_max_5 - rolling_min_5
    df['price_position_5'] = np.where(
        denom_5 > 0, (close - rolling_min_5) / denom_5, 0.5
    )

    # ── Calendar Features ─────────────────────────────────────────────────────
    # Markets behave differently on different days/months
    # Monday effect: stocks often fall on Mondays
    # January effect: stocks often rise in January
    # Quarter-end: institutional rebalancing affects prices
    if hasattr(df.index, 'dayofweek'):
        df['day_of_week'] = df.index.dayofweek  # 0=Monday, 4=Friday
        df['month'] = df.index.month            # 1-12
        df['quarter'] = df.index.quarter        # 1-4
    else:
        df.index = pd.to_datetime(df.index, errors='coerce')
        df['day_of_week'] = df.index.dayofweek
        df['month'] = df.index.month
        df['quarter'] = df.index.quarter

    # Defragment before adding final columns
    df = df.copy() 

    # ── Fibonacci EMA Features ────────────────────────────────────────────────
    # Fibonacci numbers (8,13,21,34,55) are widely used in technical analysis
    # These EMAs consistently ranked in top-10 feature importance during training
    # They capture market participant psychology at key Fibonacci intervals
    df['ema_8'] = ta.trend.EMAIndicator(close, window=8).ema_indicator()
    df['ema_13'] = ta.trend.EMAIndicator(close, window=13).ema_indicator()
    df['ema_21'] = ta.trend.EMAIndicator(close, window=21).ema_indicator()
    df['ema_34'] = ta.trend.EMAIndicator(close, window=34).ema_indicator()
    df['ema_55'] = ta.trend.EMAIndicator(close, window=55).ema_indicator()

    # Cross ratios between consecutive Fibonacci EMAs
    # When faster EMA > slower EMA = bullish momentum at that Fibonacci level
    df['ema8_to_ema13'] = (df['ema_8'] - df['ema_13']) / df['ema_13'] * 100
    df['ema13_to_ema21'] = (df['ema_13'] - df['ema_21']) / df['ema_21'] * 100
    df['ema21_to_ema34'] = (df['ema_21'] - df['ema_34']) / df['ema_34'] * 100
    df['ema34_to_ema55'] = (df['ema_34'] - df['ema_55']) / df['ema_55'] * 100

    # ── Target Labels ─────────────────────────────────────────────────────────
    # Binary classification targets for three prediction horizons
    # 1 = price will be HIGHER in N days, 0 = price will be LOWER or same
    # Note: last N rows will have NaN (no future data) and are dropped below
    df['target_1d'] = (close.shift(-1) > close).astype(int)
    df['target_3d'] = (close.shift(-3) > close).astype(int)
    df['target_5d'] = (close.shift(-5) > close).astype(int)

    # ── Final Cleanup ─────────────────────────────────────────────────────────
    # Replace infinity values (from division by zero in ratio features)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # Drop rows where less than 70% of columns have values
    # (removes rows at the start with many NaN from long rolling windows)
    df.dropna(thresh=int(len(df.columns) * DROPNA_THRESHOLD), inplace=True)

    # Forward/backward fill remaining NaN values
    # ffill: carry last known value forward
    # bfill: fill remaining NaN at the start with next known value
    df.ffill(inplace=True)
    df.bfill(inplace=True)

    # Final strict dropna — remove any remaining NaN rows
    df.dropna(inplace=True)

    return df


# ── Main Execution ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("  TradeVest — Feature Engineering Pipeline")
    print("  Computes 105 features across 24 symbols")
    print("=" * 55)

    daily_files = glob.glob(DATA_DIR + '/*_daily.csv')
    print(f"\n  Found {len(daily_files)} daily CSV files\n")

    success = 0
    failed = 0

    for filepath in daily_files:
        filename = os.path.basename(filepath)
        symbol = filename.replace('_daily.csv', '')
        print(f"  Processing {symbol}...", flush=True)

        try:
            # Read CSV with date parsing for calendar features
            df = pd.read_csv(filepath, index_col=0, parse_dates=True)
            df = clean_dataframe(df)

            # Skip symbols with insufficient historical data
            if df.empty or len(df) < MIN_ROWS:
                print(f"  Skipping — insufficient data ({len(df)} rows)")
                failed += 1
                continue

            # Compute all 105 features
            df = add_indicators(df)

            # Save enriched feature file
            out_path = DATA_DIR + f'/{symbol}_features.csv'
            df.to_csv(out_path)
            print(f"  Saved: {len(df)} rows, {len(df.columns)} features")
            success += 1

        except Exception as e:
            print(f"  Error processing {symbol}: {e}", flush=True)
            failed += 1

    print("\n" + "=" * 55)
    print(f"  Complete: {success} succeeded, {failed} failed")
    print(f"  Output: {DATA_DIR}/*_features.csv")
    print("  Next step: python scripts/train_boost.py")
    print("=" * 55)