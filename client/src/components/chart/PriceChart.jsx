// import { useEffect, useState } from 'react'
// import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
// import useStore from '../../store'

// export default function PriceChart() {
//   const currentData   = useStore(s => s.currentData)
//   const isLoading     = useStore(s => s.isLoading)
//   const currentSymbol = useStore(s => s.currentSymbol)
//   const [chartData, setChartData] = useState([])

//   useEffect(() => {
//     if (!currentData) return
//     // Generate mock chart data based on current price
//     const price = currentData.current_price
//     const points = 30
//     const data = []
//     let p = price * 0.95
//     for (let i = 0; i < points; i++) {
//       p += (Math.random() - 0.48) * price * 0.008
//       data.push({
//         time:  i,
//         price: parseFloat(p.toFixed(2)),
//       })
//     }
//     data[data.length - 1].price = price
//     setChartData(data)
//   }, [currentData])

//   const isUp      = currentData?.price_change_pct >= 0
//   const lineColor = isUp ? 'var(--green)' : 'var(--red)'
//   const currency  = currentSymbol?.includes('.NS') ? '₹' : '$'

//   if (isLoading) {
//     return (
//       <div style={{
//         height: '100%', display: 'flex',
//         alignItems: 'center', justifyContent: 'center',
//         flexDirection: 'column', gap: '12px', color: 'var(--muted)',
//       }}>
//         <div style={{
//           width: '24px', height: '24px',
//           border: '2px solid var(--border2)',
//           borderTopColor: 'var(--blue)',
//           borderRadius: '50%',
//           animation: 'spin 0.8s linear infinite'
//         }} />
//         <span style={{ fontSize: '12px' }}>Loading market data...</span>
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//       </div>
//     )
//   }

//   if (!currentData) {
//     return (
//       <div style={{
//         height: '100%', display: 'flex',
//         alignItems: 'center', justifyContent: 'center',
//         color: 'var(--muted)', fontSize: '13px'
//       }}>
//         Select a stock to view chart
//       </div>
//     )
//   }

//   return (
//     <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//       {/* Chart header */}
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//         <div>
//           <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
//             {currentSymbol?.replace('.NS', '').replace('.BO', '')}
//           </div>
//           <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
//             {currentData.data_rows_used} days of data
//           </div>
//         </div>
//         <div style={{ textAlign: 'right' }}>
//           <div style={{ fontFamily: 'var(--mono)', fontSize: '24px', fontWeight: '500', letterSpacing: '-0.5px' }}>
//             {currency}{currentData.current_price?.toLocaleString()}
//           </div>
//           <div style={{
//             fontFamily: 'var(--mono)', fontSize: '12px',
//             color: isUp ? 'var(--green)' : 'var(--red)',
//             marginTop: '2px'
//           }}>
//             {isUp ? '+' : ''}{currency}{currentData.price_change?.toFixed(2)}
//             {' '}({isUp ? '+' : ''}{currentData.price_change_pct?.toFixed(2)}%)
//           </div>
//         </div>
//       </div>

//       {/* Chart */}
//       <div style={{ flex: 1 }}>
//         <ResponsiveContainer width="100%" height="100%">
//           <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
//             <XAxis dataKey="time" hide />
//             <YAxis
//               domain={['auto', 'auto']}
//               tickFormatter={v => `${currency}${v.toLocaleString()}`}
//               tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
//               width={70}
//               orientation="right"
//             />
//             <Tooltip
//               contentStyle={{
//                 background: 'var(--bg3)', border: '1px solid var(--border2)',
//                 borderRadius: '8px', fontSize: '12px', fontFamily: 'IBM Plex Mono'
//               }}
//               formatter={v => [`${currency}${v.toLocaleString()}`, 'Price']}
//               labelFormatter={() => ''}
//             />
//             <Line
//               type="monotone"
//               dataKey="price"
//               stroke={lineColor}
//               strokeWidth={2}
//               dot={false}
//               activeDot={{ r: 4, fill: lineColor }}
//             />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   )
// }

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
    return (
      <div style={{
        height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: 'var(--muted)'
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
    // <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            {currentSymbol?.replace('.NS', '').replace('.BO', '')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            {currentData.data_rows_used} days historical data
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