const mongoose = require('mongoose')

const positionSchema = new mongoose.Schema({
  symbol:  { type: String, required: true },
  shares:  { type: Number, required: true },
  avgCost: { type: Number, required: true }
})

const portfolioSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cash:      { type: Number, default: 100000 },
  positions: [positionSchema],
  updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Portfolio', portfolioSchema)