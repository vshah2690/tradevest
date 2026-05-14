// import { useEffect } from 'react'
// import useStore from '../../store'
// import { trackAPI } from '../../services/api'

// export default function TrackedPanel() {
//   const token                   = useStore(s => s.token)
//   const trackedPredictions      = useStore(s => s.trackedPredictions)
//   const setTrackedPredictions   = useStore(s => s.setTrackedPredictions)
//   const removeTrackedPrediction = useStore(s => s.removeTrackedPrediction)

//   // Load predictions on mount and when token changes
//   useEffect(() => {
//     if (!token) { setTrackedPredictions([]); return }
//     trackAPI.getAll()
//       .then(res => setTrackedPredictions(res.data.predictions || []))
//       .catch(() => {})
//   }, [token])

//   // Delete handler — instant UI update + API call
//   const handleDelete = async (id, symbol) => {
//     removeTrackedPrediction(id, symbol) // updates store immediately
//     try {
//       await trackAPI.delete(id)
//     } catch {}
//   }

//   // Calculate stats from store data
//   const predictions = trackedPredictions
//   const completed   = predictions.filter(p => p.outcome !== 'PENDING')
//   const correct     = completed.filter(p => p.outcome === 'CORRECT').length
//   const stats = {
//     total:     predictions.length,
//     pending:   predictions.filter(p => p.outcome === 'PENDING').length,
//     correct,
//     incorrect: completed.length - correct,
//     accuracy:  completed.length > 0
//       ? Math.round((correct / completed.length) * 100)
//       : null
//   }

//   if (!token) {
//     return (
//       <div style={{
//         flex: 1, display: 'flex', flexDirection: 'column',
//         alignItems: 'center', justifyContent: 'center',
//         padding: '24px', gap: '12px'
//       }}>
//         <div style={{ fontSize: '32px' }}>📊</div>
//         <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
//           Track AI Predictions
//         </div>
//         <div style={{
//           fontSize: '11px', color: 'var(--muted)',
//           textAlign: 'center', lineHeight: '1.5'
//         }}>
//           Login to track predictions and see if the AI is right
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

//       {/* Stats header */}
//       {stats.total > 0 && (
//         <div style={{
//           padding:      '12px 14px',
//           borderBottom: '1px solid var(--border)',
//           background:   'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.06))'
//         }}>
//           <div style={{
//             fontSize: '10px', color: 'var(--muted)',
//             textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px'
//           }}>
//             AI Prediction Accuracy
//           </div>
//           <div style={{ display: 'flex', gap: '12px' }}>
//             <div style={{ textAlign: 'center' }}>
//               <div style={{
//                 fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500',
//                 color: stats.accuracy !== null
//                   ? (stats.accuracy >= 60 ? 'var(--green)' : 'var(--amber)')
//                   : 'var(--muted)'
//               }}>
//                 {stats.accuracy !== null ? `${stats.accuracy}%` : '--'}
//               </div>
//               <div style={{ fontSize: '10px', color: 'var(--muted)' }}>accuracy</div>
//             </div>
//             <div style={{ textAlign: 'center' }}>
//               <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500', color: 'var(--green)' }}>
//                 {stats.correct}
//               </div>
//               <div style={{ fontSize: '10px', color: 'var(--muted)' }}>correct</div>
//             </div>
//             <div style={{ textAlign: 'center' }}>
//               <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500', color: 'var(--red)' }}>
//                 {stats.incorrect}
//               </div>
//               <div style={{ fontSize: '10px', color: 'var(--muted)' }}>wrong</div>
//             </div>
//             <div style={{ textAlign: 'center' }}>
//               <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500', color: 'var(--amber)' }}>
//                 {stats.pending}
//               </div>
//               <div style={{ fontSize: '10px', color: 'var(--muted)' }}>pending</div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Predictions list */}
//       <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
//         <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px' }}>
//           Tracked Predictions
//         </div>

