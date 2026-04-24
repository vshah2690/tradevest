import { useEffect } from 'react'
import useStore from '../../store'
import { portfolioAPI } from '../../services/api'

export default function PortfolioPanel() {
  const portfolio    = useStore(s => s.portfolio)
  const setPortfolio = useStore(s => s.setPortfolio)
  const token        = useStore(s => s.token)

  useEffect(() => {
    if (!token) return
    portfolioAPI.getPortfolio()
      .then(res => setPortfolio(res.data))
      .catch(() => {})
  }, [token])

  const INITIAL = 100000
  const total   = portfolio?.totalValue || INITIAL
  const pnl     = portfolio?.totalPnl   || 0
  const pnlPct  = portfolio?.totalPnlPct || 0
  const cash    = portfolio?.cash       || INITIAL

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Portfolio value card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))',
        borderBottom: '1px solid var(--border)',
        padding: '14px 16px'
      }}>
        <div style={{ fontSize: '10px', color: 'rgba(147,197,253,0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
          Portfolio Value
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '500', letterSpacing: '-0.5px' }}>
          ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: '12px', marginTop: '3px',
          color: pnl >= 0 ? 'var(--green)' : 'var(--red)'
        }}>
          {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px' }}>
          <span style={{ color: 'var(--muted)' }}>Cash</span>
          <span style={{ fontFamily: 'var(--mono)' }}>₹{cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Positions */}
      <div style={{ padding: '10px 14px', flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px' }}>Open Positions</div>

        {!token ? (
          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '16px' }}>
            Login to track portfolio
          </div>
        ) : !portfolio?.positions?.length ? (
          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '16px' }}>
            No open positions
          </div>
        ) : (
          portfolio.positions.map((pos, i) => (
            <div key={i} style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '9px 11px', marginBottom: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '12px' }}>{pos.symbol}</span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: '11px',
                  color: pos.pnl >= 0 ? 'var(--green)' : 'var(--red)'
                }}>
                  {pos.pnl >= 0 ? '+' : ''}₹{pos.pnl?.toFixed(2)} ({pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct?.toFixed(2)}%)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                <span>{pos.shares} shares @ ₹{pos.avgCost?.toFixed(2)}</span>
                <span>₹{pos.currentPrice?.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}