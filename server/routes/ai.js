/**
 * TradeVest — AI Chat Routes
 * ===========================
 * Integrates Claude (Anthropic) and GPT-4o (OpenAI) to provide
 * natural language market analysis and investment insights.
 *
 * Both models receive the same context (live price + ML predictions)
 * but respond in their own style — users can switch between them.
 *
 * Endpoints:
 *   POST /api/ai/chat — Send message, get AI response
 *   GET  /api/ai/analysis/:symbol — Auto-generate stock analysis
 */

const express    = require('express')
const router     = express.Router()
const axios      = require('axios')
const Anthropic  = require('@anthropic-ai/sdk')
const OpenAI     = require('openai')

const ML_API = process.env.ML_API_URL || 'http://localhost:5001'

// Initialise AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ── Build market context for AI ───────────────────────────────────────────────
// Fetches live data and formats it as context for the AI prompt
async function buildMarketContext(symbol) {
  try {
    const response = await axios.get(`${ML_API}/predict/${symbol}`, {
      timeout: 15000
    })
    const data = response.data
    const currency = symbol.includes('.NS') ? '₹' : '$'
    const symClean = symbol.replace('.NS', '').replace('.BO', '')

    const predictions = data.predictions.map(p => (
      `- ${p.horizon} (${p.days} days): ${p.signal} — ${p.confidence}% confidence, ` +
      `${p.probability_up}% chance of going up, ${p.probability_down}% chance of going down`
    )).join('\n')

    return {
      raw: data,
      text: `
Stock: ${symClean} (${symbol})
Current Price: ${currency}${data.current_price?.toLocaleString()}
Price Change Today: ${data.price_change_pct > 0 ? '+' : ''}${data.price_change_pct?.toFixed(2)}%
Overall AI Signal: ${data.overall_signal}

ML Predictions (trained on 10 years of market data):
${predictions}

Note: These predictions use XGBoost gradient boosting with 105 technical indicators.
Best model accuracy: 73.42% on 5-day predictions.
      `.trim()
    }
  } catch (err) {
    return { raw: null, text: `Unable to fetch live data for ${symbol}` }
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function getSystemPrompt(context) {
  return `You are TradeVest AI, a helpful financial analysis assistant integrated into a stock trading platform.

You have access to real-time market data and ML predictions for stocks. Your job is to help users understand market trends, interpret AI predictions, and make informed investment decisions.

CURRENT MARKET DATA:
${context}

IMPORTANT GUIDELINES:
- Always be clear this is AI analysis, not financial advice
- Explain predictions in simple, plain English
- Be honest about uncertainty — markets are unpredictable
- Keep responses concise and actionable (3-5 sentences max unless asked for more)
- Use the ML prediction data provided to support your analysis
- If asked about stocks not in the context, say you don't have live data for them
- Never guarantee returns or promise specific outcomes
- Always end responses about investment decisions with a brief risk reminder`
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, symbol, engine = 'claude', history = [] } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Build market context for the current symbol
    const context = symbol
      ? await buildMarketContext(symbol)
      : { text: 'No specific stock selected.' }

    const systemPrompt = getSystemPrompt(context.text)

    // Build conversation history
    const messages = [
      ...history.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: message }
    ]

    let reply = ''

    if (engine === 'claude') {
      // ── Claude (Anthropic) ──────────────────────────────────────────────────
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 500,
        system:     systemPrompt,
        messages:   messages.map(m => ({
          role:    m.role,
          content: m.content
        }))
      })
      reply = response.content[0].text

    } else if (engine === 'gpt4') {
      // ── GPT-4o (OpenAI) ────────────────────────────────────────────────────
      const response = await openai.chat.completions.create({
        model:      'gpt-4o',
        max_tokens: 500,
        messages:   [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role:    m.role,
            content: m.content
          }))
        ]
      })
      reply = response.choices[0].message.content
    } else {
      return res.status(400).json({ error: 'Invalid engine. Use claude or gpt4' })
    }

    res.json({
      reply,
      engine,
      symbol,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    console.error('AI chat error:', err.message)

    // Handle specific API errors
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' })
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment.' })
    }

    res.status(500).json({ error: 'AI service unavailable', details: err.message })
  }
})

// ── GET /api/ai/analysis/:symbol ──────────────────────────────────────────────
// Auto-generates a full stock analysis without user asking
router.get('/analysis/:symbol', async (req, res) => {
  try {
    const { symbol }        = req.params
    const { engine = 'claude' } = req.query
    const context           = await buildMarketContext(symbol)
    const symClean          = symbol.replace('.NS', '').replace('.BO', '')

    const systemPrompt = getSystemPrompt(context.text)
    const userMessage  = `Give me a brief investment analysis for ${symClean}. 
    Should I buy, hold, or avoid this stock right now? 
    What does the AI prediction data suggest? 
    Keep it to 3-4 sentences, plain English.`

    let reply = ''

    if (engine === 'claude') {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 300,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }]
      })
      reply = response.content[0].text
    } else {
      const response = await openai.chat.completions.create({
        model:      'gpt-4o',
        max_tokens: 300,
        messages:   [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage }
        ]
      })
      reply = response.choices[0].message.content
    }

    res.json({
      symbol,
      analysis:  reply,
      engine,
      marketData: context.raw,
      timestamp:  new Date().toISOString()
    })

  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', details: err.message })
  }
})

module.exports = router