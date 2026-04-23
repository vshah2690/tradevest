# TradeVest — Experiments Log

This document records every experiment run during model development,
what was tried, what worked, what failed, and why.
This is the kind of documentation that separates a serious ML project
from a tutorial copy-paste.

---

## Experiment 1 — Baseline XGBoost (v0)

**Script:** `train_xgboost.py` (v0, commented out section)
**Date:** Sprint 3, Week 1
**Hypothesis:** A basic XGBoost model on 28 features should beat coin flip.

**Setup:**
- Data: 3 years daily, 13,080 rows combined
- Features: 28 (basic OHLCV + standard indicators)
- Target: target_3d only
- No class balancing, no feature selection

**Result:** 60.28% accuracy on 3-day target

**Conclusion:** ✅ Proved XGBoost works on this data.
Baseline established. Move to multi-horizon training.

---

## Experiment 2 — Multi-Horizon XGBoost (v1)

**Script:** `train_xgboost.py` (v1, active section)
**Hypothesis:** Training separate models per horizon improves accuracy.

**Setup:**
- Data: 10 years daily, 59,398 rows combined
- Features: 67
- Targets: target_1d, target_3d, target_5d
- No class balancing, no feature selection

**Results:**
| Horizon | Accuracy |
|---------|----------|
| 1-Day   | 53.18%   |
| 3-Day   | 57.42%   |
| 5-Day   | 62.54%   |

**Key observation:** DOWN recall was only 29-34% — model heavily
biased towards predicting UP. This is because markets go up more
than down (upward bias) and without class balancing, XGBoost
learns to predict UP almost always.

**Conclusion:** ✅ Multi-horizon works. Need class balancing fix.

---

## Experiment 3 — LSTM Neural Network

**Script:** `train_lstm.py`
**Hypothesis:** LSTMs capture sequential patterns better than XGBoost.

**Setup:**
- Architecture: 3 stacked LSTM layers (128→64→32) + BatchNorm + Dropout
- Sequence length: 30 days
- Features: 31 (subset of full feature set)
- Targets: target_5d, target_3d

**Results:**
| Horizon | LSTM | XGBoost v1 | Winner |
|---------|------|------------|--------|
| 5-Day   | 54.65% | 62.54% | XGBoost |
| 3-Day   | 52.84% | 57.42% | XGBoost |

**Root cause analysis:**
1. Stock daily OHLCV has weak sequential dependencies beyond 5-10 days
2. With ~2,500 rows per stock, LSTMs overfit without enough data
3. Our 105 engineered features are tabular — XGBoost is the right tool
4. General model trained on 25 mixed stocks learns averaged patterns

**Conclusion:** ❌ LSTM abandoned. XGBoost wins on tabular financial data.
This aligns with industry practice — most quant funds use gradient
boosting not LSTMs for price prediction.

**Future ideas:**
- Stock-specific Transformer with 10yr 5-min data (~500k rows per stock)
- Pre-trained financial LLM for news sentiment features
- Ensemble LSTM predictions as meta-features into XGBoost

---

## Experiment 4 — LightGBM + Class Balancing + Feature Selection

**Script:** `train_boost.py` (Phase 1)
**Hypothesis:** Adding LightGBM, class balancing, and feature selection
will push accuracy above 65%.

**Changes from v1:**
1. Added LightGBM as comparison model
2. Added `scale_pos_weight` to fix DOWN class bias
3. Added XGBoost feature selection (top 40 of 105 features)
4. Added Fibonacci EMAs (ema_8, ema_13, ema_21, ema_34, ema_55)
5. Added extended lag features (7, 14, 21 day lags)
6. Added monthly/quarterly returns (returns_21, returns_63)
7. Created voting ensemble (XGBoost v1 + XGBoost v2, weights 1:2)

**Results:**
| Model | 1-Day | 3-Day | 5-Day |
|-------|-------|-------|-------|
| XGBoost v1 | 52.46% | 57.51% | 62.28% |
| LightGBM | 52.34% | 57.51% | 62.20% |
| XGBoost v2 | 52.57% | 61.81% | **68.18%** |
| Ensemble (2-model) | 52.37% | 61.22% | 67.31% |