//         {predictions.length === 0 && (
//           <div style={{
//             textAlign: 'center', color: 'var(--muted)',
//             fontSize: '11px', padding: '16px', lineHeight: '1.8'
//           }}>
//             No tracked predictions yet.
//             <br />
//             Click "Track This Prediction" on any stock!
//           </div>
//         )}

//         {predictions.map((pred, i) => {
//           const isCorrect  = pred.outcome === 'CORRECT'
//           const isWrong    = pred.outcome === 'INCORRECT'
//           const targetDate = new Date(pred.targetDate)
//           const daysLeft   = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24))

//           return (
//             <div key={pred._id || i} style={{
//               background:   'var(--bg3)',
//               border:       `1px solid ${
//                 isCorrect ? 'rgba(0,212,160,0.2)'
//                 : isWrong ? 'rgba(255,77,106,0.2)'
//                 : 'var(--border)'}`,
//               borderRadius: '8px',
//               padding:      '10px 12px',
//               marginBottom: '8px',
//               position:     'relative',
//             }}>

//               {/* Delete button */}
//               <button
//                 onClick={() => handleDelete(pred._id, pred.symbol)}
//                 title="Remove"
//                 style={{
//                   position:   'absolute', top: '6px', right: '6px',
//                   background: 'transparent', border: 'none',
//                   color:      'var(--muted2)', fontSize: '16px',
//                   cursor:     'pointer', padding: '0 4px',
//                   lineHeight: 1, borderRadius: '4px',
//                   transition: 'color 0.15s'
//                 }}
//                 onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
//                 onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}
//               >×</button>

//               {/* Top row */}
//               <div style={{
//                 display: 'flex', justifyContent: 'space-between',
//                 marginBottom: '4px', paddingRight: '20px'
//               }}>
//                 <span style={{ fontWeight: '700', fontSize: '12px' }}>
//                   {pred.symbol.replace('.NS','').replace('.BO','')}
//                 </span>
//                 <span style={{
//                   fontSize: '11px', fontWeight: '600',
//                   padding: '2px 8px', borderRadius: '4px',
//                   background: isCorrect ? 'rgba(0,212,160,0.15)'
//                     : isWrong  ? 'rgba(255,77,106,0.15)'
//                     : 'rgba(245,158,11,0.15)',
//                   color: isCorrect ? 'var(--green)'
//                     : isWrong ? 'var(--red)'
//                     : 'var(--amber)'
//                 }}>
//                   {isCorrect ? '✓ Correct'
//                     : isWrong ? '✗ Wrong'
//                     : daysLeft > 0 ? `⏳ ${daysLeft}d left`
//                     : '⏳ Due today'}
//                 </span>
//               </div>

//               {/* Signal + price */}
//               <div style={{
//                 display: 'flex', justifyContent: 'space-between',
//                 fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)'
//               }}>
//                 <span>
//                   <span style={{
//                     color: pred.signal === 'BUY'  ? 'var(--green)'
//                          : pred.signal === 'SELL' ? 'var(--red)'
//                          : 'var(--amber)',
//                     fontWeight: '600'
//                   }}>{pred.signal}</span>
//                   {' '}@ {pred.symbol.includes('.NS') ? '₹' : '$'}{pred.priceAtTrack?.toFixed(2)}
//                 </span>
//                 {pred.returnPct !== undefined && pred.returnPct !== null && (
//                   <span style={{ color: pred.returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
//                     {pred.returnPct >= 0 ? '+' : ''}{pred.returnPct?.toFixed(2)}%
//                   </span>
//                 )}
//               </div>

//               {/* Horizon + confidence */}
//               <div style={{ fontSize: '10px', color: 'var(--muted2)', marginTop: '3px' }}>
//                 {pred.horizon} · {pred.confidence}% confidence
//               </div>
//             </div>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

import { useEffect, useState } from 'react'
import useStore from '../../store'
import { trackAPI } from '../../services/api'
import usePrediction from '../../hooks/usePrediction'

