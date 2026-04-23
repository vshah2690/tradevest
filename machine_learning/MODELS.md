# TradeVest — Model Registry

This document describes every trained model in the `models/` directory,
its purpose, accuracy, and whether it is used in production.

---

## Production Models (used by FastAPI server)

These three models are loaded by `app.py` to serve predictions.

| File | Horizon | Accuracy | Confidence in UI |
|------|---------|----------|-----------------|
| `xgboost_best_1d.pkl` | Intraday (today) | 52.05% | Low — yellow |
| `xgboost_best_3d.pkl` | Short-term (3 days) | 65.86% | Medium — orange |
| `xgboost_best_5d.pkl` | Medium-term (5 days) | 73.42% | High — green |

Each production model has two companion files:
- `xgboost_best_scaler_{horizon}.pkl` — StandardScaler fitted on training data
- `xgboost_best_features_{horizon}.pkl` — List of top 40 selected features

### How to load a production model

```python
import joblib
import pandas as pd

model    = joblib.load('models/xgboost_best_5d.pkl')
scaler   = joblib.load('models/xgboost_best_scaler_5d.pkl')
features = joblib.load('models/xgboost_best_features_5d.pkl')

# Prepare your feature row
X = pd.DataFrame([feature_dict])[features]
X_scaled = scaler.transform(X)

probability = model.predict_proba(X_scaled)[0][1]
signal = 'BUY' if probability > 0.6 else 'SELL' if probability < 0.4 else 'HOLD'
confidence = round(probability * 100, 1)
```

---

## Best Hyperparameters (found by GridSearch)

### Intraday (1-Day)

gamma=0.2, learning_rate=0.07, max_depth=7,
min_child_weight=4, subsample=0.85
CV score: 52.07% | Test score: 52.05%

### Short-term (3-Day)

gamma=0.1, learning_rate=0.09, max_depth=8,
min_child_weight=2, subsample=0.80
CV score: 62.88% | Test score: 65.86%

### Medium-term (5-Day)

gamma=0.1, learning_rate=0.09, max_depth=8,
min_child_weight=2, subsample=0.85
CV score: 70.35% | Test score: 73.42%

---

## Intermediate Models (saved for reference)

These models were saved during the training pipeline.
They are NOT used in production but are available for
experimentation and further development.

| File | Description | Accuracy |
|------|-------------|----------|
| `ensemble_target_1d.pkl` | Voting ensemble (XGBoost v1 + v2) | ~53% |
| `ensemble_target_3d.pkl` | Voting ensemble (XGBoost v1 + v2) | ~61% |
| `ensemble_target_5d.pkl` | Voting ensemble (XGBoost v1 + v2) | ~67% |
| `xgboost_target_1d.pkl` | XGBoost v1 conservative config | ~52% |
| `xgboost_target_3d.pkl` | XGBoost v1 conservative config | ~57% |
| `xgboost_target_5d.pkl` | XGBoost v1 conservative config | ~62% |
| `lgbm_target_1d.pkl` | LightGBM | ~52% |
| `lgbm_target_3d.pkl` | LightGBM | ~57% |
| `lgbm_target_5d.pkl` | LightGBM | ~61% |

---

## Deprecated Models (LSTM experiment)

These models are from the LSTM experiment.
XGBoost outperformed LSTM on this dataset.
See `EXPERIMENTS.md` for full analysis.

| File | Description | Accuracy |
|------|-------------|----------|
| `lstm_target_5d.keras` | Stacked LSTM, 5-day target | 54.65% |
| `lstm_target_3d.keras` | Stacked LSTM, 3-day target | 52.84% |

---

## Top 10 Most Important Features

Consistently ranked highest across all three horizons by XGBoost
feature importance. These features drove the biggest accuracy gains.

| Rank | Feature | Why it matters |
|------|---------|----------------|
| 1 | `ema_21` | Fibonacci EMA — widely watched by traders |
| 2 | `ema_13` | Fibonacci EMA — short-term trend |
| 3 | `ema_55` | Fibonacci EMA — medium-term trend |
| 4 | `close_mean_20` | 20-day rolling average |
| 5 | `close_lag_1` | Yesterday's close price |
| 6 | `bb_upper` | Bollinger Band upper — volatility breakout |
| 7 | `close_lag_7` | Last week's close price |
| 8 | `month` | Seasonal patterns (January effect etc.) |
| 9 | `close_std_20` | 20-day price volatility |
| 10 | `ema_34` | Fibonacci EMA — medium-term |

---

## Accuracy Disclaimer

All accuracy figures are based on historical backtesting.
Real-world forward performance is typically 3-5% lower.
These models provide probabilistic signals, not financial advice.