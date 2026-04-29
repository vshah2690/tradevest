const mongoose = require('mongoose')

const watchlistSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol:    { type: String, required: true },
  name:      { type: String },
  addedAt:   { type: Date, default: Date.now }
})

// Unique per user per symbol
watchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true })

module.exports = mongoose.model('Watchlist', watchlistSchema)