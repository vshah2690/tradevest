const mongoose = require('mongoose')

const tradeSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol:     { type: String, required: true },
  side:       { type: String, enum: ['buy', 'sell'], required: true },
  shares:     { type: Number, required: true },
  price:      { type: Number, required: true },
  total:      { type: Number, required: true },
  executedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Trade', tradeSchema)