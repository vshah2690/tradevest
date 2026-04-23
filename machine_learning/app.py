"""
TradeVest — FastAPI Prediction Server
=======================================
Purpose:
    Python microservice that serves ML predictions to the Node.js backend.
    Loads trained XGBoost models on startup and provides REST endpoints
    for stock price direction predictions across 3 time horizons.

Endpoints:
    GET  /              — Health check
    GET  /docs          — Auto-generated Swagger UI (FastAPI built-in)
    POST /predict       — Get BUY/SELL/HOLD signal for a stock
    GET  /predict/{sym} — Quick prediction via GET request
    GET  /health        — Detailed health check with model status

Architecture:
    Node.js backend → POST /predict → FastAPI (this file)
                                    → loads latest yfinance data
                                    → engineers 105 features
                                    → runs XGBoost models
                                    → returns signals for all 3 horizons

Models loaded on startup:
    xgboost_best_1d  — Intraday  (52.05% accuracy)
    xgboost_best_3d  — 3-Day     (65.86% accuracy)
    xgboost_best_5d  — 5-Day     (73.42% accuracy)

Usage:
    # Start server:
    uvicorn app:app --host 0.0.0.0 --port 5001 --reload

    # Test prediction:
    curl -X POST http://localhost:5001/predict
         -H "Content-Type: application/json"
         -d '{"symbol": "TCS.NS"}'

Author: TradeVest Team
Version: 1.0
"""

import os
import joblib
import numpy as np
import pandas as pd
import yfinance as yf
import ta
import warnings
warnings.filterwarnings('ignore')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ── Path Configuration ────────────────────────────────────────────────────────
# app.py lives in machine_learning/ so models are in machine_learning/models/
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="TradeVest ML API",
    description="AI-powered stock prediction using XGBoost models trained on 10 years of market data",
    version="1.0.0",
)

# Allow requests from React frontend and Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model Registry ────────────────────────────────────────────────────────────
# Defines the 3 prediction horizons and their model files
HORIZONS = [
    {
        "key":        "1d",
        "label":      "Intraday",
        "days":       1,
        "accuracy":   52.05,
        "confidence": "low",
        "ui_color":   "yellow",
        "description": "Next trading day direction"
    },
    {
        "key":        "3d",
        "label":      "Short-term",
        "days":       3,
        "accuracy":   65.86,
        "confidence": "medium",
        "ui_color":   "orange",
        "description": "3 trading days direction"
    },
    {
        "key":        "5d",
        "label":      "Medium-term",
        "days":       5,
        "accuracy":   73.42,
        "confidence": "high",
        "ui_color":   "green",
        "description": "5 trading days (1 week) direction"
    },
]

# ── Load Models on Startup ────────────────────────────────────────────────────
# Models are loaded once when server starts — not on every request
# This keeps prediction latency low (~50-100ms per request)
models = {}

def load_models():
    """
    Loads all production XGBoost models, scalers and feature lists.
    Called once on startup. Exits if any model is missing.
    """
    print("\n" + "="*50)
    print("  TradeVest ML Server — Loading Models")
    print("="*50)

    for h in HORIZONS:
        key = h["key"]
        try:
            models[key] = {
                "model":    joblib.load(f"{MODELS_DIR}/xgboost_best_{key}.pkl"),
                "scaler":   joblib.load(f"{MODELS_DIR}/xgboost_best_scaler_{key}.pkl"),
                "features": joblib.load(f"{MODELS_DIR}/xgboost_best_features_{key}.pkl"),
                "meta":     h
            }
            print(f"  ✓ {h['label']} model loaded ({h['accuracy']}% accuracy)")
        except FileNotFoundError:
            print(f"  ✗ Missing: xgboost_best_{key}.pkl")
            raise RuntimeError(f"Model file not found: xgboost_best_{key}.pkl")

    print("="*50)
    print("  All models loaded successfully")
    print(f"  Swagger docs: http://localhost:5001/docs")
    print("="*50 + "\n")

load_models()

# ── Feature Engineering ───────────────────────────────────────────────────────
# Same feature engineering as compute_features.py but on live data
# This runs on every prediction request

