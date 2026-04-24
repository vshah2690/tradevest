/**
 * TradeVest — Node.js Backend Server
 * =====================================
 * Main entry point. Initialises Express app, middleware,
 * routes, WebSocket server, and database connections.
 *
 * Port: 5000 (REST API + WebSocket)
 * ML API: 5001 (FastAPI — must be running separately)
 */

require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const http       = require('http')
const WebSocket  = require('ws')
const mongoose   = require('mongoose')

// Route imports
const marketRoutes   = require('./routes/market')
const predictRoutes  = require('./routes/predict')
const authRoutes     = require('./routes/auth')
const portfolioRoutes = require('./routes/portfolio')

const app    = express()
const server = http.createServer(app)
const PORT   = process.env.PORT || 5000

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors())
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/market',    marketRoutes)
app.use('/api/predict',   predictRoutes)
app.use('/api/auth',      authRoutes)
app.use('/api/portfolio', portfolioRoutes)

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'TradeVest API',
    version: '1.0.0',
    status:  'running',
    port:    PORT,
    ml_api:  process.env.ML_API_URL || 'http://localhost:5001'
  })
})

// ── MongoDB Connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tradevest')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err.message))

// ── WebSocket Server ──────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server })

// Store connected clients
const clients = new Set()

wss.on('connection', (ws) => {
  clients.add(ws)
  console.log(`WebSocket client connected. Total: ${clients.size}`)

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`WebSocket client disconnected. Total: ${clients.size}`)
  })
})

// Broadcast price updates to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data)
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Make broadcast available to routes
app.set('broadcast', broadcast)

// ── Price Streaming ───────────────────────────────────────────────────────────
// Broadcasts price updates every 30 seconds to all WebSocket clients
// Uses the ML API to fetch latest prices
const axios = require('axios')

const WATCHED_SYMBOLS = [
  'TCS.NS', 'INFY.NS', 'RELIANCE.NS', 'HDFCBANK.NS',
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA'
]

async function streamPrices() {
  for (const symbol of WATCHED_SYMBOLS) {
    try {
      const response = await axios.get(
        `${process.env.ML_API_URL || 'http://localhost:5001'}/predict/${symbol}`,
        { timeout: 10000 }
      )
      const data = response.data
      broadcast({
        type:       'PRICE_UPDATE',
        symbol:     symbol,
        price:      data.current_price,
        change:     data.price_change,
        changePct:  data.price_change_pct,
        signal:     data.overall_signal,
        timestamp:  data.timestamp
      })
    } catch (err) {
      // Silently skip failed symbols — don't crash the stream
    }
  }
}

// Start streaming after 5 seconds (give ML API time to warm up)
setTimeout(() => {
  streamPrices()
  setInterval(streamPrices, 30000)
}, 5000)

// ── Start Server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('='.repeat(50))
  console.log('  TradeVest Backend Server')
  console.log('='.repeat(50))
  console.log(`  REST API  : http://localhost:${PORT}`)
  console.log(`  WebSocket : ws://localhost:${PORT}`)
  console.log(`  ML API    : ${process.env.ML_API_URL || 'http://localhost:5001'}`)
  console.log('='.repeat(50))
})

module.exports = { app, broadcast }