"""
TradeVest — Model Training Pipeline
=====================================
Purpose:
    Trains and optimises XGBoost + LightGBM classification models for
    three prediction horizons. Uses feature selection, class balancing,
    voting ensemble, and GridSearch hyperparameter tuning to maximise
    accuracy.

Prediction Horizons:
    - Intraday (1-Day)  : Will price close HIGHER today vs yesterday?
                          Accuracy: ~52% — next-day is inherently noisy.
                          Shown in UI as LOW confidence (yellow).

    - Short-term (3-Day): Will price be higher in 3 trading days?
                          Accuracy: ~65.86% — swing trade signal.
                          Shown in UI as MEDIUM confidence (orange).

    - Medium-term (5-Day): Will price be higher in 5 trading days (1 week)?
                           Accuracy: ~73.42% — most reliable signal.
                           Shown in UI as HIGH confidence (green).

    - Long-term           : Future enhancement — will use monthly data.
                           Currently represented by 5-Day model in UI.

Why XGBoost over LSTM for tabular financial data?
    We evaluated both architectures:
    - LSTM  (general model): 51-54% accuracy — worse than coin flip
    - XGBoost (general model): 57-73% accuracy — consistently better
    XGBoost wins on tabular data because each row is independent
    (today's RSI, MACD, volume). LSTM wins on true sequential data
    like speech or text. This aligns with industry practice at quant funds.
    See train_lstm.py for the LSTM experiment (kept for reference).

Training Pipeline Per Horizon:
    1. Load all 24 symbol feature CSVs and combine (~59,000 rows)
    2. Train/test split (80/20) with shuffle=True
    3. StandardScaler normalisation
    4. XGBoost feature selection (keep top 40 of 105 features)
    5. Train 3 models: XGBoost v1, LightGBM, XGBoost v2
    6. Voting ensemble (XGBoost v1 + XGBoost v2, weight 1:2)
    7. GridSearch over 243 parameter combinations
    8. Save best model + scaler + feature list

Final Model Results (GridSearch optimised):
    Horizon      CV Score    Test Score    Model File
    ---------    --------    ----------    ----------
    Intraday     52.07%      52.05%        xgboost_best_1d.pkl
    3-Day        62.88%      65.86%        xgboost_best_3d.pkl
    5-Day        70.35%      73.42%        xgboost_best_5d.pkl

Usage:
    # Full training + GridSearch (~1.5 hours):
    python scripts/train_boost.py

    # To retrain only GridSearch (models already exist):
    # Comment out the main training loop at the bottom of this file

Prerequisites:
    data/*_features.csv must exist — run compute_features.py first

Output:
    models/xgboost_best_1d.pkl        + scaler + features
    models/xgboost_best_3d.pkl        + scaler + features
    models/xgboost_best_5d.pkl        + scaler + features
    models/ensemble_target_*.pkl      + scaler + features  (intermediate)
    models/xgboost_target_*.pkl       (individual XGBoost models)
    models/lgbm_target_*.pkl          (individual LightGBM models)

Author: Viraj Shah, Vrajrajsinh Rathod
Version: 3.0 (final — production ready)
"""

import pandas as pd
import numpy as np
import glob
import os
import joblib
import warnings
warnings.filterwarnings('ignore')

from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.ensemble import VotingClassifier
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler

# ── Configuration ─────────────────────────────────────────────────────────────
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR   = os.path.dirname(SCRIPT_DIR)
DATA_DIR   = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# Number of top features to keep after feature selection.
# We start with 105 features from compute_features.py and let XGBoost
# rank them by importance. Top 40 consistently outperforms using all 105
# because it removes noisy low-importance features.
TOP_FEATURES_COUNT = 40