ALL_FEATURES = [
    'Open', 'High', 'Low', 'Close', 'Volume',
    'rsi', 'rsi_6', 'rsi_21', 'stoch', 'stoch_signal',
    'williams_r', 'roc_5', 'roc_10', 'roc_20',
    'macd', 'macd_signal', 'macd_diff',
    'ema_5', 'ema_10', 'ema_20', 'ema_50', 'ema_200',
    'ema_8', 'ema_13', 'ema_21', 'ema_34', 'ema_55',
    'bb_upper', 'bb_lower', 'bb_width', 'bb_pct',
    'atr', 'atr_pct', 'volume_ratio', 'volume_ratio_5', 'obv',
    'returns', 'returns_2', 'returns_3', 'returns_5', 'returns_10',
    'returns_21', 'returns_63',
    'log_returns', 'hl_pct', 'oc_pct', 'gap',
    'close_lag_1', 'close_lag_2', 'close_lag_3', 'close_lag_5',
    'close_lag_7', 'close_lag_14', 'close_lag_21',
    'returns_lag_1', 'returns_lag_2', 'returns_lag_3',
    'returns_lag_7', 'returns_lag_14',
    'close_mean_5', 'close_mean_10', 'close_mean_20',
    'close_std_5', 'close_std_10', 'close_std_20',
    'returns_mean_5', 'returns_std_5', 'returns_std_20',
    'close_to_ema5', 'close_to_ema20', 'close_to_ema50', 'close_to_ema200',
    'ema5_to_ema20', 'ema20_to_ema50',
    'ema8_to_ema13', 'ema13_to_ema21', 'ema21_to_ema34', 'ema34_to_ema55',
    'price_position_5', 'price_position_20',
    'day_of_week', 'month', 'quarter',
]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes all 105 technical features on live OHLCV data.
    Mirrors compute_features.py exactly so live predictions match training.

    Args:
        df: DataFrame with columns Open, High, Low, Close, Volume
            Must have DatetimeIndex and at least 200 rows (for EMA-200)

    Returns:
        DataFrame with all features computed, last row ready for prediction
    """
    close  = df['Close'].astype(float)
    high   = df['High'].astype(float)
    low    = df['Low'].astype(float)
    volume = df['Volume'].astype(float)
    open_  = df['Open'].astype(float)

    # Momentum
    df['rsi']          = ta.momentum.RSIIndicator(close, window=14).rsi()
    df['rsi_6']        = ta.momentum.RSIIndicator(close, window=6).rsi()
    df['rsi_21']       = ta.momentum.RSIIndicator(close, window=21).rsi()
    df['stoch']        = ta.momentum.StochasticOscillator(high, low, close).stoch()
    df['stoch_signal'] = ta.momentum.StochasticOscillator(high, low, close).stoch_signal()
    df['williams_r']   = ta.momentum.WilliamsRIndicator(high, low, close).williams_r()
    df['roc_5']        = ta.momentum.ROCIndicator(close, window=5).roc()
    df['roc_10']       = ta.momentum.ROCIndicator(close, window=10).roc()
    df['roc_20']       = ta.momentum.ROCIndicator(close, window=20).roc()

    # Trend
    macd = ta.trend.MACD(close)
    df['macd']        = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_diff']   = macd.macd_diff()
    df['ema_5']   = ta.trend.EMAIndicator(close, window=5).ema_indicator()
    df['ema_8']   = ta.trend.EMAIndicator(close, window=8).ema_indicator()
    df['ema_10']  = ta.trend.EMAIndicator(close, window=10).ema_indicator()
    df['ema_13']  = ta.trend.EMAIndicator(close, window=13).ema_indicator()
    df['ema_20']  = ta.trend.EMAIndicator(close, window=20).ema_indicator()
    df['ema_21']  = ta.trend.EMAIndicator(close, window=21).ema_indicator()
    df['ema_34']  = ta.trend.EMAIndicator(close, window=34).ema_indicator()
    df['ema_50']  = ta.trend.EMAIndicator(close, window=50).ema_indicator()
    df['ema_55']  = ta.trend.EMAIndicator(close, window=55).ema_indicator()
    df['ema_200'] = ta.trend.EMAIndicator(close, window=200).ema_indicator()

    # Volatility
    bb = ta.volatility.BollingerBands(close, window=20)
    df['bb_upper'] = bb.bollinger_hband()
    df['bb_lower'] = bb.bollinger_lband()
    df['bb_width'] = bb.bollinger_wband()
    df['bb_pct']   = bb.bollinger_pband()
    df['atr']      = ta.volatility.AverageTrueRange(high, low, close).average_true_range()
    df['atr_pct']  = df['atr'] / close * 100

    # Volume
    df['volume_sma']     = volume.rolling(20).mean()
    df['volume_ratio']   = volume / df['volume_sma']
    df['volume_ratio_5'] = volume / volume.rolling(5).mean()
    df['obv']            = ta.volume.OnBalanceVolumeIndicator(close, volume).on_balance_volume()

    # Returns
    df['returns']    = close.pct_change()
    df['returns_2']  = close.pct_change(2)
    df['returns_3']  = close.pct_change(3)
    df['returns_5']  = close.pct_change(5)
    df['returns_10'] = close.pct_change(10)
    df['returns_21'] = close.pct_change(21)
    df['returns_63'] = close.pct_change(63)
    df['log_returns'] = np.log(close / close.shift(1))
    df['hl_pct']     = (high - low) / close * 100
    df['oc_pct']     = (close - open_) / open_ * 100
    df['gap']        = (open_ - close.shift(1)) / close.shift(1) * 100

    # Lag features
    for lag in [1, 2, 3, 5, 7, 10, 14, 21]:
        df[f'close_lag_{lag}']   = close.shift(lag)
        df[f'returns_lag_{lag}'] = df['returns'].shift(lag)

    # Rolling statistics
    for window in [5, 10, 20]:
        df[f'close_mean_{window}']   = close.rolling(window).mean()
        df[f'close_std_{window}']    = close.rolling(window).std()
        df[f'returns_mean_{window}'] = df['returns'].rolling(window).mean()
        df[f'returns_std_{window}']  = df['returns'].rolling(window).std()

    # Price relative to MAs
    df['close_to_ema5']   = (close - df['ema_5'])   / df['ema_5']   * 100
    df['close_to_ema20']  = (close - df['ema_20'])  / df['ema_20']  * 100
    df['close_to_ema50']  = (close - df['ema_50'])  / df['ema_50']  * 100
    df['close_to_ema200'] = (close - df['ema_200']) / df['ema_200'] * 100
    df['ema5_to_ema20']   = (df['ema_5']  - df['ema_20']) / df['ema_20'] * 100
    df['ema20_to_ema50']  = (df['ema_20'] - df['ema_50']) / df['ema_50'] * 100

    # Fibonacci EMA cross ratios
    df['ema8_to_ema13']  = (df['ema_8']  - df['ema_13']) / df['ema_13'] * 100
    df['ema13_to_ema21'] = (df['ema_13'] - df['ema_21']) / df['ema_21'] * 100
    df['ema21_to_ema34'] = (df['ema_21'] - df['ema_34']) / df['ema_34'] * 100
    df['ema34_to_ema55'] = (df['ema_34'] - df['ema_55']) / df['ema_55'] * 100

    # Price position
    rolling_min_20 = close.rolling(20).min()
    rolling_max_20 = close.rolling(20).max()
    denom_20 = rolling_max_20 - rolling_min_20
    df['price_position_20'] = np.where(denom_20 > 0, (close - rolling_min_20) / denom_20, 0.5)

    rolling_min_5 = close.rolling(5).min()
    rolling_max_5 = close.rolling(5).max()
    denom_5 = rolling_max_5 - rolling_min_5
    df['price_position_5'] = np.where(denom_5 > 0, (close - rolling_min_5) / denom_5, 0.5)

    # Calendar features
    df.index = pd.to_datetime(df.index)
    df['day_of_week'] = df.index.dayofweek
    df['month']       = df.index.month
    df['quarter']     = df.index.quarter

    # Clean up
    df = df.copy()
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.ffill(inplace=True)
    df.bfill(inplace=True)
    df.dropna(inplace=True)

    return df


def fetch_and_predict(symbol: str) -> dict:
    """
    Fetches live data for a symbol, engineers features,
    and runs all 3 prediction models.

    Args:
        symbol: Yahoo Finance ticker e.g. 'TCS.NS' or 'AAPL'

    Returns:
        dict with predictions for all 3 horizons + live price data
    """
    # Fetch 2 years of daily data — enough for EMA-200 + all lag features
    df = yf.download(symbol, period='2y', interval='1d',
                     auto_adjust=True, progress=False)

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for symbol: {symbol}. "
                   f"Check the ticker is valid (e.g. TCS.NS for NSE India)"
        )

    # Flatten MultiIndex columns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # Need at least 250 rows for EMA-200 + rolling windows
    if len(df) < 250:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data for {symbol}: {len(df)} rows (need 250+)"
        )

    # Engineer features
    df = engineer_features(df)

    if df.empty:
        raise HTTPException(
            status_code=500,
            detail=f"Feature engineering failed for {symbol}"
        )

    # Use the last row for prediction (most recent trading day)
    latest = df.iloc[-1]
    current_price = float(latest['Close'])
    prev_close    = float(df.iloc[-2]['Close']) if len(df) > 1 else current_price
    price_change  = current_price - prev_close
    price_change_pct = (price_change / prev_close * 100) if prev_close != 0 else 0

    # Run predictions for all 3 horizons
    predictions = []
    for key, m in models.items():
        try:
            # Scale ALL features first, then select top 40
            # The scaler was fitted on all features, not just the selected ones
            all_available = [f for f in ALL_FEATURES if f in df.columns]
            X_all         = latest[all_available].values.reshape(1, -1)
            X_all_scaled  = m["scaler"].transform(X_all)

            # Now select top 40 features by position
            features      = m["features"]
            feature_idx   = [all_available.index(f) for f in features if f in all_available]
            X_scaled      = X_all_scaled[:, feature_idx]

            # Get probability of price going UP
            prob_up      = float(m["model"].predict_proba(X_scaled)[0][1])
            prob_down    = 1 - prob_up

            # Convert probability to signal
            if prob_up >= 0.60:
                signal = "BUY"
            elif prob_up <= 0.40:
                signal = "SELL"
            else:
                signal = "HOLD"

            meta = m["meta"]
            predictions.append({
                "horizon":      meta["label"],
                "days":         meta["days"],
                "signal":       signal,
                "confidence":   round(max(prob_up, prob_down) * 100, 1),
                "probability_up":   round(prob_up * 100, 1),
                "probability_down": round(prob_down * 100, 1),
                "model_accuracy":   meta["accuracy"],
                "confidence_level": meta["confidence"],
                "ui_color":         meta["ui_color"],
                "description":      meta["description"],
            })
        except Exception as e:
            predictions.append({
                "horizon":  m["meta"]["label"],
                "signal":   "ERROR",
                "error":    str(e)
            })

    # Overall signal — weighted by model accuracy
    signals = [p["signal"] for p in predictions if p.get("signal") != "ERROR"]
    weights = [m["meta"]["accuracy"] for m in models.values()]
    buy_score  = sum(w for p, w in zip(predictions, weights) if p.get("signal") == "BUY")
    sell_score = sum(w for p, w in zip(predictions, weights) if p.get("signal") == "SELL")
    hold_score = sum(w for p, w in zip(predictions, weights) if p.get("signal") == "HOLD")

    if buy_score > sell_score and buy_score > hold_score:
        overall_signal = "BUY"
    elif sell_score > buy_score and sell_score > hold_score:
        overall_signal = "SELL"
    else:
        overall_signal = "HOLD"

    return {
        "symbol":           symbol.upper(),
        "timestamp":        datetime.now().isoformat(),
        "current_price":    round(current_price, 2),
        "price_change":     round(price_change, 2),
        "price_change_pct": round(price_change_pct, 2),
        "overall_signal":   overall_signal,
        "predictions":      predictions,
        "data_rows_used":   len(df),
    }


# ── Request / Response Models ─────────────────────────────────────────────────
class PredictRequest(BaseModel):
    symbol: str

    class Config:
        json_schema_extra = {
            "example": {"symbol": "TCS.NS"}
        }


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Root endpoint — confirms server is running."""
    return {
        "service": "TradeVest ML API",
        "version": "1.0.0",
        "status":  "running",
        "docs":    "/docs",
        "models_loaded": len(models),
    }


