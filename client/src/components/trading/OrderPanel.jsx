import { useState } from 'react'
import useStore from '../../store'
import { trackAPI, watchlistAPI } from '../../services/api'
import AuthModal from '../auth/AuthModal'

export default function ActionPanel() {
  const currentData    = useStore(s => s.currentData)
  const currentSymbol  = useStore(s => s.currentSymbol)
  const token          = useStore(s => s.token)
  const setWatchlist   = useStore(s => s.setWatchlist)
  const watchlist      = useStore(s => s.watchlist)
  const trackedSymbols         = useStore(s => s.trackedSymbols)
  const addTrackedPrediction   = useStore(s => s.addTrackedPrediction)
  const removeTrackedPrediction = useStore(s => s.removeTrackedPrediction)
  const trackedPredictions     = useStore(s => s.trackedPredictions)

  const [tracking,  setTracking]  = useState(false)
  const [adding,    setAdding]    = useState(false)
  const [message,   setMessage]   = useState(null)
  const [showAuth,  setShowAuth]  = useState(false)

  const currency  = currentSymbol?.includes('.NS') ? '₹' : '$'
  const price     = currentData?.current_price || 0
  const symClean  = currentSymbol?.replace('.NS','').replace('.BO','')
  const isInWatch = watchlist.find(w => w.symbol === currentSymbol)
  const isTracked = trackedSymbols.includes(currentSymbol)
  const bestPred  = currentData?.predictions?.find(p => p.horizon === 'Medium-term')
    || currentData?.predictions?.[0]

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleTrack = async () => {
    // ── Not logged in → show login modal, do nothing else ──
    if (!token) {
      setShowAuth(true)
      return
    }

    if (!currentData || !bestPred) return

    // ── Already tracking → stop tracking ──
    if (isTracked) {
      const pred = trackedPredictions.find(
        p => p.symbol === currentSymbol && p.outcome === 'PENDING'
      )
      if (pred) {
        try {
          await trackAPI.delete(pred._id)
          removeTrackedPrediction(pred._id, currentSymbol)
          showMessage('success', `Stopped tracking ${symClean}`)
        } catch {
          showMessage('error', 'Failed to stop tracking')
        }
      }
      return
    }

    // ── Track new prediction ──
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
      // Add to store immediately — real time update
      addTrackedPrediction(res.data.prediction)
      showMessage('success',
        `Tracking ${bestPred.signal} for ${symClean}! Check back in ${bestPred.days} days.`
      )
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to track')
    } finally {
      setTracking(false)
    }
  }

  const handleWatchlist = async () => {
    if (!currentSymbol) return
    setAdding(true)
    try {
      if (isInWatch) {
        setWatchlist(watchlist.filter(w => w.symbol !== currentSymbol), !token)
        if (token) await watchlistAPI.remove(currentSymbol)
        showMessage('success', `${symClean} removed from watchlist`)
      } else {
        const newItem = { symbol: currentSymbol, name: symClean }
        setWatchlist([...watchlist, newItem], !token)
        if (token) await watchlistAPI.add(currentSymbol, symClean)
        showMessage('success',
          token
            ? `${symClean} added to watchlist!`
            : `${symClean} added! Login to save permanently.`
        )
      }
    } catch {
      const res = await watchlistAPI.get()
      setWatchlist(res.data.isDefault ? [] : res.data.watchlist, res.data.isDefault)
      showMessage('error', 'Failed to update watchlist')
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>

        {/* Stock info */}
        {currentData && (
          <div style={{
            background: 'var(--bg3)', borderRadius: '10px',
            padding: '12px', marginBottom: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{symClean}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '500' }}>
                {currency}{price?.toLocaleString()}
              </div>
            </div>
            {bestPred && (
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                AI says:{' '}
                <span style={{
                  color: bestPred.signal === 'BUY' ? 'var(--green)'
                       : bestPred.signal === 'SELL' ? 'var(--red)' : 'var(--amber)',
                  fontWeight: '600'
                }}>{bestPred.signal}</span>
                {' '}· {bestPred.confidence}% confident · {bestPred.horizon}
              </div>
            )}
          </div>
        )}

        {/* Track Prediction button */}
        <button
          onClick={handleTrack}
          disabled={tracking || !currentData || !bestPred}
          style={{
            width: '100%', padding: '11px', borderRadius: '9px',
            border: isTracked ? '1px solid rgba(255,77,106,0.3)' : 'none',
            cursor: tracking || !currentData ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: '700',
            background: isTracked
              ? 'rgba(255,77,106,0.1)'
              : 'linear-gradient(135deg, #2563eb, #8b5cf6)',
            color: isTracked ? 'var(--red)' : '#fff',
            opacity: tracking || !currentData ? 0.6 : 1,
            marginBottom: '6px', transition: 'all 0.15s'
          }}
        >
          {tracking ? 'Processing...'
            : isTracked ? '✕ Stop Tracking'
            : '📊 Track This Prediction'}
        </button>

        {/* Login hint under track button */}
        {!token && (
          <div style={{
            fontSize: '10px', color: 'var(--muted2)',
            textAlign: 'center', marginBottom: '8px'
          }}>
            🔒 Login required to track predictions
          </div>
        )}

        {/* Watchlist button */}
        <button
          onClick={handleWatchlist}
          disabled={adding || !currentSymbol}
          style={{
            width: '100%', padding: '10px', borderRadius: '9px',
            border: `1px solid ${isInWatch ? 'rgba(255,77,106,0.3)' : 'rgba(59,130,246,0.3)'}`,
            cursor: adding || !currentSymbol ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: '600',
            background: isInWatch ? 'rgba(255,77,106,0.1)' : 'rgba(59,130,246,0.1)',
            color: isInWatch ? 'var(--red)' : 'var(--blue)',
            opacity: adding || !currentSymbol ? 0.6 : 1,
            transition: 'all 0.15s'
          }}
        >
          {adding ? 'Updating...'
            : isInWatch ? '✕ Remove from Watchlist'
            : '+ Add to Watchlist'}
        </button>

        {!token && !isInWatch && (
          <div style={{
            fontSize: '10px', color: 'var(--muted2)',
            textAlign: 'center', marginTop: '6px'
          }}>
            Login to save watchlist permanently
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{
            marginTop: '10px', padding: '9px 12px', borderRadius: '7px',
            fontSize: '12px',
            background: message.type === 'success' ? 'rgba(0,212,160,0.1)' : 'rgba(255,77,106,0.1)',
            color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${message.type === 'success' ? 'rgba(0,212,160,0.2)' : 'rgba(255,77,106,0.2)'}`,
            lineHeight: '1.4'
          }}>{message.text}</div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}