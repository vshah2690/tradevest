"""
TradeVest — LSTM Model Training (DEPRECATED EXPERIMENT)
=========================================================
Status:
    DEPRECATED — XGBoost outperforms LSTM on this dataset.
    This file is kept for reference and future experimentation.
    The production prediction server (app.py) uses XGBoost models
    from train_boost.py, NOT the LSTM models from this file.

Purpose:
    Trains LSTM (Long Short-Term Memory) neural network models for
    stock price direction prediction. Evaluated as an alternative to
    XGBoost gradient boosting.

Why LSTM was tried:
    LSTMs are designed for sequential time-series data. Stock prices
    are sequential — today's price depends on yesterday's price, last
    week's trend etc. This made LSTM an obvious candidate to evaluate.

Why LSTM was abandoned:
    Results on our dataset (24 symbols, 10 years daily data):

    Model               Accuracy    vs XGBoost
    ---------           --------    ----------
    LSTM General        51-54%      WORSE (-6 to -9%)
    XGBoost General     57-73%      BETTER
    XGBoost GridSearch  73.42%      BEST

    Root cause analysis:
    1. LSTM excels at TRUE sequential dependencies (speech, text, music)
       where context 100+ steps ago matters. Daily stock candles have
       weak sequential dependency beyond 5-10 days.
    2. XGBoost excels at tabular features (RSI=67, MACD_cross=true).
       Our 105 engineered features are inherently tabular — XGBoost
       is the right tool for this data structure.
    3. With only ~2,500 rows per stock, LSTMs don't have enough data
       to learn meaningful sequential patterns without overfitting.
    4. General LSTM (trained on all 25 stocks combined) learns average
       patterns that don't apply well to any individual stock.

When LSTM might work better (future enhancement ideas):
    - Train stock-specific LSTMs with 10+ years of 5-minute data
    - Use Transformer architecture (attention mechanism) instead of LSTM
    - Add fundamental data (earnings, P/E ratio) as additional features
    - Use pre-trained financial language models for sentiment features
    - Ensemble LSTM with XGBoost predictions as meta-features

Architecture:
    Input  → LSTM(128) → BatchNorm → Dropout(0.3)
           → LSTM(64)  → BatchNorm → Dropout(0.2)
           → LSTM(32)  → Dropout(0.2)
           → Dense(32, relu) → BatchNorm
           → Dense(16, relu)
           → Dense(1, sigmoid)

    Input shape: (batch_size, sequence_length=30, features=31)
    Output: probability 0-1 (>0.5 = UP prediction)

Usage:
    # To re-run the LSTM experiment:
    python scripts/train_lstm.py

    # NOTE: This takes 15-30 minutes and produces models that
    # are NOT used by the production server. Run only if you
    # want to experiment with improving LSTM accuracy.

Output:
    models/lstm_target_5d.keras      (deprecated — not used in production)
    models/lstm_target_3d.keras      (deprecated — not used in production)
    models/lstm_scaler_target_5d.pkl (deprecated — not used in production)
    models/lstm_scaler_target_3d.pkl (deprecated — not used in production)

Author: Viraj Shah
Version: 1.0 (experimental — not production)
"""

import pandas as pd
import numpy as np
import glob
import os
import joblib
import warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import accuracy_score
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR   = os.path.dirname(SCRIPT_DIR)
DATA_DIR   = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# Number of time steps in each input sequence.
# Each sequence = 30 consecutive trading days of feature data.
# The model looks at the last 30 days to predict the next N days.
# We tried 20, 30, 60 — 30 gave the best balance of context vs noise.
SEQUENCE_LENGTH = 30

# Features used for LSTM — subset of the full 105 features.
# We use fewer features than XGBoost because LSTM processes them
# sequentially and too many features increase training time significantly
# without improving accuracy on this dataset.
FEATURES = [
    # Core price and volume
    'Close', 'Volume',

    # Momentum
    'rsi', 'rsi_6',
    'macd', 'macd_signal', 'macd_diff',

    # Trend
    'ema_5', 'ema_20', 'ema_50',

    # Volatility
    'bb_upper', 'bb_lower', 'bb_width', 'bb_pct',
    'atr',

    # Volume
    'volume_ratio', 'obv',

    # Returns
    'returns', 'returns_2', 'returns_5',
    'log_returns', 'hl_pct', 'oc_pct', 'gap',

    # Price relative to MAs
    'close_to_ema5', 'close_to_ema20', 'close_to_ema50',

    # Price position
    'price_position_5', 'price_position_20',

    # Calendar
    'day_of_week', 'month',
]


