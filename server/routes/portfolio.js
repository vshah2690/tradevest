/**
 * TradeVest — Portfolio Routes
 * ==============================
 * Paper trading simulation endpoints.
 * Buy/sell orders, portfolio positions, trade history.
 * All routes require JWT authentication.
 */

const express   = require('express')
const router    = express.Router()
const auth      = require('../middleware/auth')
const Portfolio = require('../models/Portfolio')
const Trade     = require('../models/Trade')
const axios     = require('axios')

const ML_API = process.env.ML_API_URL || 'http://localhost:5001'

// GET /api/portfolio
// Returns user's portfolio — cash, positions, total value
router.get('/', auth, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ userId: req.userId })

    // Create portfolio if doesn't exist
    if (!portfolio) {
      portfolio = new Portfolio({
        userId:    req.userId,
        cash:      100000,
        positions: []
      })
      await portfolio.save()
    }

    // Calculate holdings value using latest prices
    let holdingsValue = 0
    const enrichedPositions = []

    for (const pos of portfolio.positions) {
      try {
        const response = await axios.get(`${ML_API}/predict/${pos.symbol}`, {
          timeout: 10000
        })
        const currentPrice = response.data.current_price
        const currentValue = pos.shares * currentPrice
        const pnl          = currentValue - (pos.shares * pos.avgCost)
        const pnlPct       = (pnl / (pos.shares * pos.avgCost)) * 100
        holdingsValue += currentValue

        enrichedPositions.push({
          symbol:       pos.symbol,
          shares:       pos.shares,
          avgCost:      pos.avgCost,
          currentPrice,
          currentValue: parseFloat(currentValue.toFixed(2)),
          pnl:          parseFloat(pnl.toFixed(2)),
          pnlPct:       parseFloat(pnlPct.toFixed(2))
        })
      } catch {
        // Use cost basis if price fetch fails
        holdingsValue += pos.shares * pos.avgCost
        enrichedPositions.push({
          symbol:      pos.symbol,
          shares:      pos.shares,
          avgCost:     pos.avgCost,
          currentPrice: pos.avgCost,
          pnl:         0,
          pnlPct:      0
        })
      }
    }

    const totalValue = portfolio.cash + holdingsValue
    const totalPnl   = totalValue - 100000
    const totalPnlPct = (totalPnl / 100000) * 100

    res.json({
      cash:          parseFloat(portfolio.cash.toFixed(2)),
      holdingsValue: parseFloat(holdingsValue.toFixed(2)),
      totalValue:    parseFloat(totalValue.toFixed(2)),
      totalPnl:      parseFloat(totalPnl.toFixed(2)),
      totalPnlPct:   parseFloat(totalPnlPct.toFixed(2)),
      positions:     enrichedPositions
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch portfolio', details: err.message })
  }
})

// POST /api/portfolio/order
// Body: { symbol, side, shares }
router.post('/order', auth, async (req, res) => {
  try {
    const { symbol, side, shares } = req.body

    if (!symbol || !side || !shares) {
      return res.status(400).json({ error: 'Symbol, side and shares are required' })
    }
    if (!['buy', 'sell'].includes(side.toLowerCase())) {
      return res.status(400).json({ error: 'Side must be buy or sell' })
    }
    if (shares < 1) {
      return res.status(400).json({ error: 'Shares must be at least 1' })
    }

    // Get current price
    const priceResponse = await axios.get(
      `${ML_API}/predict/${symbol.toUpperCase()}`,
      { timeout: 10000 }
    )
    const price = priceResponse.data.current_price
    const total = price * shares

    // Get or create portfolio
    let portfolio = await Portfolio.findOne({ userId: req.userId })
    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.userId, cash: 100000, positions: [] })
    }

    if (side.toLowerCase() === 'buy') {
      if (portfolio.cash < total) {
        return res.status(400).json({
          error: 'Insufficient cash',
          available: portfolio.cash,
          required:  total
        })
      }

      // Deduct cash
      portfolio.cash -= total

      // Update position
      const existing = portfolio.positions.find(p => p.symbol === symbol.toUpperCase())
      if (existing) {
        const newTotal  = existing.shares * existing.avgCost + total
        existing.shares += shares
        existing.avgCost = newTotal / existing.shares
      } else {
        portfolio.positions.push({
          symbol:  symbol.toUpperCase(),
          shares,
          avgCost: price
        })
      }
    } else {
      // Sell
      const existing = portfolio.positions.find(p => p.symbol === symbol.toUpperCase())
      if (!existing || existing.shares < shares) {
        return res.status(400).json({
          error:     'Insufficient shares',
          available: existing?.shares || 0
        })
      }

      portfolio.cash    += total
      existing.shares   -= shares

      // Remove position if all shares sold
      if (existing.shares === 0) {
        portfolio.positions = portfolio.positions.filter(
          p => p.symbol !== symbol.toUpperCase()
        )
      }
    }

    await portfolio.save()

    // Save trade to history
    const trade = new Trade({
      userId:      req.userId,
      symbol:      symbol.toUpperCase(),
      side:        side.toLowerCase(),
      shares,
      price,
      total,
      executedAt:  new Date()
    })
    await trade.save()

    res.json({
      success:  true,
      trade: {
        symbol, side, shares, price,
        total:      parseFloat(total.toFixed(2)),
        executedAt: trade.executedAt
      },
      portfolio: {
        cash: parseFloat(portfolio.cash.toFixed(2))
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Order failed', details: err.message })
  }
})

// GET /api/portfolio/history
// Returns trade history
router.get('/history', auth, async (req, res) => {
  try {
    const trades = await Trade.find({ userId: req.userId })
      .sort({ executedAt: -1 })
      .limit(50)
    res.json(trades)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trade history' })
  }
})

module.exports = router