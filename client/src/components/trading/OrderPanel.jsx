// import { useState } from 'react'
// import useStore from '../../store'
// import { trackAPI, watchlistAPI } from '../../services/api'
// import AuthModal from '../auth/AuthModal'

// // All 5 prediction horizons
// // 21d and 63d disabled until models are trained
// const HORIZONS = [
//   { days: 1,  label: '1 Day',    key: 'Intraday',     ready: true  },
//   { days: 3,  label: '3 Days',   key: 'Short-term',   ready: true  },
//   { days: 5,  label: '5 Days',   key: 'Medium-term',  ready: true  },
//   { days: 21, label: '1 Month',  key: 'Long-term',    ready: true },
//   { days: 63, label: '3 Months', key: 'Very Long-term', ready: true },
// ]

// export default function ActionPanel() {
//   const currentData             = useStore(s => s.currentData)
//   const currentSymbol           = useStore(s => s.currentSymbol)
//   const token                   = useStore(s => s.token)
//   const setWatchlist            = useStore(s => s.setWatchlist)
//   const watchlist               = useStore(s => s.watchlist)
//   const addTrackedPrediction    = useStore(s => s.addTrackedPrediction)
//   const removeTrackedPrediction = useStore(s => s.removeTrackedPrediction)
//   const trackedPredictions      = useStore(s => s.trackedPredictions)

//   const [selectedDays, setSelectedDays] = useState(5)
//   const [tracking,     setTracking]     = useState(false)
//   const [adding,       setAdding]       = useState(false)
//   const [message,      setMessage]      = useState(null)
//   const [showAuth,     setShowAuth]     = useState(false)

//   const currency = currentSymbol?.includes('.NS') ? '₹' : '$'
//   const price    = currentData?.current_price || 0
//   const symClean = currentSymbol?.replace('.NS','').replace('.BO','')
//   const isInWatch = watchlist.find(w => w.symbol === currentSymbol)

//   // Get prediction for selected horizon
//   const horizonMap = {
//     1: 'Intraday', 3: 'Short-term', 5: 'Medium-term',
//     21: 'Long-term', 63: 'Very Long-term'
//   }
//   const selectedHorizonKey = horizonMap[selectedDays]
//   const selectedPred = currentData?.predictions?.find(
//     p => p.horizon === selectedHorizonKey
//   ) || currentData?.predictions?.find(p => p.days === selectedDays)

//   // Check if THIS specific horizon+symbol is already tracked
//   const isTrackedForSelected = trackedPredictions.some(
//     p => p.symbol === currentSymbol &&
//          p.days === selectedDays &&
//          p.outcome === 'PENDING'
//   )

//   const showMessage = (type, text) => {
//     setMessage({ type, text })
//     setTimeout(() => setMessage(null), 4000)
//   }

//   const handleTrack = async () => {
//     if (!token) {
//       setShowAuth(true)
//       return
//     }
//     if (!currentData) return

//     // If already tracking this horizon — stop tracking
//     if (isTrackedForSelected) {
//       const pred = trackedPredictions.find(
//         p => p.symbol === currentSymbol &&
//              p.days === selectedDays &&
//              p.outcome === 'PENDING'
//       )
//       if (pred) {
//         try {
//           await trackAPI.delete(pred._id)
//           removeTrackedPrediction(pred._id, currentSymbol)
//           showMessage('success', `Stopped tracking ${symClean} (${selectedDays}d)`)
//         } catch {
//           showMessage('error', 'Failed to stop tracking')
//         }
//       }
//       return
//     }

//     // Track new prediction for selected horizon
//     setTracking(true)
//     try {
//       // Use selected pred signal or fallback to best available
//       const predToTrack = selectedPred || currentData?.predictions?.[0]
//       if (!predToTrack) return

//       const res = await trackAPI.track({
//         symbol:       currentSymbol,
//         name:         symClean,
//         signal:       predToTrack.signal,
//         confidence:   predToTrack.confidence,
//         horizon:      selectedHorizonKey,
//         days:         selectedDays,
//         priceAtTrack: price,
//       })
//       addTrackedPrediction(res.data.prediction)
//       showMessage('success',
//         `Tracking ${predToTrack.signal} for ${symClean} — ${selectedDays} days! ⏳`
//       )
//     } catch (err) {
//       showMessage('error', err.response?.data?.error || 'Failed to track')
//     } finally {
//       setTracking(false)
//     }
//   }