# All 105 features available from compute_features.py
# Feature selection will reduce this to TOP_FEATURES_COUNT
FEATURES = [
    # ── Raw OHLCV ──────────────────────────────────────────────────────────
    'Open', 'High', 'Low', 'Close', 'Volume',

    # ── Momentum ───────────────────────────────────────────────────────────
    'rsi', 'rsi_6', 'rsi_21',          # RSI at 3 timeframes
    'stoch', 'stoch_signal',            # Stochastic oscillator
    'williams_r',                        # Williams %R
    'roc_5', 'roc_10', 'roc_20',       # Rate of Change

    # ── Trend ──────────────────────────────────────────────────────────────
    'macd', 'macd_signal', 'macd_diff', # MACD components
    'ema_5', 'ema_10', 'ema_20',        # Standard EMAs
    'ema_50', 'ema_200',                # Long-term EMAs

    # ── Fibonacci EMAs (consistently in top-10 feature importance) ─────────
    'ema_8', 'ema_13', 'ema_21',        # Short Fibonacci EMAs
    'ema_34', 'ema_55',                 # Medium Fibonacci EMAs
    'ema8_to_ema13', 'ema13_to_ema21',  # Fibonacci EMA cross ratios
    'ema21_to_ema34', 'ema34_to_ema55', # Fibonacci EMA cross ratios

    # ── Volatility ─────────────────────────────────────────────────────────
    'bb_upper', 'bb_lower',             # Bollinger Band levels
    'bb_width', 'bb_pct',               # Band width and position
    'atr', 'atr_pct',                   # Average True Range

    # ── Volume ─────────────────────────────────────────────────────────────
    'volume_ratio', 'volume_ratio_5',   # Volume vs moving average
    'obv',                              # On-Balance Volume

    # ── Price Returns ──────────────────────────────────────────────────────
    'returns', 'returns_2', 'returns_3',        # Short-term returns
    'returns_5', 'returns_10',                  # Medium-term returns
    'returns_21', 'returns_63',                 # Monthly/quarterly returns
    'log_returns',                              # Log returns (normal distribution)
    'hl_pct', 'oc_pct', 'gap',                 # Intraday range features

    # ── Lag Features (gives model memory of recent prices) ─────────────────
    'close_lag_1', 'close_lag_2', 'close_lag_3',   # Recent close prices
    'close_lag_5', 'close_lag_7',                   # Weekly close prices
    'close_lag_14', 'close_lag_21',                 # Bi-weekly/monthly lags
    'returns_lag_1', 'returns_lag_2', 'returns_lag_3',  # Recent returns
    'returns_lag_7', 'returns_lag_14',              # Weekly return lags

    # ── Rolling Statistics ─────────────────────────────────────────────────
    'close_mean_5', 'close_mean_10', 'close_mean_20',   # Rolling means
    'close_std_5', 'close_std_10', 'close_std_20',      # Rolling volatility
    'returns_mean_5', 'returns_std_5', 'returns_std_20', # Return statistics

    # ── Price Relative to Moving Averages ──────────────────────────────────
    'close_to_ema5', 'close_to_ema20',  # Price distance from short EMAs
    'close_to_ema50', 'close_to_ema200', # Price distance from long EMAs
    'ema5_to_ema20', 'ema20_to_ema50',  # EMA cross signals

    # ── Price Position ─────────────────────────────────────────────────────
    'price_position_5', 'price_position_20',  # Position in N-day range

    # ── Calendar Features ──────────────────────────────────────────────────
    'day_of_week', 'month', 'quarter',  # Seasonal patterns
]

# ── Prediction Horizons ───────────────────────────────────────────────────────
# Each horizon maps to a target column, model filename, and UI display label
HORIZONS = [
    {
        'target':    'target_1d',
        'label':     'Intraday (1-Day)',
        'model_key': '1d',
        'ui_color':  'yellow',
        'note':      'Next-day direction — inherently noisy, shown as low confidence'
    },
    {
        'target':    'target_3d',
        'label':     'Short-term (3-Day)',
        'model_key': '3d',
        'ui_color':  'orange',
        'note':      'Swing trade signal — medium confidence'
    },
    {
        'target':    'target_5d',
        'label':     'Medium-term (5-Day)',
        'model_key': '5d',
        'ui_color':  'green',
        'note':      'Most reliable signal — shown as high confidence'
    },
]

# GridSearch parameter grid — 243 combinations (3^5)
# These ranges are centred around the best params found in previous runs:
# gamma=0.1, learning_rate=0.09, max_depth=8, min_child_weight=2, subsample=0.8
PARAM_GRID = {
    'max_depth':        [6, 7, 8],
    'learning_rate':    [0.05, 0.07, 0.09],
    'min_child_weight': [2, 3, 4],
    'gamma':            [0.1, 0.2, 0.3],
    'subsample':        [0.75, 0.8, 0.85],
}