def create_sequences(data, labels, seq_length):
    """
    Converts flat feature arrays into 3D sequences for LSTM input.

    LSTM requires input shape: (samples, timesteps, features)
    This function creates overlapping windows of length seq_length.

    Example with seq_length=3, data=[1,2,3,4,5]:
        Sequence 0: [1,2,3] → label[3]
        Sequence 1: [2,3,4] → label[4]
        Sequence 2: [3,4,5] → label[5]

    Args:
        data       (np.ndarray): Scaled feature array, shape (rows, features)
        labels     (np.ndarray): Target labels, shape (rows,)
        seq_length (int)       : Number of timesteps per sequence

    Returns:
        tuple: (X array shape (n_sequences, seq_length, features),
                y array shape (n_sequences,))
    """
    X, y = [], []
    for i in range(seq_length, len(data)):
        X.append(data[i - seq_length:i])  # Last seq_length rows
        y.append(labels[i])               # Label for the current row
    return np.array(X), np.array(y)


def load_all_data(target_col):
    """
    Loads and combines feature CSVs for all symbols.

    Note: Unlike train_boost.py which uses shuffle=True in train_test_split,
    LSTM uses a chronological split (first 80% = train, last 20% = test).
    This is because sequences must be time-ordered for the LSTM to learn
    temporal patterns correctly.

    Args:
        target_col (str): Target column name e.g. 'target_5d'

    Returns:
        pd.DataFrame: Combined dataframe
    """
    all_dfs = []
    files = glob.glob(DATA_DIR + '/*_features.csv')

    for f in files:
        try:
            df = pd.read_csv(f, index_col=0)
            available = [c for c in FEATURES if c in df.columns]
            df = df[available + [target_col]].dropna()
            all_dfs.append(df)
        except Exception:
            pass

    return pd.concat(all_dfs, ignore_index=True)


