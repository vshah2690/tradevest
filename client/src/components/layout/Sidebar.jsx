import useStore from '../../store'
import usePrediction from '../../hooks/usePrediction'

const WATCHLIST = [
  { sym: 'TCS.NS',       name: 'Tata Consultancy', flag: '🇮🇳' },
  { sym: 'INFY.NS',      name: 'Infosys',           flag: '🇮🇳' },
  { sym: 'RELIANCE.NS',  name: 'Reliance Ind.',     flag: '🇮🇳' },
  { sym: 'HDFCBANK.NS',  name: 'HDFC Bank',         flag: '🇮🇳' },
  { sym: 'AAPL',         name: 'Apple Inc.',        flag: '🇺🇸' },
  { sym: 'MSFT',         name: 'Microsoft',         flag: '🇺🇸' },
  { sym: 'NVDA',         name: 'NVIDIA',            flag: '🇺🇸' },
  { sym: 'GOOGL',        name: 'Alphabet',          flag: '🇺🇸' },
  { sym: 'TSLA',         name: 'Tesla',             flag: '🇺🇸' },
]

const COLORS = {
  'TCS.NS':      '#3b82f6',
  'INFY.NS':     '#00d4a0',
  'RELIANCE.NS': '#f59e0b',
  'HDFCBANK.NS': '#8b5cf6',
  'AAPL':        '#6b7280',
  'MSFT':        '#3b82f6',
  'NVDA':        '#22c55e',
  'GOOGL':       '#ef4444',
  'TSLA':        '#f59e0b',
}

export default function Sidebar() {
  const currentSymbol   = useStore(s => s.currentSymbol)
  const setCurrentSymbol = useStore(s => s.setCurrentSymbol)
  const prices          = useStore(s => s.prices)
  const { predict }     = usePrediction()

  const handleSelect = (sym) => {
    setCurrentSymbol(sym)
    predict(sym)
  }

  return (
    <aside style={{
      background:   'var(--bg2)',
      borderRight:  '1px solid var(--border)',
      display:      'flex',
      flexDirection: 'column',
      overflow:     'hidden',
    }}>
      <div style={{
        padding:      '10px 14px 8px',
        fontSize:     '10px',
        fontWeight:   '600',
        letterSpacing: '1.2px',
        color:        'var(--muted)',
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--border)',
      }}>Watchlist</div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {WATCHLIST.map(w => {
          const p       = prices[w.sym]
          const isActive = currentSymbol === w.sym
          const color   = COLORS[w.sym] || 'var(--blue)'
          const initials = w.sym.replace('.NS', '').slice(0, 2)

          return (
            <div
              key={w.sym}
              onClick={() => handleSelect(w.sym)}
              style={{
                display:     'flex',
                alignItems:  'center',
                padding:     '9px 14px',
                cursor:      'pointer',
                borderLeft:  `2px solid ${isActive ? color : 'transparent'}`,
                background:  isActive ? `${color}12` : 'transparent',
                gap:         '10px',
                transition:  'all 0.12s',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '7px',
                background: `${color}18`,
                color, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: '700', flexShrink: 0,
              }}>{initials}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '12px' }}>{w.sym.replace('.NS', '')}</div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {w.flag} {w.name}
                </div>
              </div>

              {/* Price */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '500' }}>
                  {p ? (w.sym.includes('.NS') ? '₹' : '$') + p.price.toLocaleString() : '---'}
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: '10px',
                  color: p ? (p.changePct >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)'
                }}>
                  {p ? `${p.changePct >= 0 ? '+' : ''}${p.changePct?.toFixed(2)}%` : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}