def load_all_data(target_col):
    """
    Loads and combines feature CSVs for all 24 symbols.

    Args:
        target_col (str): Target column name e.g. 'target_1d'

    Returns:
        pd.DataFrame: Combined dataframe with features + target column
    """
    all_dfs = []
    files = glob.glob(DATA_DIR + '/*_features.csv')

    for f in files:
        try:
            df = pd.read_csv(f, index_col=0)
            # Only use features that exist in this file
            # (handles case where a symbol is missing some features)
            available = [c for c in FEATURES if c in df.columns]
            df = df[available + [target_col]].dropna()
            all_dfs.append(df)
        except Exception:
            pass  # Skip silently — failed symbols logged elsewhere

    combined = pd.concat(all_dfs, ignore_index=True)
    return combined


def get_class_weight(y):
    """
    Computes scale_pos_weight for XGBoost to handle class imbalance.

    Stock markets tend to go up more than down (upward bias) so the DOWN
    class is underrepresented. scale_pos_weight = count(DOWN) / count(UP)
    tells XGBoost to penalise misclassifying DOWN more heavily.

    Args:
        y (pd.Series): Binary target labels (0=DOWN, 1=UP)

    Returns:
        float: Weight ratio for positive class
    """
    count_down = (y == 0).sum()
    count_up = (y == 1).sum()
    return count_down / count_up


def select_features(X_train, y_train, X_test):
    """
    Reduces 105 features to top 40 using XGBoost feature importance.

    Why feature selection?
        - Removes noisy low-importance features that hurt generalisation
        - Speeds up GridSearch significantly (40 vs 105 features)
        - Top 40 consistently outperforms all 105 in cross-validation
        - Fibonacci EMAs (ema_8, ema_13, ema_21, ema_34, ema_55) and
          price lag features dominate the top-10 consistently

    Args:
        X_train (pd.DataFrame): Training features
        y_train (pd.Series)   : Training labels
        X_test  (pd.DataFrame): Test features

    Returns:
        tuple: (X_train_selected, X_test_selected, top_feature_names)
    """
    print("  Running feature selection...")

    # Use a fast XGBoost to rank features by importance
    selector_model = XGBClassifier(
        n_estimators=100,
        random_state=42,
        verbosity=0,
        eval_metric='logloss'
    )
    selector_model.fit(X_train, y_train)

    importances = pd.Series(
        selector_model.feature_importances_,
        index=X_train.columns
    ).sort_values(ascending=False)

    top_features = importances.head(TOP_FEATURES_COUNT).index.tolist()
    print(f"  Selected top {len(top_features)} features")
    print(f"  Top 10: {top_features[:10]}")

    return X_train[top_features], X_test[top_features], top_features


