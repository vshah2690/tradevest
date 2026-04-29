const mongoose = require('mongoose')

const trackedSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol:        { type: String, required: true },
  name:          { type: String },
  priceAtTrack:  { type: Number, required: true },
  signal:        { type: String, enum: ['BUY', 'SELL', 'HOLD'], required: true },
  confidence:    { type: Number },
  horizon:       { type: String }, // 'Intraday', 'Short-term', 'Medium-term'
  days:          { type: Number }, // 1, 3, 5
  targetDate:    { type: Date },
  currentPrice:  { type: Number },
  outcome:       { type: String, enum: ['CORRECT', 'INCORRECT', 'PENDING'], default: 'PENDING' },
  returnPct:     { type: Number },
  trackedAt:     { type: Date, default: Date.now }
})

module.exports = mongoose.model('TrackedPrediction', trackedSchema)