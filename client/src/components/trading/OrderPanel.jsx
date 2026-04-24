import { useState } from 'react'
import useStore from '../../store'
import { portfolioAPI } from '../../services/api'

export default function OrderPanel() {
  const currentData    = useStore(s => s.currentData)
  const currentSymbol  = useStore(s => s.currentSymbol)
  const portfolio      = useStore(s => s.portfolio)
  const setPortfolio   = useStore(s => s.setPortfolio)
  const orderSide      = useStore(s => s.orderSide)
  const setOrderSide   = useStore(s => s.setOrderSide)
  const token          = useStore(s => s.token)

  const [shares,  setShares]  = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const price    = currentData?.current_price || 0
  const total    = price * shares
  const currency = currentSymbol?.includes('.NS') ? '₹' : '$'
  const cash     = portfolio?.cash || 100000

  const placeOrder = async () => {
    if (!token) {
      setMessage({ type: 'error', text: 'Please login to trade' })
      return
    }
    if (!currentSymbol || shares < 1) return

    setLoading(true)
    setMessage(null)

    try {
      await portfolioAPI.placeOrder({
        symbol: currentSymbol,
        side:   orderSide,
        shares: parseInt(shares)
      })

      // Refresh portfolio
      const res = await portfolioAPI.getPortfolio()
      setPortfolio(res.data)

      setMessage({
        type: 'success',
        text: `${orderSide.toUpperCase()} ${shares} ${currentSymbol} @ ${currency}${price.toLocaleString()}`
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Order failed'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px' }}>Place Order</div>

      {/* Buy/Sell tabs */}
      <div style={{
        display: 'flex', background: 'var(--bg3)',
        borderRadius: '7px', padding: '3px', marginBottom: '10px'
      }}>
        {['buy', 'sell'].map(side => (
          <button key={side} onClick={() => setOrderSide(side)} style={{
            flex: 1, padding: '6px', borderRadius: '5px',
            border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
            transition: 'all 0.12s',
            background: orderSide === side
              ? side === 'buy' ? 'rgba(0,212,160,0.15)' : 'rgba(255,77,106,0.15)'
              : 'transparent',
            color: orderSide === side
              ? side === 'buy' ? 'var(--green)' : 'var(--red)'
              : 'var(--muted)',
          }}>{side.toUpperCase()}</button>
        ))}
      </div>

      {/* Symbol */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Symbol</div>
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          borderRadius: '7px', padding: '8px 10px',
          fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text)'
        }}>{currentSymbol || '---'}</div>
      </div>

      {/* Shares input */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Shares</div>
        <input
          type="number" min="1" value={shares}
          onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))}
          style={{
            width: '100%', background: 'var(--bg3)',
            border: '1px solid var(--border2)', borderRadius: '7px',
            padding: '8px 10px', color: 'var(--text)',
            fontFamily: 'var(--mono)', fontSize: '13px', outline: 'none'
          }}
        />
      </div>

      {/* Estimated total */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '11px', marginBottom: '10px'
      }}>
        <span style={{ color: 'var(--muted)' }}>Est. Total</span>
        <span style={{ fontFamily: 'var(--mono)', color: orderSide === 'buy' ? 'var(--green)' : 'var(--red)' }}>
          {currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Order button */}
      <button onClick={placeOrder} disabled={loading || !currentData} style={{
        width: '100%', padding: '10px', borderRadius: '8px',
        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '13px', fontWeight: '700', letterSpacing: '0.3px',
        background: orderSide === 'buy'
          ? 'linear-gradient(135deg, #00a87e, #00d4a0)'
          : 'linear-gradient(135deg, #cc3d56, #ff4d6a)',
        color: orderSide === 'buy' ? '#001a12' : '#fff',
        opacity: loading || !currentData ? 0.6 : 1,
        transition: 'all 0.15s'
      }}>
        {loading ? 'Processing...' : `${orderSide.toUpperCase()} ${shares} SHARE${shares > 1 ? 'S' : ''}`}
      </button>

      {/* Message */}
      {message && (
        <div style={{
          marginTop: '8px', padding: '8px 10px', borderRadius: '6px', fontSize: '11px',
          background: message.type === 'success' ? 'rgba(0,212,160,0.1)' : 'rgba(255,77,106,0.1)',
          color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${message.type === 'success' ? 'rgba(0,212,160,0.2)' : 'rgba(255,77,106,0.2)'}`,
        }}>{message.text}</div>
      )}
    </div>
  )
}