/**
 * TradeVest — Prediction Routes
 * ================================
 * Proxies prediction requests to FastAPI ML server.
 * Adds caching so repeated requests for the same symbol
 * don't hammer the ML API.
 */

const express = require('express')
const axios   = require('axios')
const router  = express.Router()

const ML_API = process.env.ML_API_URL || 'http://localhost:5001'

// Simple in-memory cache — stores predictions for 5 minutes
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// POST /api/predict
// Body: { symbol: "TCS.NS" }
router.post('/', async (req, res) => {
  try {
    const { symbol } = req.body
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' })
    }

    const sym = symbol.toUpperCase().trim()

    // Check cache first
    const cached = cache.get(sym)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ ...cached.data, cached: true })
    }

    // Call FastAPI ML server
    const response = await axios.post(`${ML_API}/predict`, { symbol: sym }, {
      timeout: 30000
    })

    // Store in cache
    cache.set(sym, {
      data:      response.data,
      timestamp: Date.now()
    })

    res.json(response.data)
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: `Symbol not found: ${req.body.symbol}` })
    }
    res.status(500).json({ error: 'Prediction failed', details: err.message })
  }
})

// GET /api/predict/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase().trim()

    const cached = cache.get(sym)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ ...cached.data, cached: true })
    }

    const response = await axios.get(`${ML_API}/predict/${sym}`, {
      timeout: 30000
    })

    cache.set(sym, {
      data:      response.data,
      timestamp: Date.now()
    })

    res.json(response.data)
  } catch (err) {
    res.status(500).json({ error: 'Prediction failed', details: err.message })
  }
})

module.exports = router