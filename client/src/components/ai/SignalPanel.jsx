// import useStore from '../../store'

// const SIGNAL_COLORS = {
//   BUY:   { bg: 'rgba(0,212,160,0.12)', color: 'var(--green)', border: 'rgba(0,212,160,0.3)' },
//   SELL:  { bg: 'rgba(255,77,106,0.12)', color: 'var(--red)',   border: 'rgba(255,77,106,0.3)' },
//   HOLD:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)', border: 'rgba(245,158,11,0.3)' },
//   ERROR: { bg: 'rgba(90,106,128,0.12)', color: 'var(--muted)', border: 'rgba(90,106,128,0.3)' },
// }

// export default function SignalPanel() {
//   const currentData = useStore(s => s.currentData)
//   const isLoading   = useStore(s => s.isLoading)

//   if (isLoading) {
//     return (
//       <div style={{
//         background: 'var(--bg2)', borderTop: '1px solid var(--border)',
//         padding: '12px 16px', display: 'flex', alignItems: 'center',
//         gap: '8px', color: 'var(--muted)', fontSize: '12px'
//       }}>
//         <div style={{
//           width: '14px', height: '14px',
//           border: '2px solid var(--border2)',
//           borderTopColor: 'var(--blue)',
//           borderRadius: '50%',
//           animation: 'spin 0.8s linear infinite', flexShrink: 0
//         }} />
//         Analysing with AI...
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     )
//   }

//   if (!currentData?.predictions) return null

//   const overall = currentData.overall_signal
//   const oc      = SIGNAL_COLORS[overall] || SIGNAL_COLORS.HOLD

//   return (
//     <div style={{
//       background: 'var(--bg2)', borderTop: '1px solid var(--border)',
//       padding: '10px 16px', display: 'flex', alignItems: 'center',
//       gap: '16px', flexWrap: 'wrap'
//     }}>
//       {/* Overall signal */}
//       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//         <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
//           Overall
//         </span>
//         <span style={{
//           padding: '4px 12px', borderRadius: '5px', fontWeight: '700',
//           fontSize: '12px', letterSpacing: '0.5px',
//           background: oc.bg, color: oc.color, border: `1px solid ${oc.border}`
//         }}>{overall}</span>
//       </div>

//       {/* Divider */}
//       <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />

//       {/* Individual predictions */}
//       {currentData.predictions.map((pred, i) => {
//         const pc = SIGNAL_COLORS[pred.signal] || SIGNAL_COLORS.HOLD
//         return (
//           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//             <div>
//               <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '3px' }}>
//                 {pred.horizon}
//               </div>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                 <span style={{
//                   padding: '3px 8px', borderRadius: '4px',
//                   fontSize: '11px', fontWeight: '700',
//                   background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`
//                 }}>{pred.signal}</span>
//                 <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: pc.color }}>
//                   {pred.confidence}%
//                 </span>
//               </div>
//             </div>

//             {/* Confidence bar */}
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
//               <div style={{
//                 width: '60px', height: '4px',
//                 background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden'
//               }}>
//                 <div style={{
//                   width: `${pred.confidence}%`, height: '100%',
//                   background: pc.color, borderRadius: '2px',
//                   transition: 'width 0.5s ease'
//                 }} />
//               </div>
//               <div style={{ fontSize: '9px', color: 'var(--muted2)', fontFamily: 'var(--mono)' }}>
//                 model: {pred.model_accuracy}%
//               </div>
//             </div>
//           </div>
//         )
//       })}

//       {/* Timestamp */}
//       <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--muted2)', fontFamily: 'var(--mono)' }}>
//         {new Date(currentData.timestamp).toLocaleTimeString()}
//       </div>
//     </div>
//   )
// }

import useStore from '../../store'

const SIGNAL_STYLES = {
  BUY:  { bg: 'rgba(0,212,160,0.15)', color: '#00d4a0', border: 'rgba(0,212,160,0.35)' },
  SELL: { bg: 'rgba(255,77,106,0.15)', color: '#ff4d6a', border: 'rgba(255,77,106,0.35)' },
  HOLD: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
}

