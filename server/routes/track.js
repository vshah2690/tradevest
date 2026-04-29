/**
 * TradeVest — Track Prediction Routes
 * =====================================
 * Users can track AI predictions to see if they come true.
 * After N days, the system checks if the prediction was correct.
 */

const express           = require('express')
const router            = express.Router()
const auth              = require('../middleware/auth')
const axios             = require('axios')
const TrackedPrediction = require('../models/TrackedPrediction')

const ML_API = process.env.ML_API_URL || 'http://localhost:5001'

// POST /api/track
// Track a prediction
router.post('/', auth, async (req, res) => {
  try {
    const { symbol, name, signal, confidence, horizon, days, priceAtTrack } = req.body

    if (!symbol || !signal || !priceAtTrack) {
      return res.status(400).json({ error: 'Symbol, signal and price required' })
    }

    // Calculate target date
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + (days || 5))

    const tracked = new TrackedPrediction({
      userId:       req.userId,
      symbol:       symbol.toUpperCase(),
      name:         name || symbol,
      priceAtTrack: parseFloat(priceAtTrack),
      signal:       signal.toUpperCase(),
      confidence,
      horizon,
      days:         days || 5,
      targetDate,
      outcome:      'PENDING'
    })

    await tracked.save()

    res.json({
      success: true,
      message: `Tracking ${signal} prediction for ${symbol}`,
      prediction: tracked
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to track prediction', details: err.message })
  }
})

// GET /api/track
// Get all tracked predictions for user
router.get('/', auth, async (req, res) => {
  try {
    const predictions = await TrackedPrediction.find({ userId: req.userId })
      .sort({ trackedAt: -1 })
      .limit(20)

    // Update outcomes for pending predictions that have passed target date
    const now = new Date()
    const updates = []

    for (const pred of predictions) {
      if (pred.outcome === 'PENDING' && pred.targetDate <= now) {
        try {
          // Fetch current price
          const response = await axios.get(
            `${ML_API}/predict/${pred.symbol}`,
            { timeout: 10000 }
          )
          const currentPrice = response.data.current_price
          const returnPct    = ((currentPrice - pred.priceAtTrack) / pred.priceAtTrack) * 100

          // Determine if prediction was correct
          let outcome = 'INCORRECT'
          if (pred.signal === 'BUY'  && currentPrice > pred.priceAtTrack) outcome = 'CORRECT'
          if (pred.signal === 'SELL' && currentPrice < pred.priceAtTrack) outcome = 'CORRECT'
          if (pred.signal === 'HOLD') outcome = 'CORRECT' // HOLD is always "correct"

          pred.currentPrice = currentPrice
          pred.returnPct    = parseFloat(returnPct.toFixed(2))
          pred.outcome      = outcome
          await pred.save()
          updates.push(pred.symbol)
        } catch {
          // Skip if price fetch fails
        }
      }
    }

    // Calculate stats
    const completed = predictions.filter(p => p.outcome !== 'PENDING')
    const correct   = completed.filter(p => p.outcome === 'CORRECT').length
    const accuracy  = completed.length > 0
      ? Math.round((correct / completed.length) * 100)
      : null

    res.json({
      predictions,
      stats: {
        total:     predictions.length,
        pending:   predictions.filter(p => p.outcome === 'PENDING').length,
        correct,
        incorrect: completed.length - correct,
        accuracy,
        updated:   updates
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracked predictions' })
  }
})

// DELETE /api/track/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await TrackedPrediction.deleteOne({
      _id:    req.params.id,
      userId: req.userId
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete' })
  }
})

module.exports = router