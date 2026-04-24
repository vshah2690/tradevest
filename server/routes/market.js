/**
 * TradeVest — Market Data Routes
 * ================================
 * Endpoints for live price quotes and historical chart data.
 * Proxies requests to the FastAPI ML server to avoid exposing
 * the ML API directly to the frontend.
 */

const express = require('express')
const axios   = require('axios')
const router  = express.Router()

const ML_API = process.env.ML_API_URL || 'http://localhost:5001'

// GET /api/market/quote/:symbol
// Returns live price + AI signal for a symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const response = await axios.get(`${ML_API}/predict/${symbol}`, {
      timeout: 15000
    })
    res.json(response.data)
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: `Symbol not found: ${req.params.symbol}` })
    }
    res.status(500).json({ error: 'Failed to fetch market data' })
  }
})

// GET /api/market/history/:symbol
// Returns real historical price data for charting
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const response = await axios.get(
      `${ML_API}/history/${symbol}`,
      { timeout: 15000 }
    )
    res.json(response.data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})


// GET /api/market/symbols
// Returns the default watchlist symbols
router.get('/symbols', (req, res) => {
  res.json({
    indian: [
      { symbol: 'TCS.NS',       name: 'Tata Consultancy Services' },
      { symbol: 'INFY.NS',      name: 'Infosys' },
      { symbol: 'RELIANCE.NS',  name: 'Reliance Industries' },
      { symbol: 'HDFCBANK.NS',  name: 'HDFC Bank' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
      { symbol: 'WIPRO.NS',     name: 'Wipro' },
      { symbol: 'ADANIENT.NS',  name: 'Adani Enterprises' },
      { symbol: 'MARUTI.NS',    name: 'Maruti Suzuki' },
    ],
    us: [
      { symbol: 'AAPL',  name: 'Apple Inc' },
      { symbol: 'MSFT',  name: 'Microsoft' },
      { symbol: 'NVDA',  name: 'NVIDIA' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'TSLA',  name: 'Tesla' },
      { symbol: 'AMZN',  name: 'Amazon' },
      { symbol: 'META',  name: 'Meta Platforms' },
      { symbol: 'AMD',   name: 'AMD' },
    ]
  })
})

module.exports = router