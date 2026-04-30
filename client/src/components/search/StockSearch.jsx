import { useState, useRef, useEffect } from 'react'
import useStore from '../../store'
import usePrediction from '../../hooks/usePrediction'
import { marketAPI } from '../../services/api'

export default function StockSearch() {
  const [query,     setQuery]     = useState('')
  const [open,      setOpen]      = useState(false)
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [searched,  setSearched]  = useState(false)
  const searchTimer               = useRef(null)
  const setCurrentSymbol          = useStore(s => s.setCurrentSymbol)
  const { predict }               = usePrediction()
  const setCurrentName = useStore(s => s.setCurrentName)

  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults([])
      setSearched(false)
      return
    }

    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      setSearched(false)
      try {
        const res = await marketAPI.search(query)
        setResults(res.data.results || [])
        setSearched(true)
      } catch {
        setResults([])
        setSearched(true)
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [query])

  const handleSelect = (stock) => {
    setCurrentSymbol(stock.symbol)
    setCurrentName(stock.name || stock.symbol)
    predict(stock.symbol)
    setQuery('')
    setOpen(false)
    setResults([])
    setSearched(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSelect({ symbol: query.trim().toUpperCase(), name: query.trim().toUpperCase() })
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '10px',
          top: '50%', transform: 'translateY(-50%)',
          color: 'var(--muted)', fontSize: '13px',
          pointerEvents: 'none'
        }}>🔍</span>

        {searching && (
          <div style={{
            position: 'absolute', right: '10px',
            top: '50%', transform: 'translateY(-50%)',
            width: '12px', height: '12px',
            border: '2px solid var(--border2)',
            borderTopColor: 'var(--blue)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
        )}

        <input
          type="text"
          placeholder="Search any stock globally — Adani, Tesla, HSBC..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', background: 'var(--bg3)',
            border: '1px solid var(--border2)', borderRadius: '8px',
            padding: '7px 12px 7px 32px', color: 'var(--text)',
            fontFamily: 'var(--font)', fontSize: '12px', outline: 'none',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Dropdown */}
      {open && query.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0,
          width: '420px', marginTop: '4px',
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: '10px', overflow: 'hidden',
          zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxHeight: '400px', overflowY: 'auto'
        }}>

          {/* Searching state */}
          {searching && (
            <div style={{
              padding: '20px', textAlign: 'center',
              color: 'var(--muted)', fontSize: '12px'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '20px' }}>🌍</div>
              Searching all global exchanges...
              <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}>
                NSE · BSE · NYSE · NASDAQ · LSE · XETRA · TSE · HKEX...
              </div>
            </div>
          )}

          {/* No results */}
          {!searching && searched && results.length === 0 && (
            <div style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                No results found for "{query}"
              </div>
              <div style={{
                fontSize: '11px', color: 'var(--muted2)',
                padding: '8px', background: 'var(--bg3)', borderRadius: '6px'
              }}>
                💡 Try the exact ticker symbol and press{' '}
                <kbd style={{
                  background: 'var(--bg4)', padding: '1px 5px',
                  borderRadius: '3px', fontSize: '10px', fontFamily: 'var(--mono)'
                }}>Enter</kbd>
                {' '}e.g. <strong style={{ color: 'var(--text)' }}>ADANIENT.NS</strong>
              </div>
            </div>
          )}

          {/* Results */}
          {!searching && results.length > 0 && (
            <>
              <div style={{
                padding: '8px 12px 6px',
                fontSize: '10px', color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                fontWeight: '600', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span>{results.length} stocks found globally</span>
                <span>Sorted by market cap</span>
              </div>

              {results.map((stock, i) => (
                <div
                  key={i}
                  onMouseDown={() => handleSelect(stock)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '10px 12px', cursor: 'pointer', gap: '10px',
                    borderBottom: i < results.length - 1
                      ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Flag + initials */}
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', lineHeight: 1 }}>{stock.flag}</div>
                    <div style={{
                      fontSize: '9px', color: 'var(--muted2)',
                      fontFamily: 'var(--mono)', marginTop: '2px'
                    }}>{stock.exchange}</div>
                  </div>

                  {/* Name + symbol */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '600',
                      whiteSpace: 'nowrap', overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>{stock.name}</div>
                    <div style={{
                      fontSize: '11px', color: 'var(--muted)',
                      marginTop: '1px', fontFamily: 'var(--mono)'
                    }}>
                      {stock.symbol}
                      {stock.sector && (
                        <span style={{ marginLeft: '8px', color: 'var(--muted2)' }}>
                          · {stock.sector}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {stock.currency_symbol}{stock.price?.toLocaleString()}
                    </div>
                    {stock.market_cap > 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {stock.market_cap > 1e12
                          ? `${(stock.market_cap / 1e12).toFixed(1)}T`
                          : stock.market_cap > 1e9
                          ? `${(stock.market_cap / 1e9).toFixed(1)}B`
                          : `${(stock.market_cap / 1e6).toFixed(0)}M`} cap
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Enter hint */}
          {query && (
            <div style={{
              padding: '7px 12px', fontSize: '11px',
              color: 'var(--muted2)', borderTop: '1px solid var(--border)',
              background: 'var(--bg3)'
            }}>
              Press <kbd style={{
                background: 'var(--bg4)', padding: '1px 5px',
                borderRadius: '3px', fontSize: '10px', fontFamily: 'var(--mono)'
              }}>Enter</kbd> to load{' '}
              <strong style={{ color: 'var(--text)' }}>{query.toUpperCase()}</strong> directly
            </div>
          )}
        </div>
      )}
    </div>
  )
}