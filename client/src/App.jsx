import { useEffect } from 'react'
import useStore from './store'
import useWebSocket from './hooks/useWebSocket'
import usePrediction from './hooks/usePrediction'

import Navbar        from './components/layout/Navbar'
import Sidebar       from './components/layout/Sidebar'
import PriceChart    from './components/chart/PriceChart'
import SignalPanel   from './components/ai/SignalPanel'
import OrderPanel    from './components/trading/OrderPanel'
import PortfolioPanel from './components/trading/PortfolioPanel'
import ActionPanel   from './components/trading/OrderPanel'
import TrackedPanel  from './components/trading/PortfolioPanel'

export default function App() {
  const { predict } = usePrediction()

  // Connect WebSocket for live prices
  useWebSocket()

  // Load initial prediction on mount
  useEffect(() => {
    predict('TCS.NS')
  }, [])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '200px 1fr 280px',
      gridTemplateRows:    '48px 1fr',
      height:              '100vh',
      overflow:            'hidden',
    }}>
      {/* Navbar — spans full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <Navbar />
      </div>

      {/* Sidebar — watchlist */}
      <Sidebar />

      {/* Main content */}
      <main style={{
        background:    'var(--bg)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
      }}>
        {/* Chart area */}
        {/* <div style={{
          flex:    1,
          padding: '16px',
          overflow: 'hidden',
        }}> */}
        {/* Chart area */}
        <div style={{
          flex:      1,
          padding:   '16px',
          overflow:  'hidden',
          minHeight: 0,
          display:   'flex',
          flexDirection: 'column',
          }}>
          <PriceChart />
        </div>

        {/* AI Signal bar */}
        <SignalPanel />
      </main>

      {/* Right panel — order + portfolio */}
      <div style={{
        background:   'var(--bg2)',
        borderLeft:   '1px solid var(--border)',
        display:      'flex',
        flexDirection: 'column',
        overflow:     'hidden',
      }}>
        <OrderPanel />
        <PortfolioPanel />
      </div>
    </div>
  )
}