//   const handleWatchlist = async () => {
//     if (!currentSymbol) return
//     setAdding(true)
//     try {
//       if (isInWatch) {
//         setWatchlist(watchlist.filter(w => w.symbol !== currentSymbol), !token)
//         if (token) await watchlistAPI.remove(currentSymbol)
//         showMessage('success', `${symClean} removed from watchlist`)
//       } else {
//         const newItem = { symbol: currentSymbol, name: symClean }
//         setWatchlist([...watchlist, newItem], !token)
//         if (token) await watchlistAPI.add(currentSymbol, symClean)
//         showMessage('success',
//           token ? `${symClean} added to watchlist!`
//                 : `${symClean} added! Login to save permanently.`
//         )
//       }
//     } catch {
//       const res = await watchlistAPI.get()
//       setWatchlist(res.data.isDefault ? [] : res.data.watchlist, res.data.isDefault)
//       showMessage('error', 'Failed to update watchlist')
//     } finally {
//       setAdding(false)
//     }
//   }

//   return (
//     <>
//       <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>

//         {/* Stock info */}
//         {currentData && (
//           <div style={{
//             background: 'var(--bg3)', borderRadius: '10px',
//             padding: '12px', marginBottom: '12px',
//             border: '1px solid var(--border)'
//           }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
//               <div style={{ fontWeight: '700', fontSize: '15px' }}>{symClean}</div>
//               <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '500' }}>
//                 {currency}{price?.toLocaleString()}
//               </div>
//             </div>
//             {selectedPred && (
//               <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
//                 AI says:{' '}
//                 <span style={{
//                   color: selectedPred.signal === 'BUY'  ? 'var(--green)'
//                        : selectedPred.signal === 'SELL' ? 'var(--red)'
//                        : 'var(--amber)',
//                   fontWeight: '600'
//                 }}>{selectedPred.signal}</span>
//                 {' '}· {selectedPred.confidence}% confident · {selectedDays} days
//               </div>
//             )}
//           </div>
//         )}

//         {/* Horizon selector */}
//         <div style={{ marginBottom: '10px' }}>
//           <div style={{
//             fontSize: '10px', color: 'var(--muted)',
//             textTransform: 'uppercase', letterSpacing: '0.8px',
//             marginBottom: '6px', fontWeight: '600'
//           }}>
//             Track prediction for:
//           </div>
//           <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
//             {HORIZONS.map(h => (
//               <button
//                 key={h.days}
//                 onClick={() => h.ready && setSelectedDays(h.days)}
//                 title={!h.ready ? 'Models training — available soon!' : ''}
//                 style={{
//                   flex: '1',
//                   minWidth: '52px',
//                   padding: '7px 4px',
//                   borderRadius: '7px',
//                   border: selectedDays === h.days
//                     ? '1px solid rgba(59,130,246,0.5)'
//                     : '1px solid var(--border)',
//                   cursor: h.ready ? 'pointer' : 'not-allowed',
//                   fontSize: '11px',
//                   fontWeight: selectedDays === h.days ? '700' : '500',
//                   background: selectedDays === h.days
//                     ? 'rgba(59,130,246,0.15)'
//                     : h.ready ? 'var(--bg3)' : 'var(--bg2)',
//                   color: selectedDays === h.days
//                     ? 'var(--blue)'
//                     : h.ready ? 'var(--text)' : 'var(--muted2)',
//                   opacity: h.ready ? 1 : 0.5,
//                   transition: 'all 0.15s',
//                   position: 'relative',
//                 }}
//               >
//                 {h.label}
//                 {!h.ready && (
//                   <div style={{
//                     position: 'absolute', top: '-6px', right: '-4px',
//                     background: 'var(--amber)', color: '#000',
//                     fontSize: '7px', fontWeight: '700',
//                     padding: '1px 3px', borderRadius: '3px',
//                     lineHeight: 1.2
//                   }}>
//                     SOON
//                   </div>
//                 )}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Selected horizon AI signal */}
//         {selectedPred && (
//           <div style={{
//             background: 'var(--bg3)', borderRadius: '8px',
//             padding: '8px 10px', marginBottom: '10px',
//             border: '1px solid var(--border)',
//             display: 'flex', justifyContent: 'space-between', alignItems: 'center'
//           }}>
//             <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
//               {selectedDays}d signal
//             </div>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span style={{
//                 fontSize: '12px', fontWeight: '700',
//                 color: selectedPred.signal === 'BUY'  ? 'var(--green)'
//                      : selectedPred.signal === 'SELL' ? 'var(--red)'
//                      : 'var(--amber)'
//               }}>{selectedPred.signal}</span>
//               <span style={{
//                 fontSize: '11px', color: 'var(--muted)',
//                 fontFamily: 'var(--mono)'
//               }}>{selectedPred.confidence}%</span>
//             </div>
//           </div>
//         )}