def train_all_models(target_col, label):
    """
    Trains XGBoost v1, LightGBM, XGBoost v2, and a voting ensemble
    for a single prediction horizon.

    Model Architecture:
        Model 1 — XGBoost v1: Conservative config (more regularisation)
            n_estimators=500, max_depth=5, lr=0.02, subsample=0.75
            Purpose: Strong baseline, less prone to overfitting

        Model 2 — LightGBM: Microsoft's gradient boosting
            Similar config to XGBoost v1 but different algorithm
            Usually 1-3% different accuracy — adds diversity to ensemble
            Note: Consistently underperformed XGBoost on this dataset

        Model 3 — XGBoost v2: Aggressive config (deeper trees, faster lr)
            n_estimators=300, max_depth=7, lr=0.05, subsample=0.8
            Purpose: Higher capacity model, best individual performer

        Ensemble — Soft Voting (XGBoost v1 + XGBoost v2, weights 1:2)
            Takes probability average, weighting XGBoost v2 double
            Note: LightGBM excluded from ensemble after experiments showed
            it dragged down ensemble accuracy by ~1-2%

    Args:
        target_col (str): Target column e.g. 'target_1d'
        label      (str): Human readable label e.g. 'Intraday (1-Day)'

    Returns:
        dict: Accuracy scores for each model
              {'xgb': float, 'lgbm': float, 'xgb2': float, 'ensemble': float}
    """
    print(f"\n{'='*55}")
    print(f"  Training {label}")
    print(f"{'='*55}")

    # ── Load Data ─────────────────────────────────────────────────────────────
    df = load_all_data(target_col)
    available = [c for c in FEATURES if c in df.columns]
    X = df[available]
    y = df[target_col]

    print(f"  Total rows:    {len(df):,}")
    print(f"  UP  (target=1): {int((y==1).sum()):,}")
    print(f"  DOWN (target=0): {int((y==0).sum()):,}")

    # ── Train/Test Split ──────────────────────────────────────────────────────
    # shuffle=True: mixes symbols so model doesn't just learn one stock's pattern
    # random_state=42: reproducible splits
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )

    # ── Feature Scaling ───────────────────────────────────────────────────────
    # StandardScaler: (value - mean) / std for each feature
    # Required for feature selection model, also helps XGBoost convergence
    # We fit on train only and transform both — no data leakage
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(
        scaler.fit_transform(X_train), columns=X_train.columns
    )
    X_test_scaled = pd.DataFrame(
        scaler.transform(X_test), columns=X_test.columns
    )

    # ── Feature Selection ─────────────────────────────────────────────────────
    X_train_sel, X_test_sel, top_features = select_features(
        X_train_scaled, y_train, X_test_scaled
    )

    # ── Class Balancing ───────────────────────────────────────────────────────
    # Markets have upward bias — more UP days than DOWN days
    # scale_pos_weight tells XGBoost to treat DOWN misclassification as more costly
    spw = get_class_weight(y_train)
    print(f"  Class weight:  {spw:.3f} (DOWN/UP ratio)")

    # ── Model 1: XGBoost v1 (Conservative) ───────────────────────────────────
    print("\n  [1/4] Training XGBoost v1 (conservative)...")
    xgb = XGBClassifier(
        n_estimators=500,       # More trees, slower learning
        max_depth=5,            # Shallower trees = less overfitting
        learning_rate=0.02,     # Slow learning rate = more robust
        subsample=0.75,         # Use 75% of rows per tree
        colsample_bytree=0.75,  # Use 75% of features per tree
        min_child_weight=5,     # Minimum samples in leaf = regularisation
        gamma=0.1,              # Minimum loss reduction for split
        reg_alpha=0.1,          # L1 regularisation
        reg_lambda=1.5,         # L2 regularisation
        scale_pos_weight=spw,   # Class balance correction
        eval_metric='logloss',
        random_state=42,
        verbosity=0
    )
    xgb.fit(
        X_train_sel, y_train,
        eval_set=[(X_test_sel, y_test)],
        verbose=False
    )
    xgb_acc = accuracy_score(y_test, xgb.predict(X_test_sel))
    print(f"  Accuracy: {xgb_acc*100:.2f}%")

    # ── Model 2: LightGBM ─────────────────────────────────────────────────────
    # Microsoft's gradient boosting — leaf-wise growth vs XGBoost's level-wise
    # Generally faster training, similar or slightly different accuracy
    # Kept for ensemble diversity even though it underperforms XGBoost here
    print("\n  [2/4] Training LightGBM...")
    lgbm = LGBMClassifier(
        n_estimators=500,
        max_depth=5,
        learning_rate=0.02,
        subsample=0.75,
        colsample_bytree=0.75,
        min_child_samples=20,   # LightGBM equivalent of min_child_weight
        reg_alpha=0.1,
        reg_lambda=1.5,
        scale_pos_weight=spw,
        random_state=42,
        verbose=-1              # Suppress LightGBM's verbose output
    )
    lgbm.fit(X_train_sel, y_train)
    lgbm_acc = accuracy_score(y_test, lgbm.predict(X_test_sel))
    print(f"  Accuracy: {lgbm_acc*100:.2f}%")

    # ── Model 3: XGBoost v2 (Aggressive) ─────────────────────────────────────
    # Higher capacity config — deeper trees, faster learning rate
    # Consistently our best individual model, especially on 3-day and 5-day
    print("\n  [3/4] Training XGBoost v2 (aggressive)...")
    xgb2 = XGBClassifier(
        n_estimators=300,       # Fewer trees but deeper
        max_depth=7,            # Deeper trees = more complex patterns
        learning_rate=0.05,     # Faster learning rate
        subsample=0.8,
        colsample_bytree=0.6,   # Use 60% of features — more randomness
        min_child_weight=3,
        gamma=0.2,
        scale_pos_weight=spw,
        eval_metric='logloss',
        random_state=123,       # Different seed for diversity
        verbosity=0
    )
    xgb2.fit(
        X_train_sel, y_train,
        eval_set=[(X_test_sel, y_test)],
        verbose=False
    )
    xgb2_acc = accuracy_score(y_test, xgb2.predict(X_test_sel))
    print(f"  Accuracy: {xgb2_acc*100:.2f}%")

    # ── Voting Ensemble ───────────────────────────────────────────────────────
    # Soft voting: averages predicted probabilities from each model
    # XGBoost v2 gets weight=2 (double) since it's our strongest model
    # LightGBM excluded: experiments showed it reduced ensemble accuracy 1-2%
    #
    # EXPERIMENT NOTE: We also tested 3-model ensemble (xgb + lgbm + xgb2)
    # with equal weights but it consistently underperformed the 2-model
    # ensemble with weighted xgb2. The commented code below is preserved
    # for reference if you want to experiment further:
    #
    # ensemble = VotingClassifier(
    #     estimators=[('xgb', xgb), ('lgbm', lgbm), ('xgb2', xgb2)],
    #     voting='soft'
    # )
    print("\n  [4/4] Training Voting Ensemble (XGBoost v1 + v2, weight 1:2)...")
    ensemble = VotingClassifier(
        estimators=[
            ('xgb', xgb),
            ('xgb2', xgb2)
        ],
        voting='soft',
        weights=[1, 2]
    )
    ensemble.fit(X_train_sel, y_train)
    ens_pred = ensemble.predict(X_test_sel)
    ens_acc = accuracy_score(y_test, ens_pred)
    print(f"  Accuracy: {ens_acc*100:.2f}%")

    # Print full classification report for ensemble
    print(f"\n  Classification Report — Ensemble ({label}):")
    print(classification_report(y_test, ens_pred, target_names=['DOWN', 'UP']))

    # Identify best performing model
    all_accs = [xgb_acc, lgbm_acc, xgb2_acc, ens_acc]
    all_names = ['XGBoost v1', 'LightGBM', 'XGBoost v2', 'Ensemble']
    best_acc = max(all_accs)
    best_name = all_names[all_accs.index(best_acc)]
    print(f"  Best model: {best_name} at {best_acc*100:.2f}%")

    # ── Save Models ───────────────────────────────────────────────────────────
    # Save ensemble as primary model for this horizon
    joblib.dump(ensemble, f"{MODELS_DIR}/ensemble_{target_col}.pkl")
    joblib.dump(scaler,   f"{MODELS_DIR}/ensemble_scaler_{target_col}.pkl")
    joblib.dump(top_features, f"{MODELS_DIR}/features_{target_col}.pkl")

    # Save individual models for analysis and future experimentation
    joblib.dump(xgb,  f"{MODELS_DIR}/xgboost_{target_col}.pkl")
    joblib.dump(lgbm, f"{MODELS_DIR}/lgbm_{target_col}.pkl")

    print(f"  Models saved to {MODELS_DIR}/")

    return {
        'xgb': xgb_acc,
        'lgbm': lgbm_acc,
        'xgb2': xgb2_acc,
        'ensemble': ens_acc
    }


