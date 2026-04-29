import { useEffect } from 'react'
import useStore from '../../store'
import { trackAPI } from '../../services/api'

export default function TrackedPanel() {
  const token                   = useStore(s => s.token)
  const trackedPredictions      = useStore(s => s.trackedPredictions)
  const setTrackedPredictions   = useStore(s => s.setTrackedPredictions)
  const removeTrackedPrediction = useStore(s => s.removeTrackedPrediction)

  // Load predictions on mount and when token changes
  useEffect(() => {
    if (!token) { setTrackedPredictions([]); return }
    trackAPI.getAll()
      .then(res => setTrackedPredictions(res.data.predictions || []))
      .catch(() => {})
  }, [token])

  // Delete handler — instant UI update + API call
  const handleDelete = async (id, symbol) => {
    removeTrackedPrediction(id, symbol) // updates store immediately
    try {
      await trackAPI.delete(id)
    } catch {}
  }

  // Calculate stats from store data
  const predictions = trackedPredictions
  const completed   = predictions.filter(p => p.outcome !== 'PENDING')
  const correct     = completed.filter(p => p.outcome === 'CORRECT').length
  const stats = {
    total:     predictions.length,
    pending:   predictions.filter(p => p.outcome === 'PENDING').length,
    correct,
    incorrect: completed.length - correct,
    accuracy:  completed.length > 0
      ? Math.round((correct / completed.length) * 100)
      : null
  }

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
        <div style={{
          fontSize: '11px', color: 'var(--muted)',
          textAlign: 'center', lineHeight: '1.5'
        }}>
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
          padding:      '12px 14px',
          borderBottom: '1px solid var(--border)',
          background:   'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.06))'
        }}>
          <div style={{
            fontSize: '10px', color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px'
          }}>
            AI Prediction Accuracy
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500',
                color: stats.accuracy !== null
                  ? (stats.accuracy >= 60 ? 'var(--green)' : 'var(--amber)')
                  : 'var(--muted)'
              }}>
                {stats.accuracy !== null ? `${stats.accuracy}%` : '--'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>accuracy</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500', color: 'var(--green)' }}>
                {stats.correct}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>correct</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500', color: 'var(--red)' }}>
                {stats.incorrect}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>wrong</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '500', color: 'var(--amber)' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>pending</div>
            </div>
          </div>
        </div>
      )}

      {/* Predictions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '8px' }}>
          Tracked Predictions
        </div>

        {predictions.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'var(--muted)',
            fontSize: '11px', padding: '16px', lineHeight: '1.8'
          }}>
            No tracked predictions yet.
            <br />
            Click "Track This Prediction" on any stock!
          </div>
        )}

        {predictions.map((pred, i) => {
          const isCorrect  = pred.outcome === 'CORRECT'
          const isWrong    = pred.outcome === 'INCORRECT'
          const targetDate = new Date(pred.targetDate)
          const daysLeft   = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24))

          return (
            <div key={pred._id || i} style={{
              background:   'var(--bg3)',
              border:       `1px solid ${
                isCorrect ? 'rgba(0,212,160,0.2)'
                : isWrong ? 'rgba(255,77,106,0.2)'
                : 'var(--border)'}`,
              borderRadius: '8px',
              padding:      '10px 12px',
              marginBottom: '8px',
              position:     'relative',
            }}>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(pred._id, pred.symbol)}
                title="Remove"
                style={{
                  position:   'absolute', top: '6px', right: '6px',
                  background: 'transparent', border: 'none',
                  color:      'var(--muted2)', fontSize: '16px',
                  cursor:     'pointer', padding: '0 4px',
                  lineHeight: 1, borderRadius: '4px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}
              >×</button>

              {/* Top row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: '4px', paddingRight: '20px'
              }}>
                <span style={{ fontWeight: '700', fontSize: '12px' }}>
                  {pred.symbol.replace('.NS','').replace('.BO','')}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: '600',
                  padding: '2px 8px', borderRadius: '4px',
                  background: isCorrect ? 'rgba(0,212,160,0.15)'
                    : isWrong  ? 'rgba(255,77,106,0.15)'
                    : 'rgba(245,158,11,0.15)',
                  color: isCorrect ? 'var(--green)'
                    : isWrong ? 'var(--red)'
                    : 'var(--amber)'
                }}>
                  {isCorrect ? '✓ Correct'
                    : isWrong ? '✗ Wrong'
                    : daysLeft > 0 ? `⏳ ${daysLeft}d left`
                    : '⏳ Due today'}
                </span>
              </div>

              {/* Signal + price */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)'
              }}>
                <span>
                  <span style={{
                    color: pred.signal === 'BUY'  ? 'var(--green)'
                         : pred.signal === 'SELL' ? 'var(--red)'
                         : 'var(--amber)',
                    fontWeight: '600'
                  }}>{pred.signal}</span>
                  {' '}@ {pred.symbol.includes('.NS') ? '₹' : '$'}{pred.priceAtTrack?.toFixed(2)}
                </span>
                {pred.returnPct !== undefined && pred.returnPct !== null && (
                  <span style={{ color: pred.returnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {pred.returnPct >= 0 ? '+' : ''}{pred.returnPct?.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Horizon + confidence */}
              <div style={{ fontSize: '10px', color: 'var(--muted2)', marginTop: '3px' }}>
                {pred.horizon} · {pred.confidence}% confidence
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}