import pandas as pd
import numpy as np
import glob
import os
import joblib
import warnings
warnings.filterwarnings('ignore')

from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR   = os.path.dirname(SCRIPT_DIR)
DATA_DIR   = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# v1 features — 67 features.
# Missing Fibonacci EMAs (ema_8, ema_13, ema_21, ema_34, ema_55) and
# extended lags (close_lag_7, 14, 21) that were added in v2.
# These additions in v2 boosted 5-day accuracy from 62% to 73%.
FEATURES = [
    # Raw OHLCV
    'Open', 'High', 'Low', 'Close', 'Volume',

    # Momentum
    'rsi', 'rsi_6', 'rsi_21',
    'stoch', 'stoch_signal',
    'williams_r',
    'roc_5', 'roc_10', 'roc_20',

    # Trend
    'macd', 'macd_signal', 'macd_diff',
    'ema_5', 'ema_10', 'ema_20', 'ema_50', 'ema_200',

    # Volatility
    'bb_upper', 'bb_lower', 'bb_width', 'bb_pct',
    'atr', 'atr_pct',

    # Volume
    'volume_ratio', 'volume_ratio_5', 'obv',

    # Returns
    'returns', 'returns_2', 'returns_3', 'returns_5', 'returns_10',
    'log_returns', 'hl_pct', 'oc_pct', 'gap',

    # Lags (short only — v2 adds 7,14,21 day lags)
    'close_lag_1', 'close_lag_2', 'close_lag_3', 'close_lag_5',
    'returns_lag_1', 'returns_lag_2', 'returns_lag_3',

    # Rolling stats
    'close_mean_5', 'close_mean_10', 'close_mean_20',
    'close_std_5', 'close_std_10', 'close_std_20',
    'returns_mean_5', 'returns_std_5', 'returns_std_20',

    # MA ratios
    'close_to_ema5', 'close_to_ema20',
    'close_to_ema50', 'close_to_ema200',
    'ema5_to_ema20', 'ema20_to_ema50',

    # Price position
    'price_position_5', 'price_position_20',

    # Calendar
    'day_of_week', 'month', 'quarter',
]

# Three prediction horizons trained in one run.
# Key: target column → (model filename, scaler filename, display label)
TARGETS = {
    'target_1d': ('xgboost_1d', 'xgboost_scaler_1d', 'Intraday (1-Day)'),
    'target_3d': ('xgboost_3d', 'xgboost_scaler_3d', 'Short-term (3-Day)'),
    'target_5d': ('xgboost_5d', 'xgboost_scaler_5d', 'Medium-term (5-Day)'),
}


def load_all_data(target_col):
    """
    Loads and combines feature CSVs for all symbols.

    Args:
        target_col (str): Target column name e.g. 'target_1d'

    Returns:
        pd.DataFrame: Combined dataframe with features + target
    """
    all_dfs = []
    files = glob.glob(DATA_DIR + '/*_features.csv')

    for f in files:
        try:
            df = pd.read_csv(f, index_col=0)
            # Only use features present in this file
            available = [c for c in FEATURES if c in df.columns]
            df = df[available + [target_col]].dropna()
            all_dfs.append(df)
        except Exception:
            pass  # Skip silently — symbol may be missing some features

    combined = pd.concat(all_dfs, ignore_index=True)
    return combined


def train_model(target_col, model_name, scaler_name, label):
    """
    Trains a single XGBoost model for one prediction horizon.

    Note: This v1 implementation does NOT use:
        - class balancing (scale_pos_weight) — causes DOWN recall bias
        - feature selection — uses all 67 features
        - GridSearch — uses hand-tuned parameters only
    These limitations are addressed in train_boost.py v2.

    Args:
        target_col  (str): Target column e.g. 'target_1d'
        model_name  (str): Output filename e.g. 'xgboost_1d'
        scaler_name (str): Scaler filename e.g. 'xgboost_scaler_1d'
        label       (str): Display label e.g. 'Intraday (1-Day)'

    Returns:
        float: Test accuracy
    """
    print(f"\n{'='*52}")
    print(f"  XGBoost v1 — {label}")
    print(f"{'='*52}")

    df = load_all_data(target_col)
    available = [c for c in FEATURES if c in df.columns]
    X = df[available]
    y = df[target_col]

    print(f"  Total rows  : {len(df):,}")

    # 80/20 split with shuffle — mixes symbols for generalisation
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )
    print(f"  Train size  : {len(X_train):,}")
    print(f"  Test size   : {len(X_test):,}")

    # StandardScaler normalisation
    # Note: v1 uses numpy arrays, v2 uses DataFrames to preserve
    # column names for feature selection
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # v1 XGBoost config — conservative baseline parameters
    # v2 uses deeper trees (max_depth=7-8) and slower lr (0.02-0.09)
    # plus scale_pos_weight for class balance
    print(f"  Training XGBoost v1...")
    model = XGBClassifier(
        n_estimators=200,       # v2 uses 300-500
        max_depth=6,            # v2 uses 7-8 (GridSearch optimised)
        learning_rate=0.05,     # v2 uses 0.02-0.09 (GridSearch optimised)
        subsample=0.8,
        colsample_bytree=0.8,   # v2 uses 0.6 (more feature randomness)
        eval_metric='logloss',
        random_state=42,
        verbosity=0
        # Missing: scale_pos_weight — causes UP bias (81% recall vs 34% DOWN)
        # Added in v2 to fix class imbalance
    )

    model.fit(
        X_train_scaled, y_train,
        eval_set=[(X_test_scaled, y_test)],
        verbose=False
    )

    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"  Accuracy    : {accuracy * 100:.2f}%")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['DOWN', 'UP']))

    # Save — these files are NOT used by the production server
    # Production uses xgboost_best_*.pkl from train_boost.py
    joblib.dump(model,  f"{MODELS_DIR}/{model_name}.pkl")
    joblib.dump(scaler, f"{MODELS_DIR}/{scaler_name}.pkl")
    print(f"  Saved: {model_name}.pkl (baseline reference only)")

    return accuracy


# ── Main Execution ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 52)
    print("  TradeVest — XGBoost v1 Baseline")
    print("  NOTE: Superseded by train_boost.py")
    print("  Production models: xgboost_best_*.pkl")
    print("=" * 52)

    os.makedirs(MODELS_DIR, exist_ok=True)
    results = {}

    for target_col, (model_name, scaler_name, label) in TARGETS.items():
        acc = train_model(target_col, model_name, scaler_name, label)
        results[label] = acc

    # ── Results vs Production Comparison ─────────────────────────────────────
    production_accs = {
        'Intraday (1-Day)':    52.05,
        'Short-term (3-Day)':  65.86,
        'Medium-term (5-Day)': 73.42,
    }

    print("\n" + "=" * 55)
    print("  v1 BASELINE vs v2 PRODUCTION COMPARISON")
    print("=" * 55)
    print(f"  {'Horizon':<22} {'v1 (this)':>10} {'v2 (prod)':>10} {'Gain':>8}")
    print(f"  {'-'*52}")
    for label, acc in results.items():
        prod = production_accs.get(label, 0)
        gain = prod - acc * 100
        print(f"  {label:<22} {acc*100:>9.2f}% {prod:>9.2f}% {gain:>+7.2f}%")
    print("=" * 55)
    print("  For production models, run: train_boost.py")
    print("=" * 55)