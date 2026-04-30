import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import useStore from '../../store'
import { marketAPI } from '../../services/api'

export default function PriceChart() {
  const currentData    = useStore(s => s.currentData)
  const isLoading      = useStore(s => s.isLoading)
  const currentSymbol  = useStore(s => s.currentSymbol)
  const currentName    = useStore(s => s.currentName)
  const [chartData,    setChartData]    = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [activeTab,    setActiveTab]    = useState('1M')

  const currency = currentSymbol?.includes('.NS') ? '₹' : '$'
  const isUp     = currentData?.price_change_pct >= 0
  const lineColor = isUp ? 'var(--green)' : 'var(--red)'

  useEffect(() => {
    if (!currentSymbol) return
    setChartLoading(true)
    marketAPI.getHistory(currentSymbol)
      .then(res => {
        setChartData(res.data.history || [])
      })
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false))
  }, [currentSymbol])

  const TABS = ['1W', '1M', '3M', '6M']

  const filteredData = () => {
    const days = { '1W': 7, '1M': 30, '3M': 63, '6M': 90 }
    return chartData.slice(-(days[activeTab] || 30))
  }

  if (isLoading || chartLoading) {
    const messages = [
      "Fetching live market data...",
      "Running AI models...",
      "Computing 105 technical indicators...",
      "Analysing 10 years of price history...",
      "Calculating Fibonacci EMAs...",
    ]
    const msg = messages[Math.floor(Math.random() * messages.length)]

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Skeleton header */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              width: '80px', height: '22px',
              background: 'var(--bg4)', borderRadius: '6px',
              animation: 'shimmer 1.5s infinite'
            }} />
            <div style={{
              width: '160px', height: '12px', marginTop: '6px',
              background: 'var(--bg4)', borderRadius: '4px',
              animation: 'shimmer 1.5s infinite'
            }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              width: '120px', height: '28px',
              background: 'var(--bg4)', borderRadius: '6px',
              animation: 'shimmer 1.5s infinite'
            }} />
            <div style={{
              width: '80px', height: '14px', marginTop: '6px', marginLeft: 'auto',
              background: 'var(--bg4)', borderRadius: '4px',
              animation: 'shimmer 1.5s infinite'
            }} />
          </div>
        </div>

        {/* Skeleton tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['1W','1M','3M','6M'].map(t => (
            <div key={t} style={{
              width: '36px', height: '24px',
              background: 'var(--bg4)', borderRadius: '5px',
              animation: 'shimmer 1.5s infinite'
            }} />
          ))}
        </div>

        {/* Skeleton chart with message */}
        <div style={{
          flex: 1, background: 'var(--bg3)',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '16px',
          animation: 'shimmer 1.5s infinite'
        }}>
          {/* Animated bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '48px' }}>
            {[35, 55, 45, 70, 40, 60, 50, 75, 45, 65, 55, 80].map((h, i) => (
              <div key={i} style={{
                width: '6px',
                height: `${h}%`,
                background: 'var(--blue)',
                borderRadius: '3px 3px 0 0',
                opacity: 0.4,
                animation: `bar 1.2s ease-in-out ${i * 0.1}s infinite alternate`
              }} />
            ))}
          </div>

          {/* Loading message */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '13px', fontWeight: '600',
              color: 'var(--text)', marginBottom: '6px'
            }}>
              TradeVest AI
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {msg}
            </div>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '6px', height: '6px',
                borderRadius: '50%',
                background: 'var(--blue)',
                animation: `dot 1.2s ease-in-out ${i * 0.4}s infinite alternate`
              }} />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0%   { opacity: 1; }
            50%  { opacity: 0.6; }
            100% { opacity: 1; }
          }
          @keyframes bar {
            0%   { opacity: 0.3; transform: scaleY(0.8); }
            100% { opacity: 0.8; transform: scaleY(1.1); }
          }
          @keyframes dot {
            0%   { opacity: 0.2; transform: scale(0.8); }
            100% { opacity: 1;   transform: scale(1.2); }
          }
        `}</style>
      </div>
    )
  }

  if (!currentData) {
    return (
      <div style={{
        height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted)', fontSize: '13px'
      }}>
        Select a stock to view chart
      </div>
    )
  }

  return (
    // <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {currentSymbol?.replace('.NS', '').replace('.BO', '')}
            {currentName && (
              <span style={{
                fontSize: '14px', fontWeight: '400',
                color: 'var(--muted)', marginLeft: '8px'
              }}>
                ({currentName})
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            {/* {currentData.data_rows_used} days historical data · Prices end-of-day */}
            {currentData.data_rows_used} days data · Last updated:{' '}
            {new Date(currentData.timestamp).toLocaleTimeString('en-GB', {
              hour: '2-digit', minute: '2-digit'
            })}
            {' '}· Prices end-of-day
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '28px',
            fontWeight: '500', letterSpacing: '-1px'
          }}>
            {currency}{currentData.current_price?.toLocaleString()}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '13px',
            color: isUp ? 'var(--green)' : 'var(--red)', marginTop: '2px'
          }}>
            {isUp ? '+' : ''}{currency}{currentData.price_change?.toFixed(2)}
            {' '}({isUp ? '+' : ''}{currentData.price_change_pct?.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Timeframe tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '4px 12px', borderRadius: '5px', border: 'none',
            cursor: 'pointer', fontSize: '11px', fontWeight: '600',
            background: activeTab === tab ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: activeTab === tab ? 'var(--blue)' : 'var(--muted)',
            transition: 'all 0.12s'
          }}>{tab}</button>
        ))}
      </div>

      {/* Real price chart */}
      {/* <div style={{ flex: 1 }}> */}
      <div style={{ flex: 1, minHeight: 0, height: '100%' }}>
        {/* <ResponsiveContainer width="100%" height="100%"> */}
          <ResponsiveContainer width="100%" height={220}>
          <LineChart data={filteredData()} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={v => `${currency}${v.toLocaleString()}`}
              tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              width={75}
              orientation="right"
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg3)',
                border: '1px solid var(--border2)',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'IBM Plex Mono'
              }}
              formatter={(v, name) => [`${currency}${v.toLocaleString()}`, name]}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}