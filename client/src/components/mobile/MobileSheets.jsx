import { useState } from 'react'
import useStore from '../../store'
import usePrediction from '../../hooks/usePrediction'
import { trackAPI, watchlistAPI } from '../../services/api'
import AuthModal from '../auth/AuthModal'

function PredictionSheet({ onClose }) {
  const currentData             = useStore(s => s.currentData)
  const currentSymbol           = useStore(s => s.currentSymbol)
  const token                   = useStore(s => s.token)
  const watchlist               = useStore(s => s.watchlist)
  const setWatchlist            = useStore(s => s.setWatchlist)
  const trackedSymbols          = useStore(s => s.trackedSymbols)
  const addTrackedPrediction    = useStore(s => s.addTrackedPrediction)
  const removeTrackedPrediction = useStore(s => s.removeTrackedPrediction)
  const trackedPredictions      = useStore(s => s.trackedPredictions)

  const [tracking, setTracking] = useState(false)
  const [message,  setMessage]  = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  const currency  = currentSymbol?.includes('.NS') ? '₹' : '$'
  const price     = currentData?.current_price || 0
  const symClean  = currentSymbol?.replace('.NS','').replace('.BO','')
  const isTracked = trackedSymbols.includes(currentSymbol)

  // ── Read predictions the same way SignalPanel does ──
  const preds   = currentData?.predictions || []
  const bestPred = preds.find(p => p.horizon === 'Medium-term') || preds[0]
  const today   = preds.find(p => p.horizon === 'Intraday')    || {}
  const week3   = preds.find(p => p.horizon === 'Short-term')  || {}
  const week5   = preds.find(p => p.horizon === 'Medium-term') || {}

  // ── Price range calculated same as SignalPanel ──
  const priceRange = preds.length > 0 ? (() => {
    const targets = preds.map(p => {
      const prob = p.probability_up / 100
      return p.signal === 'BUY'
        ? price * (1 + (prob - 0.5) * 0.15)
        : price * (1 - (0.5 - prob) * 0.15)
    })
    return {
      low:  Math.min(...targets),
      high: Math.max(...targets),
    }
  })() : null

  const getColor = pct => {
    if (!pct) return 'var(--muted)'
    if (pct >= 70) return 'var(--green)'
    if (pct >= 55) return '#f59e0b'
    return 'var(--muted)'
  }
  const getLabel = pct => {
    if (!pct) return ''
    if (pct >= 70) return '🟩 Likely to go UP'
    if (pct >= 55) return '🟦 Slight chance UP'
    return '😕 Hard to predict'
  }

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleTrack = async () => {
    if (!token) { setShowAuth(true); return }
    if (!currentData || !bestPred) return

    if (isTracked) {
      const pred = trackedPredictions.find(
        p => p.symbol === currentSymbol && p.outcome === 'PENDING'
      )
      if (pred) {
        try {
          await trackAPI.delete(pred._id)
          removeTrackedPrediction(pred._id, currentSymbol)
          showMsg('success', `Stopped tracking ${symClean}`)
        } catch {
          showMsg('error', 'Failed to stop tracking')
        }
      }
      return
    }

    setTracking(true)
    try {
      const res = await trackAPI.track({
        symbol:       currentSymbol,
        name:         symClean,
        signal:       bestPred.signal,
        confidence:   bestPred.confidence,
        horizon:      bestPred.horizon,
        days:         bestPred.days,
        priceAtTrack: price,
      })
      addTrackedPrediction(res.data.prediction)
      showMsg('success', `Tracking ${bestPred.signal} for ${symClean}! Check back in ${bestPred.days} days.`)
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to track')
    } finally {
      setTracking(false)
    }
  }

  return (
    <div className="ms-overlay" onClick={onClose}>
      <div className="ms-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-handle" />

        <div className="ms-sheet-title">
          <span>🎯 {symClean} Predictions</span>
          <span className="ms-close" onClick={onClose}>✕</span>
        </div>

        {/* AI verdict */}
        {bestPred && (
          <div className="ms-verdict">
            <div className="ms-verdict-left">
              <span className="ms-verdict-tag">AI says</span>
              <span className="ms-verdict-val" style={{
                color: bestPred.signal === 'BUY' ? 'var(--green)'
                     : bestPred.signal === 'SELL' ? 'var(--red)' : '#f59e0b'
              }}>{bestPred.signal}</span>
              <span className="ms-verdict-conf">· {bestPred.confidence}% confident · {bestPred.horizon}</span>
            </div>
          </div>
        )}

        {/* Breakdown bars */}
        <div className="ms-pred-body">
          {[
            { label: 'Today',              sub: getLabel(today.probability_up),  pct: today.probability_up,  color: getColor(today.probability_up) },
            { label: 'This week (3 days)', sub: getLabel(week3.probability_up),  pct: week3.probability_up,  color: getColor(week3.probability_up) },
            { label: 'Next week (5 days)', sub: getLabel(week5.probability_up),  pct: week5.probability_up,  color: getColor(week5.probability_up) },
          ].map(row => (
            <div key={row.label} className="ms-pred-row">
              <div className="ms-pred-top">
                <div>
                  <div className="ms-pred-name">{row.label}</div>
                  <div className="ms-pred-sub">{row.sub || '—'}</div>
                </div>
                <div className="ms-pred-pct" style={{ color: row.color }}>
                  {row.pct ? `${row.pct.toFixed(1)}%` : '--'}
                </div>
              </div>
              <div className="ms-bar-bg">
                <div className="ms-bar-fill" style={{ width: `${row.pct || 0}%`, background: row.color }} />
              </div>
              <div className="ms-bar-chances">
                <span style={{ color: 'var(--green)', fontSize: '10px' }}>↑ {row.pct ? row.pct.toFixed(1) : '--'}% up</span>
                <span style={{ color: 'var(--red)',   fontSize: '10px' }}>↓ {row.pct ? (100 - row.pct).toFixed(1) : '--'}% down</span>
              </div>
            </div>
          ))}

          {/* Price range */}
          {priceRange && (
            <div className="ms-range">
              <div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Low</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--red)' }}>
                  {currency}{priceRange.low.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px' }}>→</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>High</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>
                  {currency}{priceRange.high.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          <div className="ms-note">⚠️ AI analysis only — not financial advice.</div>
        </div>

        {/* Action buttons */}
        <div className="ms-actions">
          <button
            className="ms-btn-primary"
            onClick={handleTrack}
            disabled={tracking || !currentData || !bestPred}
            style={{
              background: isTracked ? 'rgba(255,77,106,0.1)' : 'linear-gradient(135deg, #2563eb, #8b5cf6)',
              color:  isTracked ? 'var(--red)' : '#fff',
              border: isTracked ? '1px solid rgba(255,77,106,0.3)' : 'none',
              opacity: tracking || !currentData ? 0.6 : 1,
              cursor:  tracking || !currentData ? 'not-allowed' : 'pointer',
            }}
          >
            {tracking ? 'Processing...' : isTracked ? '✕ Stop Tracking' : '📊 Track This Prediction'}
          </button>

          {!token && (
            <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>
              🔒 Login required to track predictions
            </div>
          )}

          {message && (
            <div style={{
              padding: '9px 12px', borderRadius: '7px', fontSize: '12px',
              background: message.type === 'success' ? 'rgba(0,212,160,0.1)' : 'rgba(255,77,106,0.1)',
              color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${message.type === 'success' ? 'rgba(0,212,160,0.2)' : 'rgba(255,77,106,0.2)'}`,
              lineHeight: '1.4',
            }}>{message.text}</div>
          )}
        </div>

        {/* Tracked Predictions */}
        {trackedPredictions?.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{
              fontSize: '10px', fontWeight: '600', color: 'var(--muted)',
              letterSpacing: '1px', textTransform: 'uppercase',
              padding: '14px 0 10px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
              Tracked Predictions
            </div>
            {trackedPredictions.map(pred => {
              const daysLeft = Math.ceil((new Date(pred.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
              const curr = pred.symbol?.includes('.NS') ? '₹' : '$'
              return (
                <div key={pred._id} style={{
                  background: 'var(--bg3)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px', padding: '10px 12px', marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px' }}>
                      {pred.symbol?.replace('.NS','').replace('.BO','')}
                    </span>
                    {pred.outcome === 'PENDING' && daysLeft > 0 && (
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}>⏳ {daysLeft}d left</span>
                    )}
                    {pred.outcome !== 'PENDING' && (
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                        background: pred.outcome === 'CORRECT' ? 'rgba(0,200,122,0.15)' : 'rgba(255,77,106,0.15)',
                        color: pred.outcome === 'CORRECT' ? 'var(--green)' : 'var(--red)',
                        border: `1px solid ${pred.outcome === 'CORRECT' ? 'rgba(0,200,122,0.3)' : 'rgba(255,77,106,0.3)'}`,
                      }}>{pred.outcome === 'CORRECT' ? '✓ Correct' : '✗ Wrong'}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                    <span style={{
                      fontWeight: '700',
                      color: pred.signal === 'BUY' ? 'var(--green)' : pred.signal === 'SELL' ? 'var(--red)' : '#f59e0b'
                    }}>{pred.signal}</span>
                    {' '}@ {curr}{pred.priceAtTrack?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {pred.horizon} · {pred.confidence}% confidence
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}

function WatchlistSheet({ onClose }) {
  const watchlist        = useStore(s => s.watchlist)
  const prices           = useStore(s => s.prices)
  const currentSymbol    = useStore(s => s.currentSymbol)
  const setCurrentSymbol = useStore(s => s.setCurrentSymbol)
  const setCurrentName   = useStore(s => s.setCurrentName)
  const setWatchlist     = useStore(s => s.setWatchlist)
  const token            = useStore(s => s.token)
  const { predict }      = usePrediction()

  const handleSelect = (sym, name) => {
    setCurrentSymbol(sym)
    setCurrentName(name)
    predict(sym)
    onClose()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRemove = async (e, symbol) => {
    e.stopPropagation()
    setWatchlist(watchlist.filter(w => w.symbol !== symbol), false)
    try { await watchlistAPI.remove(symbol) } catch {}
  }

  return (
    <div className="ms-overlay" onClick={onClose}>
      <div className="ms-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-handle" />
        <div className="ms-sheet-title">
          <span>⭐ My Watchlist</span>
          <span className="ms-close" onClick={onClose}>✕</span>
        </div>

        {watchlist.length === 0 ? (
          <div className="ms-empty">
            {token ? 'No stocks added yet.\nSearch for a stock and add it.' : 'Login to save your watchlist.'}
          </div>
        ) : (
          watchlist.map(stock => {
            const p      = prices[stock.symbol]
            const curr   = stock.symbol.includes('.NS') || stock.symbol.includes('.BO') ? '₹' : '$'
            const isUp   = p?.changePct >= 0
            const active = currentSymbol === stock.symbol
            return (
              <div
                key={stock.symbol}
                className={`ms-wl-row ${active ? 'active' : ''}`}
                onClick={() => handleSelect(stock.symbol, stock.name)}
              >
                <div className="ms-wl-left">
                  <div className="ms-wl-ticker">{stock.symbol.replace('.NS','').replace('.BO','')}</div>
                  <div className="ms-wl-name">{stock.name}</div>
                </div>
                <div className="ms-wl-right">
                  <div className="ms-wl-price">{p ? `${curr}${p.price?.toLocaleString()}` : '---'}</div>
                  <div className="ms-wl-pct" style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}>
                    {p ? `${isUp ? '+' : ''}${p.changePct?.toFixed(2)}%` : ''}
                  </div>
                </div>
                <div className="ms-wl-remove" onClick={e => handleRemove(e, stock.symbol)}>✕</div>
              </div>
            )
          })
        )}

        <div className="ms-wl-hint">Tap any stock to load its chart</div>
      </div>
    </div>
  )
}

export default function MobileSheets() {
  const [open, setOpen] = useState(null)

  return (
    <>
      <div className="ms-fab-group">
        <button
          className="ms-fab ms-fab-predict"
          onClick={() => setOpen('predict')}
          aria-label="Open predictions"
        >
          <span className="ms-fab-icon">🎯</span>
          Predictions
        </button>
        <button
          className="ms-fab ms-fab-watchlist"
          onClick={() => setOpen('watchlist')}
          aria-label="Open watchlist"
        >
          <span className="ms-fab-icon">⭐</span>
          Watchlist
        </button>
      </div>

      {open === 'predict'   && <PredictionSheet  onClose={() => setOpen(null)} />}
      {open === 'watchlist' && <WatchlistSheet   onClose={() => setOpen(null)} />}
    </>
  )
}