def run_gridsearch(target_col, model_key, label):
    """
    Runs GridSearchCV to find optimal hyperparameters for a given horizon.

    Why GridSearch after initial training?
        Initial training uses hand-tuned parameters. GridSearch
        systematically tries 243 combinations (3^5 grid) to find
        the global optimum. This added ~5-10% accuracy on each horizon.

    GridSearch Best Results:
        1-Day : gamma=0.2, lr=0.07, max_depth=7, min_child=4, sub=0.85 → 52.05%
        3-Day : gamma=0.1, lr=0.09, max_depth=8, min_child=2, sub=0.80 → 65.86%
        5-Day : gamma=0.1, lr=0.09, max_depth=8, min_child=2, sub=0.85 → 73.42%

    Args:
        target_col (str): Target column e.g. 'target_5d'
        model_key  (str): Short key for filenames e.g. '5d'
        label      (str): Human readable label for logging

    Returns:
        float: Best test accuracy achieved
    """
    print(f"\n{'='*55}")
    print(f"  GridSearch — {label}")
    print(f"{'='*55}")

    # Load and prepare data
    df = load_all_data(target_col)
    available = [c for c in FEATURES if c in df.columns]
    X = df[available]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, shuffle=True
    )

    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(
        scaler.fit_transform(X_train), columns=X_train.columns
    )
    X_test_scaled = pd.DataFrame(
        scaler.transform(X_test), columns=X_test.columns
    )

    X_train_sel, X_test_sel, top_features = select_features(
        X_train_scaled, y_train, X_test_scaled
    )

    spw = get_class_weight(y_train)

    # Base model — same architecture as XGBoost v2 which performed best
    base_model = XGBClassifier(
        n_estimators=300,
        colsample_bytree=0.6,
        scale_pos_weight=spw,
        eval_metric='logloss',
        random_state=123,
        verbosity=0
    )

    print(f"  Trying {len(PARAM_GRID['max_depth']) * len(PARAM_GRID['learning_rate']) * len(PARAM_GRID['min_child_weight']) * len(PARAM_GRID['gamma']) * len(PARAM_GRID['subsample'])} parameter combinations...")
    print(f"  This takes ~20 minutes per horizon...")

    # n_jobs=-1: use all CPU cores in parallel
    # cv=3: 3-fold cross-validation per combination
    # scoring='accuracy': optimise for raw accuracy
    grid = GridSearchCV(
        base_model,
        PARAM_GRID,
        cv=3,
        scoring='accuracy',
        n_jobs=-1,
        verbose=1
    )
    grid.fit(X_train_sel, y_train)

    print(f"\n  Best params : {grid.best_params_}")
    print(f"  CV score    : {grid.best_score_*100:.2f}%")

    best_model = grid.best_estimator_
    y_pred = best_model.predict(X_test_sel)
    test_acc = accuracy_score(y_test, y_pred)
    print(f"  Test score  : {test_acc*100:.2f}%")

    # Save the GridSearch-optimised model — this is what the FastAPI uses
    joblib.dump(best_model,  f"{MODELS_DIR}/xgboost_best_{model_key}.pkl")
    joblib.dump(scaler,      f"{MODELS_DIR}/xgboost_best_scaler_{model_key}.pkl")
    joblib.dump(top_features, f"{MODELS_DIR}/xgboost_best_features_{model_key}.pkl")
    print(f"  Saved: xgboost_best_{model_key}.pkl")

    return test_acc


