/**
 * TradeVest — Notification Routes
 * =================================
 * Bell notification system.
 * Soft delete — isDeleted flag, never hard deleted.
 * isRead flag for read/unread state.
 */

const express      = require('express')
const router       = express.Router()
const auth         = require('../middleware/auth')
const Notification = require('../models/Notification')
const mongoose = require('mongoose')


// GET /api/notifications
// Returns all notifications for user (excluding soft deleted)
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId:    new mongoose.Types.ObjectId(req.userId),
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).limit(50)

    const unreadCount = notifications.filter(n => !n.isRead).length
    res.json({ notifications, unreadCount })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// PATCH /api/notifications/:id/read
// Mark single notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' })
  }
})

// PATCH /api/notifications/read-all
// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isDeleted: false },
      { isRead: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' })
  }
})

// PATCH /api/notifications/:id/delete
// Soft delete — sets isDeleted: true, never removes from DB
router.patch('/:id/delete', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isDeleted: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

// PATCH /api/notifications/delete-all
// Soft delete all notifications
router.patch('/delete-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId },
      { isDeleted: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete all notifications' })
  }
})

// TEMP DEBUG — remove after testing
router.get('/debug', auth, async (req, res) => {
  try {
    const all      = await Notification.find({})
    const userMatch = await Notification.find({ 
      userId: new mongoose.Types.ObjectId(req.userId) 
    })
    res.json({
      totalInDB:       all.length,
      userIdFromToken: req.userId,
      userMatch:       userMatch.length,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// TEMP — create test notification
router.post('/test', auth, async (req, res) => {
  try {
    const notif = await Notification.create({
      userId:       req.userId,
      type:         'prediction_correct',
      title:        'TCS prediction resolved!',
      message:      'HOLD @ ₹2,401 → ₹2,480 · AI was CORRECT ✅ · +3.3%',
      symbol:       'TCS.NS',
      signal:       'HOLD',
      priceAtTrack: 2401,
      currentPrice: 2480,
      returnPct:    3.3,
      outcome:      'CORRECT',
      isRead:       false,
      isDeleted:    false,
    })
    res.json({ success: true, notif })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router