def train_lstm(target_col, label):
    """
    Trains a stacked LSTM model for a single prediction horizon.

    Architecture decisions:
        - 3 LSTM layers (128→64→32 units): captures patterns at different
          levels of abstraction. First layer learns short patterns,
          deeper layers learn longer-term dependencies.
        - BatchNormalization after each LSTM: stabilises training,
          allows higher learning rates, acts as regulariser.
        - Dropout (0.3, 0.2, 0.2): prevents overfitting on small dataset.
        - EarlyStopping on val_accuracy (not val_loss): we care about
          prediction accuracy, not the loss value.
        - ReduceLROnPlateau: automatically halves learning rate when
          validation loss plateaus — helps escape local minima.

    Known limitation:
        Training on combined data from all stocks mixes patterns that
        don't generalise well. A stock-specific LSTM would need much
        more data per symbol than we have (~2,500 rows per stock is
        insufficient for a deep LSTM to learn meaningful patterns).

    Args:
        target_col (str): Target column e.g. 'target_5d'
        label      (str): Human readable label e.g. '5-Day'

    Returns:
        float: Final test accuracy
    """
    print(f"\n{'='*52}")
    print(f"  LSTM Experiment — {label}")
    print(f"{'='*52}")

    # ── Load and Prepare Data ─────────────────────────────────────────────────
    df = load_all_data(target_col)
    available = [c for c in FEATURES if c in df.columns]

    # MinMaxScaler: scales all features to [0, 1] range
    # Required for LSTM — sigmoid/tanh activations work best with [0,1] input
    # Unlike XGBoost, LSTM is sensitive to feature scale
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(df[available])
    labels = df[target_col].values

    # Create overlapping sequences of SEQUENCE_LENGTH days
    X, y = create_sequences(scaled, labels, SEQUENCE_LENGTH)
    print(f"  Total sequences : {len(X):,}")
    print(f"  Input shape     : {X.shape}")

    # ── Chronological Train/Test Split ────────────────────────────────────────
    # IMPORTANT: We do NOT shuffle here (unlike XGBoost training).
    # The LSTM must see data in time order to learn temporal patterns.
    # First 80% = training, last 20% = test (respects time ordering)
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    print(f"  Train sequences : {len(X_train):,}")
    print(f"  Test sequences  : {len(X_test):,}")

    # ── Build Model ───────────────────────────────────────────────────────────
    print(f"\n  Building LSTM architecture...")
    model = Sequential([
        # Layer 1: Large LSTM — captures short-term patterns
        # return_sequences=True: passes full sequence to next LSTM layer
        LSTM(128, return_sequences=True,
             input_shape=(SEQUENCE_LENGTH, len(available))),
        BatchNormalization(),
        Dropout(0.3),

        # Layer 2: Medium LSTM — captures medium-term patterns
        LSTM(64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.2),

        # Layer 3: Small LSTM — final temporal compression
        # return_sequences=False: outputs single vector (not sequence)
        LSTM(32, return_sequences=False),
        Dropout(0.2),

        # Dense layers — final classification
        Dense(32, activation='relu'),
        BatchNormalization(),
        Dense(16, activation='relu'),

        # Output: single sigmoid neuron
        # >0.5 = predict UP, <0.5 = predict DOWN
        Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    # ── Callbacks ─────────────────────────────────────────────────────────────
    callbacks = [
        # Stop training when val_accuracy stops improving for 8 epochs
        # restore_best_weights: reverts to best epoch weights at end
        EarlyStopping(
            monitor='val_accuracy',
            patience=8,
            restore_best_weights=True,
            mode='max'
        ),
        # Halve learning rate when val_loss plateaus for 4 epochs
        # Helps fine-tune after initial learning
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=4,
            min_lr=1e-6
        )
    ]

    # ── Train ─────────────────────────────────────────────────────────────────
    print(f"  Training LSTM (10-15 minutes)...")
    model.fit(
        X_train, y_train,
        epochs=50,              # Max epochs (EarlyStopping usually stops ~15-20)
        batch_size=32,          # Smaller batches = more gradient updates
        validation_data=(X_test, y_test),
        callbacks=callbacks,
        verbose=1               # Show epoch-by-epoch progress
    )

    # ── Evaluate ──────────────────────────────────────────────────────────────
    # Threshold at 0.5: above = predict UP (1), below = predict DOWN (0)
    y_pred = (model.predict(X_test, verbose=0) > 0.5).astype(int).flatten()
    acc = accuracy_score(y_test, y_pred)
    print(f"\n  Final accuracy  : {acc * 100:.2f}%")
    print(f"  XGBoost baseline: ~73.42% (5-day) — for comparison")

    # ── Save ──────────────────────────────────────────────────────────────────
    # Saved with .keras extension (TensorFlow 2.x native format)
    # NOTE: These models are NOT loaded by app.py — they are saved
    # only for research purposes and future experimentation
    model.save(f"{MODELS_DIR}/lstm_{target_col}.keras")
    joblib.dump(scaler, f"{MODELS_DIR}/lstm_scaler_{target_col}.pkl")
    print(f"  Saved (for reference): lstm_{target_col}.keras")

    return acc


# ── Main Execution ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 52)
    print("  TradeVest — LSTM Experiment (Deprecated)")
    print("  NOTE: XGBoost outperforms LSTM on this dataset")
    print("  See train_boost.py for production models")
    print("=" * 52)

    os.makedirs(MODELS_DIR, exist_ok=True)
    results = {}

    # Train on 5-day first (best chance of good accuracy)
    # then 3-day (harder target)
    # 1-day not included — LSTM performed worst on next-day prediction
    for target, label in [
        ('target_5d', '5-Day'),
        ('target_3d', '3-Day'),
    ]:
        acc = train_lstm(target, label)
        results[label] = acc

    # ── Results Summary ───────────────────────────────────────────────────────
    print("\n" + "=" * 52)
    print("  LSTM EXPERIMENT RESULTS")
    print("=" * 52)
    print(f"  {'Horizon':<12} {'LSTM':>8} {'XGBoost':>10} {'Winner':>8}")
    print(f"  {'-'*42}")

    xgboost_baseline = {'5-Day': 73.42, '3-Day': 65.86}
    for label, acc in results.items():
        xgb = xgboost_baseline.get(label, 0)
        winner = 'XGBoost' if xgb > acc * 100 else 'LSTM'
        print(f"  {label:<12} {acc*100:>7.2f}% {xgb:>9.2f}% {winner:>8}")

    print("=" * 52)
    print("  Conclusion: XGBoost wins on tabular financial data.")
    print("  LSTM models saved for reference only.")
    print("  Production models: models/xgboost_best_*.pkl")
    print("=" * 52)