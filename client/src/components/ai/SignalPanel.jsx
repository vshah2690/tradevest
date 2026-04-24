import useStore from '../../store'

function getReadableSignal(signal, confidence) {
  if (confidence >= 65) {
    return signal === 'BUY'
      ? { text: 'Likely to go UP',   emoji: '📈', color: 'var(--green)' }
      : signal === 'SELL'
      ? { text: 'Likely to go DOWN', emoji: '📉', color: 'var(--red)' }
      : { text: 'Uncertain',         emoji: '➡️', color: 'var(--amber)' }
  } else if (confidence >= 55) {
    return signal === 'BUY'
      ? { text: 'Slight chance UP',   emoji: '↗️', color: 'var(--green)' }
      : signal === 'SELL'
      ? { text: 'Slight chance DOWN', emoji: '↘️', color: 'var(--red)' }
      : { text: 'Uncertain',          emoji: '➡️', color: 'var(--amber)' }
  } else {
    return { text: 'Hard to predict', emoji: '🤔', color: 'var(--muted)' }
  }
}

function getConfidenceLabel(confidence) {
  if (confidence >= 70) return 'Very confident'
  if (confidence >= 60) return 'Fairly confident'
  if (confidence >= 55) return 'Slightly confident'
  return 'Low confidence'
}

export default function SignalPanel() {
  const currentData   = useStore(s => s.currentData)
  const isLoading     = useStore(s => s.isLoading)
  const currentSymbol = useStore(s => s.currentSymbol)
  const currency      = currentSymbol?.includes('.NS') ? '₹' : '$'
  const symClean      = currentSymbol?.replace('.NS', '').replace('.BO', '')

  if (isLoading) {
    return (
      <div style={{
        background:  'var(--bg2)',
        borderTop:   '1px solid var(--border)',
        padding:     '20px 24px',
        display:     'flex',
        alignItems:  'center',
        gap:         '12px',
        color:       'var(--muted)',
        fontSize:    '13px'
      }}>
        <div style={{
          width: '18px', height: '18px',
          border: '2px solid var(--border2)',
          borderTopColor: 'var(--purple)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', flexShrink: 0
        }} />
        TradeVest AI is analysing {symClean}...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!currentData?.predictions) return null

  const price    = currentData.current_price
  const overall  = currentData.overall_signal
  const preds    = currentData.predictions

  // Get the most reliable prediction (5-day has highest accuracy)
  const best     = preds.find(p => p.horizon === 'Medium-term') || preds[0]
  const readable = getReadableSignal(best?.signal || overall, best?.confidence || 50)

  // Price range from all predictions
  const targets  = preds.map(p => {
    const prob = p.probability_up / 100
    return p.signal === 'BUY'
      ? price * (1 + (prob - 0.5) * 0.15)
      : price * (1 - (0.5 - prob) * 0.15)
  })
  const minTarget = Math.min(...targets)
  const maxTarget = Math.max(...targets)

  const HORIZON_LABELS = {
    'Intraday':    'Today',
    'Short-term':  'This week (3 days)',
    'Medium-term': 'Next week (5 days)',
  }

  return (
    <div style={{
      background:  'var(--bg2)',
      borderTop:   '1px solid var(--border)',
      padding:     '16px 20px',
    }}>
      <div style={{
        display:  'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:      '16px',
      }}>

        {/* LEFT — Main verdict */}
        <div style={{
          background:   'var(--bg3)',
          borderRadius: '12px',
          padding:      '16px',
          border:       `1px solid ${readable.color}30`,
        }}>
          {/* Header */}
          <div style={{
            fontSize:     '11px',
            color:        'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '10px',
            fontWeight:   '600'
          }}>
            AI Verdict for {symClean}
          </div>

          {/* Main signal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>{readable.emoji}</span>
            <div>
              <div style={{
                fontSize:   '18px',
                fontWeight: '700',
                color:      readable.color,
                letterSpacing: '-0.3px'
              }}>{readable.text}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                {getConfidenceLabel(best?.confidence)} · {best?.confidence}% probability
              </div>
            </div>
          </div>

          {/* Predicted range */}
          <div style={{
            background:   'var(--bg4)',
            borderRadius: '8px',
            padding:      '10px 12px',
            marginTop:    '10px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Predicted price range
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '500', color: 'var(--red)' }}>
                  {currency}{minTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Low estimate</div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '16px' }}>→</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', fontWeight: '500', color: 'var(--green)' }}>
                  {currency}{maxTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>High estimate</div>
              </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)' }}>
              Current: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                {currency}{price?.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            marginTop:  '10px',
            fontSize:   '10px',
            color:      'var(--muted2)',
            lineHeight: '1.5',
          }}>
            ⚠️ AI analysis only — not financial advice. Always do your own research.
          </div>
        </div>

        {/* RIGHT — Breakdown per horizon */}
        <div style={{
          background:   'var(--bg3)',
          borderRadius: '12px',
          padding:      '16px',
          border:       '1px solid var(--border)',
        }}>
          <div style={{
            fontSize:      '11px',
            color:         'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom:  '12px',
            fontWeight:    '600'
          }}>
            Prediction Breakdown
          </div>

          {preds.map((pred, i) => {
            const r   = getReadableSignal(pred.signal, pred.confidence)
            const lbl = HORIZON_LABELS[pred.horizon] || pred.horizon
            const barW = pred.confidence

            return (
              <div key={i} style={{
                marginBottom: i < preds.length - 1 ? '14px' : 0,
                paddingBottom: i < preds.length - 1 ? '14px' : 0,
                borderBottom: i < preds.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Label + verdict */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{lbl}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>{r.emoji} {r.text}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: r.color, fontWeight: '500' }}>
                      {pred.confidence}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>confident</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '4px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width:        `${barW}%`,
                    height:       '100%',
                    background:   r.color,
                    borderRadius: '2px',
                    transition:   'width 0.6s ease'
                  }} />
                </div>

                {/* Up/down split */}
                <div style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  marginTop:      '4px',
                  fontSize:       '10px',
                  fontFamily:     'var(--mono)',
                  color:          'var(--muted)'
                }}>
                  <span style={{ color: 'var(--green)' }}>↑ {pred.probability_up}% chance up</span>
                  <span style={{ color: 'var(--red)' }}>↓ {pred.probability_down}% chance down</span>
                </div>
              </div>
            )
          })}

          {/* Model note */}
          <div style={{
            marginTop:    '12px',
            padding:      '8px 10px',
            background:   'var(--bg4)',
            borderRadius: '6px',
            fontSize:     '10px',
            color:        'var(--muted)',
            lineHeight:   '1.5'
          }}>
            💡 Predictions use XGBoost ML trained on 10 years of market data.
            Best accuracy on 5-day predictions (73.42%).
          </div>
        </div>
      </div>
    </div>
  )
}