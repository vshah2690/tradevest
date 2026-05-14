const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:         { 
    type: String, 
    enum: ['prediction_resolved', 'prediction_expiring', 'prediction_correct', 'prediction_wrong'],
    required: true 
  },
  title:        { type: String, required: true },
  message:      { type: String, required: true },
  symbol:       { type: String },
  signal:       { type: String },
  priceAtTrack: { type: Number },
  currentPrice: { type: Number },
  returnPct:    { type: Number },
  outcome:      { type: String },
  predictionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackedPrediction' },
  isRead:       { type: Boolean, default: false },  // false = unread
  isDeleted:    { type: Boolean, default: false },  // false = active (soft delete)
  createdAt:    { type: Date, default: Date.now }
})

// Index for fast queries
notificationSchema.index({ userId: 1, isDeleted: 1, isRead: 1 })

module.exports = mongoose.model('Notification', notificationSchema)