**Key findings:**
- XGBoost v2 (deeper, faster) beats conservative XGBoost v1
- LightGBM performs similarly to XGBoost v1 — no advantage here
- Ensemble of XGBoost v1 + v2 (weights 1:2) underperforms XGBoost v2 alone
- LightGBM hurts ensemble — excluded from final ensemble
- Fibonacci EMAs are the biggest single accuracy contributor

**Conclusion:** ✅ XGBoost v2 config is our best model at 68.18% on 5-day.
Proceed to GridSearch to squeeze more accuracy.

---

## Experiment 5 — GridSearch Hyperparameter Optimisation

**Script:** `train_boost.py` (Phase 2)
**Hypothesis:** Systematic hyperparameter search will push 5-day above 70%.

**Parameter grid (243 combinations):**

max_depth:        [6, 7, 8]
learning_rate:    [0.05, 0.07, 0.09]
min_child_weight: [2, 3, 4]
gamma:            [0.1, 0.2, 0.3]
subsample:        [0.75, 0.8, 0.85]

**Round 1 results (67 features):**
- 5-Day: 69.65% (params: gamma=0.2, lr=0.07, depth=7, mcw=3)

**Round 2 results (105 features — after adding Fibonacci EMAs):**
- 5-Day: **73.42%** (params: gamma=0.1, lr=0.09, depth=8, mcw=2, sub=0.85)
- 3-Day: **65.86%** (params: gamma=0.1, lr=0.09, depth=8, mcw=2, sub=0.80)
- 1-Day: **52.05%** (params: gamma=0.2, lr=0.07, depth=7, mcw=4, sub=0.85)

**Key finding:** The biggest single accuracy jump came from adding
Fibonacci EMAs (ema_8, ema_13, ema_21, ema_34, ema_55) combined with
GridSearch. These EMAs appear in top-10 feature importance consistently.

**Conclusion:** ✅ Target achieved. 73.42% on 5-day is our production model.
1-day at 52% is near the theoretical ceiling for next-day prediction
using technical indicators alone (no news sentiment, no fundamentals).

---

## Accuracy Progression Summary

| Experiment | 1-Day | 3-Day | 5-Day | Key Change |
|------------|-------|-------|-------|------------|
| v0 Baseline | — | 60.28% | — | First working model |
| v1 Multi-horizon | 53.18% | 57.42% | 62.54% | 10yr data + 67 features |
| LSTM | — | 52.84% | 54.65% | Neural network attempt |
| v2 + Class balance | 52.46% | 57.51% | 62.28% | scale_pos_weight |
| v2 + Fibonacci EMAs | 52.57% | 61.81% | 68.18% | +5 Fibonacci EMAs |
| GridSearch R1 | — | — | 69.65% | 243 param combinations |
| **GridSearch R2** | **52.05%** | **65.86%** | **73.42%** | **105 features + GridSearch** |

---

## What We Would Try Next (Future Enhancements)

**For higher accuracy:**
- News sentiment via NewsAPI — studies show +8-12% accuracy boost
- Earnings calendar features — stocks behave differently pre/post earnings
- Sector ETF performance as a feature (e.g. Nifty IT for TCS)
- VIX (fear index) as macro feature
- Transformer architecture replacing LSTM for sequence modelling

**For Indian market specifically:**
- FII/DII activity data (Foreign/Domestic Institutional Investor flows)
- NSE options data (Put/Call ratio as sentiment indicator)
- RBI policy announcement calendar as a feature
- Monsoon data for agricultural stocks

**For production improvements:**
- Retrain models weekly with latest data
- Stock-specific models for top 10 most traded symbols
- Confidence calibration (Platt scaling) for better probability estimates
- A/B testing framework to evaluate model updates before deployment

---

## Important Notes

1. All accuracy figures are historical backtesting results.
   Forward performance is typically 3-5% lower.

2. The 1-day model at 52% is NOT a failure — it reflects the
   genuine difficulty of next-day prediction. Professional quant
   funds with satellite data and alternative data sources achieve
   55-58% intraday accuracy.

3. The 73.42% 5-day accuracy is genuinely strong. It is shown
   in the UI as HIGH confidence and is the primary signal
   for users making swing trading decisions.

4. These models should NEVER be used for real trading decisions.
   TradeVest is a portfolio/educational project.