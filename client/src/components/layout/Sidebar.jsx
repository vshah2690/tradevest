import { useEffect, useState } from 'react'
import useStore from '../../store'
import usePrediction from '../../hooks/usePrediction'
import { watchlistAPI } from '../../services/api'

const DEFAULT_STOCKS = [
  { symbol: 'TCS.NS',      name: 'Tata Consultancy' },
  { symbol: 'INFY.NS',     name: 'Infosys' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Ind.' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'AAPL',        name: 'Apple Inc' },
  { symbol: 'MSFT',        name: 'Microsoft' },
  { symbol: 'NVDA',        name: 'NVIDIA' },
  { symbol: 'GOOGL',       name: 'Alphabet' },
  { symbol: 'TSLA',        name: 'Tesla' },
]

const COLORS = [
  '#3b82f6', '#00d4a0', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#22c55e', '#f97316',
  '#ec4899', '#6366f1'
]

function StockItem({ stock, idx, isActive, onSelect, onRemove, showRemove, currency }) {
  const prices  = useStore(s => s.prices)
  const p       = prices[stock.symbol]
  const color   = COLORS[idx % COLORS.length]
  const initials = stock.symbol.replace('.NS','').replace('.BO','').slice(0, 2)
  const curr    = stock.symbol.includes('.NS') || stock.symbol.includes('.BO') ? '₹' : '$'

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      style={{
        display:    'flex',
        alignItems: 'center',
        padding:    '8px 12px',
        cursor:     'pointer',
        borderLeft: `2px solid ${isActive ? color : 'transparent'}`,
        background: isActive ? `${color}12` : 'transparent',
        gap:        '8px',
        transition: 'all 0.12s',
        position:   'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = isActive ? `${color}12` : 'var(--bg3)'}
      onMouseLeave={e => e.currentTarget.style.background = isActive ? `${color}12` : 'transparent'}
    >
      <div style={{
        width: '26px', height: '26px', borderRadius: '6px',
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '9px', fontWeight: '700', flexShrink: 0,
      }}>{initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '11px' }}>
          {stock.symbol.replace('.NS','').replace('.BO','')}
        </div>
        <div style={{
          fontSize: '10px', color: 'var(--muted)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{stock.name}</div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: '500' }}>
          {p ? `${curr}${p.price?.toLocaleString()}` : '---'}
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: '9px',
          color: p ? (p.changePct >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted2)'
        }}>
          {p ? `${p.changePct >= 0 ? '+' : ''}${p.changePct?.toFixed(2)}%` : ''}
        </div>
      </div>

      {showRemove && (
        <div
          onClick={e => { e.stopPropagation(); onRemove(stock.symbol) }}
          style={{
            position: 'absolute', right: '6px', top: '50%',
            transform: 'translateY(-50%)',
            width: '16px', height: '16px', borderRadius: '50%',
            background: 'rgba(255,77,106,0.2)', color: 'var(--red)',
            fontSize: '11px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            opacity: 0, transition: 'opacity 0.15s'
          }}
          className="remove-btn"
        >×</div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const currentSymbol    = useStore(s => s.currentSymbol)
  const setCurrentSymbol = useStore(s => s.setCurrentSymbol)
  const token            = useStore(s => s.token)
  const watchlist        = useStore(s => s.watchlist)
  const setWatchlist     = useStore(s => s.setWatchlist)
  const { predict }      = usePrediction()
  const [popularOpen, setPopularOpen] = useState(true)

  // Load personal watchlist on mount / login change
  useEffect(() => {
    if (!token) {
      setWatchlist([], true)
      return
    }
    watchlistAPI.get()
      .then(res => {
        // Only set personal watchlist — not defaults
        const personal = res.data.isDefault ? [] : res.data.watchlist
        setWatchlist(personal, res.data.isDefault)
      })
      .catch(() => setWatchlist([], true))
  }, [token])

  const handleSelect = (sym) => {
    setCurrentSymbol(sym)
    predict(sym)
  }

  const handleRemove = async (symbol) => {
    // Optimistic update — remove immediately
    setWatchlist(watchlist.filter(w => w.symbol !== symbol), false)
    try {
      await watchlistAPI.remove(symbol)
    } catch {
      // Revert on error
      const res = await watchlistAPI.get()
      setWatchlist(res.data.isDefault ? [] : res.data.watchlist, res.data.isDefault)
    }
  }

  return (
    <aside style={{
      background:    'var(--bg2)',
      borderRight:   '1px solid var(--border)',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
    }}>
      {/* ── MY WATCHLIST ─────────────────────────────── */}
      <div style={{
        padding:       '10px 12px 6px',
        fontSize:      '10px', fontWeight: '600',
        letterSpacing: '1px', color: 'var(--muted)',
        textTransform: 'uppercase',
        borderBottom:  '1px solid var(--border)',
        display:       'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>My Watchlist</span>
        {!token && (
          <span style={{ fontSize: '9px', color: 'var(--muted2)', fontWeight: '400', textTransform: 'none' }}>
            Login to save
          </span>
        )}
      </div>

      {/* Personal watchlist items */}
      <div style={{ minHeight: watchlist.length > 0 ? 'auto' : '48px' }}>
        {watchlist.length === 0 ? (
          <div style={{
            padding: '12px', fontSize: '11px',
            color: 'var(--muted2)', textAlign: 'center',
            fontStyle: 'italic'
          }}>
            {token ? 'No stocks added yet' : 'Login to create watchlist'}
          </div>
        ) : (
          watchlist.map((stock, idx) => (
            <div
              key={stock.symbol}
              style={{ position: 'relative' }}
              onMouseEnter={e => {
                const btn = e.currentTarget.querySelector('.remove-btn')
                if (btn) btn.style.opacity = '1'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget.querySelector('.remove-btn')
                if (btn) btn.style.opacity = '0'
              }}
            >
              <StockItem
                stock={stock}
                idx={idx}
                isActive={currentSymbol === stock.symbol}
                onSelect={handleSelect}
                onRemove={handleRemove}
                showRemove={true}
              />
            </div>
          ))
        )}
      </div>

      {/* ── POPULAR STOCKS (collapsible) ─────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '1px solid var(--border)' }}>

        {/* Collapsible header */}
        <div
          onClick={() => setPopularOpen(!popularOpen)}
          style={{
            padding:       '8px 12px',
            fontSize:      '10px', fontWeight: '600',
            letterSpacing: '1px', color: 'var(--muted)',
            textTransform: 'uppercase',
            cursor:        'pointer',
            display:       'flex', justifyContent: 'space-between', alignItems: 'center',
            userSelect:    'none',
            transition:    'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>Popular Stocks</span>
          <span style={{
            fontSize: '12px', color: 'var(--muted2)',
            transition: 'transform 0.2s',
            display: 'inline-block',
            transform: popularOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>▾</span>
        </div>

        {/* Popular stocks list */}
        {popularOpen && (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {DEFAULT_STOCKS.map((stock, idx) => (
              <StockItem
                key={stock.symbol}
                stock={stock}
                idx={idx}
                isActive={currentSymbol === stock.symbol}
                onSelect={handleSelect}
                onRemove={() => {}}
                showRemove={false}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .remove-btn { opacity: 0; }
      `}</style>
    </aside>
  )
}