//         {/* Track button */}
//         <button
//           onClick={handleTrack}
//           disabled={tracking || !currentData}
//           style={{
//             width: '100%', padding: '11px', borderRadius: '9px',
//             border: isTrackedForSelected ? '1px solid rgba(255,77,106,0.3)' : 'none',
//             cursor: tracking || !currentData ? 'not-allowed' : 'pointer',
//             fontSize: '13px', fontWeight: '700',
//             background: isTrackedForSelected
//               ? 'rgba(255,77,106,0.1)'
//               : 'linear-gradient(135deg, #2563eb, #8b5cf6)',
//             color: isTrackedForSelected ? 'var(--red)' : '#fff',
//             opacity: tracking || !currentData ? 0.6 : 1,
//             marginBottom: '6px', transition: 'all 0.15s'
//           }}
//         >
//           {tracking ? 'Processing...'
//             : isTrackedForSelected ? `✕ Stop Tracking (${selectedDays}d)`
//             : `📊 Track ${selectedDays}-Day Prediction`}
//         </button>

//         {!token && (
//           <div style={{
//             fontSize: '10px', color: 'var(--muted2)',
//             textAlign: 'center', marginBottom: '8px'
//           }}>
//             🔒 Login required to track predictions
//           </div>
//         )}

//         {/* Watchlist button */}
//         <button
//           onClick={handleWatchlist}
//           disabled={adding || !currentSymbol}
//           style={{
//             width: '100%', padding: '10px', borderRadius: '9px',
//             border: `1px solid ${isInWatch ? 'rgba(255,77,106,0.3)' : 'rgba(59,130,246,0.3)'}`,
//             cursor: adding || !currentSymbol ? 'not-allowed' : 'pointer',
//             fontSize: '13px', fontWeight: '600',
//             background: isInWatch ? 'rgba(255,77,106,0.1)' : 'rgba(59,130,246,0.1)',
//             color: isInWatch ? 'var(--red)' : 'var(--blue)',
//             opacity: adding || !currentSymbol ? 0.6 : 1,
//             transition: 'all 0.15s'
//           }}
//         >
//           {adding ? 'Updating...'
//             : isInWatch ? '✕ Remove from Watchlist'
//             : '+ Add to Watchlist'}
//         </button>

//         {!token && !isInWatch && (
//           <div style={{
//             fontSize: '10px', color: 'var(--muted2)',
//             textAlign: 'center', marginTop: '6px'
//           }}>
//             Login to save watchlist permanently
//           </div>
//         )}

//         {/* Message */}
//         {message && (
//           <div style={{
//             marginTop: '10px', padding: '9px 12px', borderRadius: '7px',
//             fontSize: '12px',
//             background: message.type === 'success' ? 'rgba(0,212,160,0.1)' : 'rgba(255,77,106,0.1)',
//             color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
//             border: `1px solid ${message.type === 'success' ? 'rgba(0,212,160,0.2)' : 'rgba(255,77,106,0.2)'}`,
//             lineHeight: '1.4'
//           }}>{message.text}</div>
//         )}
//       </div>

