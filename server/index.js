const express = require('express')
const app = express()
const PORT = process.env.PORT || 5000

app.get('/', (req, res) => {
  res.json({ message: 'TradeVest API is running' })
})

app.listen(PORT, () => {
  console.log(`TradeVest server running on port ${PORT}`)
})