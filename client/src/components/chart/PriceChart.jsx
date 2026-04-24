import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import useStore from '../../store'

export default function PriceChart() {
  const currentData   = useStore(s => s.currentData)
  const isLoading     = useStore(s => s.isLoading)
  const currentSymbol = useStore(s => s.currentSymbol)
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    if (!currentData) return
    // Generate mock chart data based on current price
    const price = currentData.current_price
    const points = 30
    const data = []
    let p = price * 0.95
    for (let i = 0; i < points; i++) {
      p += (Math.random() - 0.48) * price * 0.008
      data.push({
        time:  i,
        price: parseFloat(p.toFixed(2)),
      })
    }
    data[data.length - 1].price = price
    setChartData(data)
  }, [currentData])

  const isUp      = currentData?.price_change_pct >= 0
  const lineColor = isUp ? 'var(--green)' : 'var(--red)'
  const currency  = currentSymbol?.includes('.NS') ? '₹' : '$'

  if (isLoading) {
    return (
      <div style={{
        height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: 'var(--muted)',
      }}>
        <div style={{
          width: '24px', height: '24px',
          border: '2px solid var(--border2)',
          borderTopColor: 'var(--blue)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '12px' }}>Loading market data...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Chart header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {currentSymbol?.replace('.NS', '').replace('.BO', '')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            {currentData.data_rows_used} days of data
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: '500', letterSpacing: '-0.5px' }}>
            {currency}{currentData.current_price?.toLocaleString()}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '12px',
            color: isUp ? 'var(--green)' : 'var(--red)',
            marginTop: '2px'
          }}>
            {isUp ? '+' : ''}{currency}{currentData.price_change?.toFixed(2)}
            {' '}({isUp ? '+' : ''}{currentData.price_change_pct?.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis dataKey="time" hide />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={v => `${currency}${v.toLocaleString()}`}
              tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              width={70}
              orientation="right"
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: '8px', fontSize: '12px', fontFamily: 'IBM Plex Mono'
              }}
              formatter={v => [`${currency}${v.toLocaleString()}`, 'Price']}
              labelFormatter={() => ''}
            />
            <Line
              type="monotone"
              dataKey="price"
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