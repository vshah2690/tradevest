/**
 * TradeVest — Authentication Routes
 * ====================================
 * JWT-based authentication.
 * Register, login and session restore endpoints.
 * Passwords hashed with bcrypt.
 */

const express = require('express')
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const router  = express.Router()
const User    = require('../models/User')
const auth    = require('../middleware/auth')

const JWT_SECRET = process.env.JWT_SECRET || 'tradevest_dev_secret'

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = new User({
      name,
      email:        email.toLowerCase(),
      passwordHash,
      cash:         100000,
      createdAt:    new Date()
    })
    await user.save()

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        cash:  user.cash
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        cash:  user.cash
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message })
  }
})

// GET /api/auth/me — verify token and restore user session on page refresh
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        cash:  user.cash
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

module.exports = router