//       {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
//     </>
//   )
// }

import { useState } from 'react'
import useStore from '../../store'
import { trackAPI, watchlistAPI } from '../../services/api'
import AuthModal from '../auth/AuthModal'

const HORIZONS = [
  { days: 1,  label: '1 Day',    key: 'Intraday',       ready: true },
  { days: 3,  label: '3 Days',   key: 'Short-term',     ready: true },
  { days: 5,  label: '5 Days',   key: 'Medium-term',    ready: true },
  { days: 21, label: '1 Month',  key: 'Long-term',      ready: true },
  { days: 63, label: '3 Months', key: 'Very Long-term', ready: true },
]

// Price target multipliers per horizon
const TARGET_MULTIPLIERS = { 1: 0.02, 3: 0.05, 5: 0.08, 21: 0.15, 63: 0.25 }

function getTargets(price, pred, days) {
  if (!pred || !price) return null
  const mult     = TARGET_MULTIPLIERS[days] || 0.08
  const prob     = pred.probability_up / 100
  const target   = price * (1 + (prob - 0.5) * mult * 2)
  const stopLoss = price * (1 - (1 - prob) * mult * 2)
  const reward   = Math.abs(target - price)
  const risk     = Math.abs(price - stopLoss)
  const rr       = risk > 0 ? (reward / risk).toFixed(1) : 'N/A'
  return {
    target:   parseFloat(target.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    targetPct:   (((target - price) / price) * 100).toFixed(1),
    stopLossPct: (((stopLoss - price) / price) * 100).toFixed(1),
    rr,
  }
}

function getExpiryDate(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Prediction Detail Modal ───────────────────────────────────────────────────
function PredictionModal({ pred, days, symbol, price, currency, onConfirm, onClose, tracking }) {
  const symClean = symbol?.replace('.NS','').replace('.BO','')
  const targets  = getTargets(price, pred, days)
  const expiry   = getExpiryDate(days)
  const horizonLabel = HORIZONS.find(h => h.days === days)?.label || `${days} Days`

  const signalColor = pred?.signal === 'BUY'  ? 'var(--green)'
                    : pred?.signal === 'SELL' ? 'var(--red)'
                    : 'var(--amber)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)', borderRadius: '16px',
          border: '1px solid var(--border2)',
          width: '100%', maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `${signalColor}10`,
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>
              {symClean} — {horizonLabel}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              AI Prediction Details
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--muted)', fontSize: '20px', cursor: 'pointer',
            lineHeight: 1, padding: '4px',
          }}>×</button>
        </div>

        {/* Signal */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: signalColor }}>
                {pred?.signal}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                {pred?.confidence}% confident · {pred?.probability_up}% chance up
              </div>
            </div>
            {/* Confidence bar */}
            <div style={{ width: '100px' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '4px', textAlign: 'right' }}>
                AI Confidence
              </div>
              <div style={{ height: '6px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pred?.confidence}%`, height: '100%',
                  background: signalColor, borderRadius: '3px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontSize: '10px', color: signalColor, textAlign: 'right', marginTop: '2px', fontWeight: '600' }}>
                {pred?.confidence}%
              </div>
            </div>
          </div>
        </div>

        {/* Price targets */}
        {targets && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', fontWeight: '600' }}>
              Price Levels
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {/* Stop loss */}
              <div style={{ background: 'rgba(255,77,106,0.08)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,77,106,0.15)' }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Stop Loss</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', color: 'var(--red)' }}>
                  {currency}{targets.stopLoss.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--red)' }}>{targets.stopLossPct}%</div>
              </div>

              {/* Entry */}
              <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border2)' }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Entry Now</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                  {currency}{price?.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>current</div>
              </div>

              {/* Target */}
              <div style={{ background: 'rgba(0,212,160,0.08)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(0,212,160,0.15)' }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Target</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', color: 'var(--green)' }}>
                  {currency}{targets.target.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--green)' }}>+{targets.targetPct}%</div>
              </div>
            </div>

            {/* Risk/Reward + Expiry */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Risk/Reward</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: parseFloat(targets.rr) >= 1.5 ? 'var(--green)' : 'var(--amber)' }}>
                  {targets.rr}x
                </div>
              </div>
              <div style={{ flex: 2, background: 'var(--bg3)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Expires</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                  {expiry}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action hint */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>
            {pred?.signal === 'BUY'
              ? `💡 AI suggests buying at ${currency}${price?.toLocaleString()} and selling at target ${currency}${targets?.target.toLocaleString()} on ${expiry}`
              : pred?.signal === 'SELL'
              ? `💡 AI suggests selling at ${currency}${price?.toLocaleString()} and covering at ${currency}${targets?.target.toLocaleString()} on ${expiry}`
              : `💡 AI suggests holding — no clear direction for ${days} days. Wait for a stronger signal.`
            }
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted2)', lineHeight: 1.4 }}>
            ⚠️ AI analysis only — not financial advice. Always do your own research.
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: '16px 20px', display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: '8px',
            border: '1px solid var(--border2)', background: 'transparent',
            color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
          }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={tracking}
            style={{
              flex: 2, padding: '10px', borderRadius: '8px',
              border: 'none', cursor: tracking ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '700',
              background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
              color: '#fff', opacity: tracking ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {tracking ? 'Tracking...' : `📊 Track ${horizonLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Duplicate Warning Modal ───────────────────────────────────────────────────
function DuplicateWarningModal({ symbol, days, existingPred, onConfirm, onClose }) {
  const symClean     = symbol?.replace('.NS','').replace('.BO','')
  const horizonLabel = HORIZONS.find(h => h.days === days)?.label || `${days} Days`
  const trackedAgo   = existingPred ? Math.floor((Date.now() - new Date(existingPred.trackedAt)) / 60000) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1001,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)', borderRadius: '16px',
          border: '1px solid var(--border2)',
          width: '100%', maxWidth: '360px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
            Already Tracking {symClean}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {horizonLabel} prediction
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            background: 'var(--bg3)', borderRadius: '8px',
            padding: '12px', border: '1px solid var(--border)',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
              Existing prediction
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>
              {existingPred?.signal} @ {existingPred?.symbol?.includes('.NS') ? '₹' : '$'}{existingPred?.priceAtTrack?.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Added {trackedAgo < 60 ? `${trackedAgo} mins ago` : `${Math.floor(trackedAgo/60)} hours ago`}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5', textAlign: 'center' }}>
            Add another to compare AI accuracy over different entry points?
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: '16px 20px', display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: '8px',
            border: '1px solid var(--border2)', background: 'transparent',
            color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            flex: 2, padding: '10px', borderRadius: '8px',
            border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '700',
            background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
            color: '#fff',
          }}>
            Add Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ActionPanel() {
  const currentData             = useStore(s => s.currentData)
  const currentSymbol           = useStore(s => s.currentSymbol)
  const token                   = useStore(s => s.token)
  const setWatchlist            = useStore(s => s.setWatchlist)
  const watchlist               = useStore(s => s.watchlist)
  const addTrackedPrediction    = useStore(s => s.addTrackedPrediction)
  const removeTrackedPrediction = useStore(s => s.removeTrackedPrediction)
  const trackedPredictions      = useStore(s => s.trackedPredictions)

  const [selectedDays,    setSelectedDays]    = useState(5)
  const [tracking,        setTracking]        = useState(false)
  const [adding,          setAdding]          = useState(false)
  const [message,         setMessage]         = useState(null)
  const [showAuth,        setShowAuth]        = useState(false)
  const [showModal,       setShowModal]       = useState(false)
  const [showDuplicate,   setShowDuplicate]   = useState(false)

  const currency = currentSymbol?.includes('.NS') ? '₹' : '$'
  const price    = currentData?.current_price || 0
  const symClean = currentSymbol?.replace('.NS','').replace('.BO','')
  const isInWatch = watchlist.find(w => w.symbol === currentSymbol)

  const horizonMap = {
    1: 'Intraday', 3: 'Short-term', 5: 'Medium-term',
    21: 'Long-term', 63: 'Very Long-term'
  }
  const selectedHorizonKey = horizonMap[selectedDays]
  const selectedPred = currentData?.predictions?.find(
    p => p.horizon === selectedHorizonKey
  ) || currentData?.predictions?.find(p => p.days === selectedDays)

  // Check for existing pending prediction for this symbol + horizon
  const existingPred = trackedPredictions.find(
    p => p.symbol === currentSymbol &&
         p.days === selectedDays &&
         p.outcome === 'PENDING'
  )

  // Check if tracked within last hour
  const trackedWithinHour = existingPred &&
    (Date.now() - new Date(existingPred.trackedAt)) < 60 * 60 * 1000

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // Handle horizon button click — open modal
  const handleHorizonClick = (days) => {
    if (!currentData) return
    setSelectedDays(days)
    if (token) setShowModal(true)
    else setShowAuth(true)
  }

  // Handle confirm from modal
  const handleConfirmTrack = async () => {
    // Check for duplicate within 1 hour
    if (trackedWithinHour) {
      setShowModal(false)
      setShowDuplicate(true)
      return
    }
    await doTrack()
  }

  // Actually track
  const doTrack = async () => {
    setShowModal(false)
    setShowDuplicate(false)
    setTracking(true)
    try {
      const predToTrack = selectedPred || currentData?.predictions?.[0]
      if (!predToTrack) return
      const res = await trackAPI.track({
        symbol:       currentSymbol,
        name:         symClean,
        signal:       predToTrack.signal,
        confidence:   predToTrack.confidence,
        horizon:      selectedHorizonKey,
        days:         selectedDays,
        priceAtTrack: price,
      })
      addTrackedPrediction(res.data.prediction)
      showMessage('success', `Tracking ${predToTrack.signal} for ${symClean} — ${selectedDays} days! ⏳`)
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
          token ? `${symClean} added to watchlist!`
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{symClean}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '500' }}>
                {currency}{price?.toLocaleString()}
              </div>
            </div>
            {selectedPred && (
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                AI says:{' '}
                <span style={{
                  color: selectedPred.signal === 'BUY'  ? 'var(--green)'
                       : selectedPred.signal === 'SELL' ? 'var(--red)'
                       : 'var(--amber)',
                  fontWeight: '600'
                }}>{selectedPred.signal}</span>
                {' '}· {selectedPred.confidence}% · {selectedDays} days
              </div>
            )}
          </div>
        )}

        {/* Horizon selector */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{
            fontSize: '10px', color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.8px',
            marginBottom: '6px', fontWeight: '600'
          }}>
            Track prediction for:
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {HORIZONS.map(h => (
              <button
                key={h.days}
                onClick={() => handleHorizonClick(h.days)}
                disabled={!currentData}
                style={{
                  flex: '1', minWidth: '52px',
                  padding: '7px 4px', borderRadius: '7px',
                  border: selectedDays === h.days
                    ? '1px solid rgba(59,130,246,0.5)'
                    : '1px solid var(--border)',
                  cursor: currentData ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  fontWeight: selectedDays === h.days ? '700' : '500',
                  background: selectedDays === h.days
                    ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
                  color: selectedDays === h.days ? 'var(--blue)' : 'var(--text)',
                  opacity: currentData ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}
              >
                {h.label}
              </button>
            ))}
          </div>
          {!token && (
            <div style={{ fontSize: '10px', color: 'var(--muted2)', marginTop: '6px', textAlign: 'center' }}>
              🔒 Login to track predictions
            </div>
          )}
        </div>

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
          <div style={{ fontSize: '10px', color: 'var(--muted2)', textAlign: 'center', marginTop: '6px' }}>
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

      {/* Prediction Detail Modal */}
      {showModal && selectedPred && (
        <PredictionModal
          pred={selectedPred}
          days={selectedDays}
          symbol={currentSymbol}
          price={price}
          currency={currency}
          onConfirm={handleConfirmTrack}
          onClose={() => setShowModal(false)}
          tracking={tracking}
        />
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicate && (
        <DuplicateWarningModal
          symbol={currentSymbol}
          days={selectedDays}
          existingPred={existingPred}
          onConfirm={doTrack}
          onClose={() => setShowDuplicate(false)}
        />
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}