// ── Prediction Detail Modal ───────────────────────────────────────────────────
function PredictionDetailModal({ pred, onClose, onDelete, onViewStock }) {
  if (!pred) return null

  const currency  = pred.symbol?.includes('.NS') ? '₹' : '$'
  const symClean  = pred.symbol?.replace('.NS','').replace('.BO','')
  const isCorrect = pred.outcome === 'CORRECT'
  const isWrong   = pred.outcome === 'INCORRECT'
  const isPending = pred.outcome === 'PENDING'

  const trackedDate  = new Date(pred.trackedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
  const expiryDate = new Date(pred.targetDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
  const daysLeft = Math.ceil((new Date(pred.targetDate) - new Date()) / (1000 * 60 * 60 * 24))

  const signalColor = pred.signal === 'BUY'  ? 'var(--green)'
                    : pred.signal === 'SELL' ? 'var(--red)'
                    : 'var(--amber)'

  const outcomeColor = isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : 'var(--amber)'
  const outcomeBg    = isCorrect ? 'rgba(0,212,160,0.1)' : isWrong ? 'rgba(255,77,106,0.1)' : 'rgba(245,158,11,0.1)'
  const outcomeBorder = isCorrect ? 'rgba(0,212,160,0.2)' : isWrong ? 'rgba(255,77,106,0.2)' : 'rgba(245,158,11,0.2)'

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
          background: `${outcomeColor}10`,
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>
              {symClean} — {pred.horizon}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              {pred.days}-day prediction
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '12px', fontWeight: '700',
              padding: '4px 10px', borderRadius: '6px',
              background: outcomeBg, color: outcomeColor,
              border: `1px solid ${outcomeBorder}`
            }}>
              {isCorrect ? '✓ Correct' : isWrong ? '✗ Wrong' : daysLeft > 0 ? `⏳ ${daysLeft}d left` : '⏳ Due today'}
            </span>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none',
              color: 'var(--muted)', fontSize: '20px', cursor: 'pointer',
              lineHeight: 1, padding: '4px',
            }}>×</button>
          </div>
        </div>

        {/* AI Signal */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>AI Signal</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: signalColor }}>
                {pred.signal}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {pred.confidence}% confidence
              </div>
            </div>

            {/* Outcome summary */}
            {!isPending && (
              <div style={{
                background: outcomeBg, border: `1px solid ${outcomeBorder}`,
                borderRadius: '10px', padding: '12px 16px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                  {isCorrect ? '🎯' : '❌'}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: outcomeColor }}>
                  AI was {isCorrect ? 'RIGHT' : 'WRONG'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  {pred.returnPct >= 0 ? '+' : ''}{pred.returnPct?.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price details */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', fontWeight: '600' }}>
            Price Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isPending ? '1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>

            {/* Entry price */}
            <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {isPending ? 'Entry Price' : 'Entry Price'}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600' }}>
                {currency}{pred.priceAtTrack?.toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>when tracked</div>
            </div>

            {/* Current / Exit price */}
            {isPending ? (
              <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Expires</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', color: 'var(--amber)' }}>
                  {expiryDate}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                  {daysLeft > 0 ? `${daysLeft} days left` : 'due today'}
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  background: pred.returnPct >= 0 ? 'rgba(0,212,160,0.08)' : 'rgba(255,77,106,0.08)',
                  borderRadius: '8px', padding: '10px',
                  border: `1px solid ${pred.returnPct >= 0 ? 'rgba(0,212,160,0.15)' : 'rgba(255,77,106,0.15)'}`
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Exit Price</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', color: pred.returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {currency}{pred.currentPrice?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10px', color: pred.returnPct >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>
                    {pred.returnPct >= 0 ? '+' : ''}{pred.returnPct?.toFixed(2)}%
                  </div>
                </div>

                <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Resolved</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600' }}>
                    {expiryDate}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>after {pred.days} days</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Insight */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>
            {isPending
              ? `⏳ AI predicted ${pred.signal} on ${trackedDate}. Check back on ${expiryDate} to see if it was right.`
              : isCorrect
              ? `🎯 AI predicted ${pred.signal} and was RIGHT! Price moved ${pred.returnPct >= 0 ? 'up' : 'down'} ${Math.abs(pred.returnPct?.toFixed(2))}% as expected.`
              : `❌ AI predicted ${pred.signal} but was WRONG. Price moved ${pred.returnPct >= 0 ? '+' : ''}${pred.returnPct?.toFixed(2)}% in the opposite direction.`
            }
          </div>
        </div>

        {/* Tracked date */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted2)' }}>
            Tracked on {trackedDate} · {pred.horizon} · {pred.confidence}% confidence
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: '16px 20px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { onDelete(pred._id, pred.symbol); onClose() }}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              border: '1px solid rgba(255,77,106,0.3)',
              background: 'rgba(255,77,106,0.1)',
              color: 'var(--red)', cursor: 'pointer',
              fontSize: '12px', fontWeight: '600',
            }}
          >
            Delete
          </button>
          <button
            onClick={() => { onViewStock(pred.symbol); onClose() }}
            style={{
              flex: 2, padding: '10px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '700',
              background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
              color: '#fff',
            }}
          >
            View {pred.symbol.replace('.NS','').replace('.BO','')} Chart
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TrackedPanel() {
  const token                   = useStore(s => s.token)
  const trackedPredictions      = useStore(s => s.trackedPredictions)
  const setTrackedPredictions   = useStore(s => s.setTrackedPredictions)
  const removeTrackedPrediction = useStore(s => s.removeTrackedPrediction)
  const setCurrentSymbol        = useStore(s => s.setCurrentSymbol)
  const setCurrentName          = useStore(s => s.setCurrentName)
  const { predict }             = usePrediction()

  const [selectedPred, setSelectedPred] = useState(null)
  const [activeTab,    setActiveTab]    = useState('pending')

  useEffect(() => {
    if (!token) { setTrackedPredictions([]); return }
    trackAPI.getAll()
      .then(res => setTrackedPredictions(res.data.predictions || []))
      .catch(() => {})
  }, [token])

  const handleDelete = async (id, symbol) => {
    removeTrackedPrediction(id, symbol)
    try { await trackAPI.delete(id) } catch {}
  }

  const handleViewStock = (symbol) => {
    setCurrentSymbol(symbol)
    predict(symbol)
  }

  const predictions = trackedPredictions
  const pending     = predictions.filter(p => p.outcome === 'PENDING')
  const resolved    = predictions.filter(p => p.outcome !== 'PENDING')
  const completed   = resolved
  const correct     = completed.filter(p => p.outcome === 'CORRECT').length
  const stats = {
    total:     predictions.length,
    pending:   pending.length,
    correct,
    incorrect: completed.length - correct,
    accuracy:  completed.length > 0
      ? Math.round((correct / completed.length) * 100)
      : null
  }

  const displayList = activeTab === 'pending' ? pending : resolved

  if (!token) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px', gap: '12px'
      }}>
        <div style={{ fontSize: '32px' }}>📊</div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
          Track AI Predictions
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', lineHeight: '1.5' }}>
          Login to track predictions and see if the AI is right
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Stats header */}
      {stats.total > 0 && (
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.06))'
        }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
            AI Prediction Accuracy
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { val: stats.accuracy !== null ? `${stats.accuracy}%` : '--', label: 'accuracy', color: stats.accuracy !== null ? (stats.accuracy >= 60 ? 'var(--green)' : 'var(--amber)') : 'var(--muted)' },
              { val: stats.correct,   label: 'correct',  color: 'var(--green)' },
              { val: stats.incorrect, label: 'wrong',    color: 'var(--red)'   },
              { val: stats.pending,   label: 'pending',  color: 'var(--amber)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500', color: s.color }}>
                  {s.val}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        {[
          { id: 'pending',  label: `Pending (${pending.length})`  },
          { id: 'resolved', label: `Resolved (${resolved.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '9px', border: 'none',
              cursor: 'pointer', fontSize: '11px', fontWeight: '600',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--blue)' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {displayList.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '11px', padding: '24px', lineHeight: '1.8' }}>
            {activeTab === 'pending'
              ? 'No pending predictions.\nClick a horizon button on any stock!'
              : 'No resolved predictions yet.\nCome back after your prediction expires!'
            }
          </div>
        )}

        {displayList.map((pred, i) => {
          const isCorrect  = pred.outcome === 'CORRECT'
          const isWrong    = pred.outcome === 'INCORRECT'
          const isPending  = pred.outcome === 'PENDING'
          const targetDate = new Date(pred.targetDate)
          const daysLeft   = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24))
          const currency   = pred.symbol?.includes('.NS') ? '₹' : '$'

          return (
            <div
              key={pred._id || i}
              onClick={() => setSelectedPred(pred)}
              style={{
                background:   'var(--bg3)',
                border:       `1px solid ${isCorrect ? 'rgba(0,212,160,0.2)' : isWrong ? 'rgba(255,77,106,0.2)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding:      '10px 12px',
                marginBottom: '8px',
                position:     'relative',
                cursor:       'pointer',
                transition:   'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.border = `1px solid ${isCorrect ? 'rgba(0,212,160,0.4)' : isWrong ? 'rgba(255,77,106,0.4)' : 'var(--border2)'}`}
              onMouseLeave={e => e.currentTarget.style.border = `1px solid ${isCorrect ? 'rgba(0,212,160,0.2)' : isWrong ? 'rgba(255,77,106,0.2)' : 'var(--border)'}`}
            >
              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(pred._id, pred.symbol) }}
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: 'transparent', border: 'none',
                  color: 'var(--muted2)', fontSize: '16px',
                  cursor: 'pointer', padding: '0 4px',
                  lineHeight: 1, borderRadius: '4px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}
              >×</button>

              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', paddingRight: '20px' }}>
                <span style={{ fontWeight: '700', fontSize: '12px' }}>
                  {pred.symbol.replace('.NS','').replace('.BO','')}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: '600',
                  padding: '2px 8px', borderRadius: '4px',
                  background: isCorrect ? 'rgba(0,212,160,0.15)' : isWrong ? 'rgba(255,77,106,0.15)' : 'rgba(245,158,11,0.15)',
                  color: isCorrect ? 'var(--green)' : isWrong ? 'var(--red)' : 'var(--amber)'
                }}>
                  {isCorrect ? '✓ Correct' : isWrong ? '✗ Wrong' : daysLeft > 0 ? `⏳ ${daysLeft}d left` : '⏳ Due today'}
                </span>
              </div>

              {/* Signal + price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                <span>
                  <span style={{
                    color: pred.signal === 'BUY' ? 'var(--green)' : pred.signal === 'SELL' ? 'var(--red)' : 'var(--amber)',
                    fontWeight: '600'
                  }}>{pred.signal}</span>
                  {' '}@ {currency}{pred.priceAtTrack?.toFixed(2)}
                </span>
                {pred.returnPct !== undefined && pred.returnPct !== null && (
                  <span style={{ color: pred.returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {pred.returnPct >= 0 ? '+' : ''}{pred.returnPct?.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Horizon */}
              <div style={{ fontSize: '10px', color: 'var(--muted2)', marginTop: '3px' }}>
                {pred.horizon} · {pred.confidence}% confidence · tap for details
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Modal */}
      {selectedPred && (
        <PredictionDetailModal
          pred={selectedPred}
          onClose={() => setSelectedPred(null)}
          onDelete={handleDelete}
          onViewStock={handleViewStock}
        />
      )}
    </div>
  )
}