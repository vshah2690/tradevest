/**
 * TradeVest — Watchlist Routes
 * ==============================
 * Personal watchlist per user.
 * Logged out users see default watchlist.
 * Logged in users see their own saved watchlist.
 */

const express   = require('express')
const router    = express.Router()
const auth      = require('../middleware/auth')
const Watchlist = require('../models/Watchlist')

const DEFAULT_WATCHLIST = [
  { symbol: 'TCS.NS',      name: 'Tata Consultancy Services' },
  { symbol: 'INFY.NS',     name: 'Infosys' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'AAPL',        name: 'Apple Inc' },
  { symbol: 'MSFT',        name: 'Microsoft' },
  { symbol: 'NVDA',        name: 'NVIDIA' },
  { symbol: 'GOOGL',       name: 'Alphabet' },
  { symbol: 'TSLA',        name: 'Tesla' },
]

// GET /api/watchlist
// Returns user's watchlist if logged in, default if not
router.get('/', async (req, res) => {
  try {
    // Check for optional auth token
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.json({ watchlist: DEFAULT_WATCHLIST, isDefault: true })
    }

    const jwt     = require('jsonwebtoken')
    const decoded = jwt.verify(
      authHeader.split(' ')[1],
      process.env.JWT_SECRET || 'tradevest_dev_secret'
    )

    const items = await Watchlist.find({ userId: decoded.userId })
      .sort({ addedAt: -1 })

    if (!items.length) {
      return res.json({ watchlist: DEFAULT_WATCHLIST, isDefault: true })
    }

    res.json({
      watchlist: items.map(i => ({ symbol: i.symbol, name: i.name })),
      isDefault: false
    })
  } catch {
    res.json({ watchlist: DEFAULT_WATCHLIST, isDefault: true })
  }
})

// POST /api/watchlist/add
// Add stock to personal watchlist
router.post('/add', auth, async (req, res) => {
  try {
    const { symbol, name } = req.body
    if (!symbol) return res.status(400).json({ error: 'Symbol required' })

    await Watchlist.findOneAndUpdate(
      { userId: req.userId, symbol: symbol.toUpperCase() },
      { userId: req.userId, symbol: symbol.toUpperCase(), name, addedAt: new Date() },
      { upsert: true, new: true }
    )

    res.json({ success: true, message: `${symbol} added to watchlist` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to watchlist' })
  }
})

// DELETE /api/watchlist/:symbol
// Remove stock from watchlist
router.delete('/:symbol', auth, async (req, res) => {
  try {
    await Watchlist.deleteOne({
      userId: req.userId,
      symbol: req.params.symbol.toUpperCase()
    })
    res.json({ success: true, message: `${req.params.symbol} removed from watchlist` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from watchlist' })
  }
})

module.exports = router