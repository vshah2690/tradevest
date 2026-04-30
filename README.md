# TradeVest — AI-Powered Stock Prediction Platform

![TradeVest](https://img.shields.io/badge/TradeVest-AI%20Trading-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![XGBoost](https://img.shields.io/badge/XGBoost-73.42%25-orange?style=for-the-badge)

> AI-powered stock prediction platform that analyses any stock globally and predicts price direction using machine learning trained on 10 years of market data.

---

## Live Demo

🌐 **[tradevest.vercel.app](https://tradevest.vercel.app)**

---

## What TradeVest Does

TradeVest lets users search any stock globally, get AI-powered BUY/SELL/HOLD predictions, and track whether those predictions come true over time.

**Core features:**
- Search 9,457+ stocks across NSE, BSE, NYSE, NASDAQ and more
- AI predictions for 3 time horizons — intraday, 3-day, 5-day
- Plain English verdict — "Likely to go UP" not just "BUY 73%"
- Track predictions and verify AI accuracy over time
- Personal watchlist saved per user
- Real historical price charts (6 months)
- Live price updates via WebSocket

---

## Architecture

┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│         Vite + Zustand + Recharts + TailwindCSS      │
└──────────────────────┬──────────────────────────────┘
│ REST + WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  Node.js Backend                     │
│           Express + MongoDB Atlas + JWT              │
└──────────────────────┬──────────────────────────────┘
│ HTTP
┌──────────────────────▼──────────────────────────────┐
│               FastAPI ML Server                      │
│         XGBoost + yfinance + ta-lib                  │
└─────────────────────────────────────────────────────┘

---

## ML Model Performance

| Horizon | Accuracy | Confidence |
|---------|----------|------------|
| Intraday (1-day) | 52.05% | Low |
| Short-term (3-day) | 65.86% | Medium |
| Medium-term (5-day) | **73.42%** | **High** |

**Training data:** 25 stocks × 10 years daily OHLCV data  
**Features:** 105 technical indicators including Fibonacci EMAs, RSI, MACD, Bollinger Bands  
**Algorithm:** XGBoost with GridSearch optimisation (243 parameter combinations)  
**Experiment log:** See `machine_learning/EXPERIMENTS.md`

---

## Tech Stack

### Machine Learning
- **Python 3.12** — core language
- **XGBoost** — gradient boosting classifier
- **yfinance** — live and historical market data
- **ta (Technical Analysis)** — 105 feature indicators
- **FastAPI** — ML prediction microservice
- **scikit-learn** — preprocessing, GridSearch, metrics
- **pandas / numpy** — data pipeline

### Backend
- **Node.js + Express** — REST API
- **MongoDB Atlas** — user data, watchlists, tracked predictions
- **JWT** — authentication
- **WebSocket (ws)** — live price streaming
- **axios** — FastAPI proxy

### Frontend
- **React 18 + Vite** — UI framework
- **Zustand** — global state management
- **Recharts** — price charts
- **IBM Plex Mono + Outfit** — typography

---

## Project Structure

tradevest/
├── machine_learning/          # Python ML pipeline
│   ├── app.py                 # FastAPI prediction server
│   ├── models/                # Trained XGBoost models
│   ├── data/                  # Feature CSVs + search index
│   ├── scripts/
│   │   ├── download_data.py   # Historical data pipeline
│   │   ├── compute_features.py # 105 feature engineering
│   │   ├── train_boost.py     # XGBoost + GridSearch
│   │   ├── build_search_index.py # 9,457 stock index
│   │   ├── train_lstm.py      # LSTM experiment (deprecated)
│   │   └── train_xgboost.py   # Baseline experiment (superseded)
│   ├── MODELS.md              # Model registry
│   └── EXPERIMENTS.md         # Full experiment log
│
├── server/                    # Node.js backend
│   ├── index.js               # Express + WebSocket server
│   ├── routes/
│   │   ├── auth.js            # JWT register/login
│   │   ├── market.js          # Price + history + search
│   │   ├── predict.js         # ML prediction proxy
│   │   ├── watchlist.js       # Personal watchlist
│   │   ├── track.js           # Track AI predictions
│   │   └── ai.js              # Claude + OpenAI (pending credits)
│   ├── models/
│   │   ├── User.js
│   │   ├── Watchlist.js
│   │   ├── TrackedPrediction.js
│   │   └── Trade.js
│   └── middleware/
│       └── auth.js            # JWT verification
│
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # Navbar, Sidebar
│   │   │   ├── chart/         # PriceChart
│   │   │   ├── ai/            # SignalPanel
│   │   │   ├── trading/       # OrderPanel, PortfolioPanel
│   │   │   ├── auth/          # AuthModal
│   │   │   └── search/        # StockSearch
│   │   ├── store/             # Zustand global state
│   │   ├── hooks/             # useWebSocket, usePrediction
│   │   └── services/          # API calls
│   └── public/
│
└── README.md

---

## Running Locally

### Prerequisites
- Python 3.12
- Node.js 18+
- MongoDB Atlas account (free tier)

### 1 — Clone the repo
```bash
git clone https://github.com/vshah2690/tradevest.git
cd tradevest
```

### 2 — Set up ML server
```bash
cd machine_learning
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 5001 --reload
```

### 3 — Set up Node.js backend
```bash
cd server
npm install
# Create .env file (see .env.example)
npm run dev
```

### 4 — Set up React frontend
```bash
cd client
npm install
# Create .env file (see .env.example)
npm run dev
```

### 5 — Open the app
Visit `http://localhost:5173`

---

## Environment Variables

### `server/.env`

PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
ML_API_URL=http://localhost:5001
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

### `client/.env`

VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000

---

## ML Experiment Journey

The model went through 5 iterations before reaching 73.42% accuracy:

| Version | Accuracy | Key Change |
|---------|----------|------------|
| v0 Baseline | 60.28% | First working XGBoost |
| v1 Multi-horizon | 53-62% | 10yr data + 67 features |
| LSTM experiment | 52-54% | Neural network attempt |
| v2 + Fibonacci EMAs | 68.18% | 5 new Fibonacci features |
| **GridSearch final** | **73.42%** | 243 param combinations |

Full experiment log: `machine_learning/EXPERIMENTS.md`

---

## Key Design Decisions

**Why XGBoost over LSTM?**  
LSTMs underperformed (51-54%) on our tabular financial data. XGBoost excels at the 105 engineered features we computed. This is consistent with industry practice — most quant funds use gradient boosting for price prediction.

**Why 5-day predictions are most accurate?**  
Longer horizons capture stronger trend signals. 1-day prediction is near the theoretical ceiling for technical-indicator-only models (~52-55%).

**Why yfinance?**  
Free, covers 50,000+ global tickers, sufficient for demo. Production upgrade path: Zerodha Kite API (India) or Polygon.io (US) for real-time data.

---

## Future Enhancements

- [ ] Long-term predictions (1-month, 3-month) — code ready, needs retraining
- [ ] Claude + OpenAI chat integration — backend built, needs API credits
- [ ] News sentiment analysis — estimated +8-12% accuracy boost
- [ ] Stock-specific models for top 50 most traded stocks
- [ ] Mobile app (React Native)
- [ ] Zerodha Kite API for real-time Indian prices

---

## Disclaimer

TradeVest is an educational project. All predictions are AI-generated estimates based on historical patterns. This is not financial advice. Never make real investment decisions based solely on AI predictions.

---

## Author

**Viraj Shah**  
[GitHub](https://github.com/vshah2690) · [LinkedIn](https://linkedin.com/in/virajshah)

**Vrajrajsinh Rathod**
[GitHub](https://github.com/Vrajrajsinh-Rathod) · [LinkedIn](https://www.linkedin.com/in/vrajrajsinh/)