function SignalBadge({ signal, size = 'sm' }) {
  const s = SIGNAL_STYLES[signal] || SIGNAL_STYLES.HOLD
  return (
    <span style={{
      padding:      size === 'lg' ? '6px 16px' : '3px 10px',
      borderRadius: '5px',
      fontWeight:   '700',
      fontSize:     size === 'lg' ? '14px' : '11px',
      letterSpacing: '0.5px',
      background:   s.bg,
      color:        s.color,
      border:       `1px solid ${s.border}`,
    }}>{signal}</span>
  )
}

function ConfidenceBar({ value, color }) {
  return (
    <div style={{ width: '100%', height: '5px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        width:      `${value}%`,
        height:     '100%',
        background: color,
        borderRadius: '3px',
        transition: 'width 0.6s ease'
      }} />
    </div>
  )
}

export default function SignalPanel() {
  const currentData   = useStore(s => s.currentData)
  const isLoading     = useStore(s => s.isLoading)
  const currentSymbol = useStore(s => s.currentSymbol)
  const currency      = currentSymbol?.includes('.NS') ? '₹' : '$'

  if (isLoading) {
    return (
      <div style={{
        background:  'var(--bg2)',
        borderTop:   '1px solid var(--border)',
        padding:     '16px',
        display:     'flex',
        alignItems:  'center',
        gap:         '10px',
        color:       'var(--muted)',
        fontSize:    '12px'
      }}>
        <div style={{
          width: '16px', height: '16px',
          border: '2px solid var(--border2)',
          borderTopColor: 'var(--purple)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', flexShrink: 0
        }} />
        TradeVest AI is analysing {currentSymbol}...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!currentData?.predictions) return null

  const overall   = currentData.overall_signal
  const os        = SIGNAL_STYLES[overall] || SIGNAL_STYLES.HOLD
  const price     = currentData.current_price

  return (
    <div style={{
      background:  'var(--bg2)',
      borderTop:   '1px solid var(--border)',
      padding:     '12px 16px',
    }}>
      {/* Header row */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '12px',
        marginBottom:   '12px',
        paddingBottom:  '10px',
        borderBottom:   '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          AI Overall Signal
        </div>
        <SignalBadge signal={overall} size="lg" />
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>
          Based on 3 prediction horizons
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--muted2)', fontFamily: 'var(--mono)' }}>
          {new Date(currentData.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* 3 horizon predictions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {currentData.predictions.map((pred, i) => {
          const ps      = SIGNAL_STYLES[pred.signal] || SIGNAL_STYLES.HOLD
          const probUp  = pred.probability_up
          const probDn  = pred.probability_down
          const target  = pred.signal === 'BUY'
            ? price * (1 + (probUp - 50) / 200)
            : price * (1 - (probDn - 50) / 200)

          return (
            <div key={i} style={{
              background:   'var(--bg3)',
              border:       `1px solid var(--border)`,
              borderRadius: '10px',
              padding:      '12px',
            }}>
              {/* Horizon label */}
              <div style={{
                fontSize: '10px', color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                marginBottom: '8px', fontWeight: '600'
              }}>{pred.horizon} · {pred.days}d</div>

              {/* Signal + confidence */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <SignalBadge signal={pred.signal} />
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: '13px',
                  fontWeight: '500', color: ps.color
                }}>{pred.confidence}%</span>
              </div>

              {/* Confidence bar */}
              <ConfidenceBar value={pred.confidence} color={ps.color} />

              {/* Probabilities */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: '8px', fontSize: '10px', fontFamily: 'var(--mono)'
              }}>
                <span style={{ color: 'var(--green)' }}>↑ {probUp}%</span>
                <span style={{ color: 'var(--red)' }}>↓ {probDn}%</span>
              </div>

              {/* Price target */}
              <div style={{
                marginTop: '8px', padding: '6px 8px',
                background: 'var(--bg4)', borderRadius: '6px',
                fontSize: '11px', fontFamily: 'var(--mono)'
              }}>
                <span style={{ color: 'var(--muted)' }}>Target: </span>
                <span style={{ color: ps.color }}>
                  {currency}{target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Model accuracy */}
              <div style={{
                marginTop: '6px', fontSize: '10px',
                color: 'var(--muted2)', fontFamily: 'var(--mono)'
              }}>
                Model accuracy: {pred.model_accuracy}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}