# ── Main Execution ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("  TradeVest — Model Training Pipeline")
    print("  Horizons: Intraday | 3-Day | 5-Day")
    print("  Models: XGBoost + LightGBM + Ensemble + GridSearch")
    print("=" * 55)

    os.makedirs(MODELS_DIR, exist_ok=True)

    # ── Phase 1: Initial Training ─────────────────────────────────────────────
    # Trains all 3 models + ensemble for each horizon
    # Takes ~20-30 minutes total
    # To skip this phase and run GridSearch only:
    # Comment out this block and the summary print below
    print("\n  PHASE 1: Initial Training")
    print("  " + "-" * 40)

    all_results = {}
    for horizon in HORIZONS:
        results = train_all_models(horizon['target'], horizon['label'])
        all_results[horizon['label']] = results

    # Print comparison table
    print("\n" + "=" * 55)
    print("  PHASE 1 RESULTS SUMMARY")
    print("=" * 55)
    print(f"  {'Model':<14} {'Intraday':>10} {'3-Day':>8} {'5-Day':>8}")
    print(f"  {'-'*42}")
    for model_name in ['xgb', 'lgbm', 'xgb2', 'ensemble']:
        row = f"  {model_name:<14}"
        for horizon in HORIZONS:
            acc = all_results[horizon['label']][model_name]
            row += f" {acc*100:>7.2f}%"
        print(row)
    print("=" * 55)

    # ── Phase 2: GridSearch Optimisation ─────────────────────────────────────
    # Finds optimal hyperparameters for each horizon
    # Takes ~20 minutes per horizon (~60 minutes total)
    # These are the models saved as xgboost_best_*.pkl
    # and used by the FastAPI prediction server
    print("\n  PHASE 2: GridSearch Hyperparameter Optimisation")
    print("  " + "-" * 40)

    gridsearch_results = {}
    for horizon in HORIZONS:
        acc = run_gridsearch(
            horizon['target'],
            horizon['model_key'],
            horizon['label']
        )
        gridsearch_results[horizon['label']] = acc

    # ── Final Summary ─────────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("  FINAL RESULTS — GRIDSEARCH OPTIMISED MODELS")
    print("=" * 55)
    for horizon in HORIZONS:
        label = horizon['label']
        acc = gridsearch_results[label]
        bar = "█" * int(acc * 40)
        conf = "LOW" if acc < 0.55 else "MEDIUM" if acc < 0.65 else "HIGH"
        print(f"  {label:<22} {acc*100:.2f}%  [{conf}]  {bar}")
    print("=" * 55)
    print("  Models saved to models/xgboost_best_*.pkl")
    print("  Next step: python app.py (FastAPI server)")
    print("=" * 55)