@app.get("/health")
def health():
    """Detailed health check — shows model status and accuracy."""
    return {
        "status": "healthy",
        "models": [
            {
                "horizon":  m["meta"]["label"],
                "loaded":   True,
                "accuracy": m["meta"]["accuracy"],
                "confidence_level": m["meta"]["confidence"],
            }
            for m in models.values()
        ],
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/predict")
def predict(request: PredictRequest):
    """
    Main prediction endpoint.

    Returns BUY/SELL/HOLD signals for all 3 horizons
    plus live price data for the requested symbol.

    Example request:
        POST /predict
        {"symbol": "TCS.NS"}

    Example response:
        {
          "symbol": "TCS.NS",
          "current_price": 3842.50,
          "overall_signal": "BUY",
          "predictions": [
            {"horizon": "Intraday", "signal": "HOLD", "confidence": 52.1},
            {"horizon": "Short-term", "signal": "BUY", "confidence": 65.4},
            {"horizon": "Medium-term", "signal": "BUY", "confidence": 73.2}
          ]
        }
    """
    symbol = request.symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol cannot be empty")

    return fetch_and_predict(symbol)


@app.get("/predict/{symbol}")
def predict_get(symbol: str):
    """
    GET version of predict — useful for quick browser testing.

    Example: GET /predict/TCS.NS
    """
    return fetch_and_predict(symbol.strip().upper())