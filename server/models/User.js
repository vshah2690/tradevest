const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  cash:         { type: Number, default: 100000 },
  createdAt:    { type: Date, default: Date.now }
})

module.exports = mongoose.model('User', userSchema)