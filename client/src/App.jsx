import { useEffect } from 'react'
import useStore from './store'
import useWebSocket from './hooks/useWebSocket'
import usePrediction from './hooks/usePrediction'
import { authAPI, watchlistAPI } from './services/api'

import Navbar         from './components/layout/Navbar'
import Sidebar        from './components/layout/Sidebar'
import PriceChart     from './components/chart/PriceChart'
import SignalPanel    from './components/ai/SignalPanel'
import OrderPanel     from './components/trading/OrderPanel'
import PortfolioPanel from './components/trading/PortfolioPanel'
import MobileSheets   from './components/mobile/MobileSheets'
import ChatPanel from './components/ai/ChatPanel'

import './App.css'

export default function App() {
  const { predict }  = usePrediction()
  const token        = useStore(s => s.token)
  const setAuth      = useStore(s => s.setAuth)
  const logout       = useStore(s => s.logout)
  const setWatchlist = useStore(s => s.setWatchlist)

  useWebSocket()

  useEffect(() => {
    if (!token) return
    authAPI.me()
      .then(res => setAuth(res.data.user, token))
      .catch(() => logout())
    watchlistAPI.get()
      .then(res => {
        const personal = res.data.isDefault ? [] : res.data.watchlist
        setWatchlist(personal, false)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    predict('TCS.NS')
  }, [])

  return (
    <div className="app-shell">

      <div className="app-navbar">
        <Navbar />
      </div>

      <Sidebar />

      <main className="app-main">
        <div className="app-chart-wrap">
          <PriceChart />
        </div>
        <SignalPanel />
      </main>

      {/* Desktop only — hidden on mobile via CSS */}
      <div className="app-right">
        <OrderPanel />
        <PortfolioPanel />
      </div>

      {/* Mobile only — FABs + bottom sheets */}
      <MobileSheets />

      {/* AI Chat — floating button, works on all screen sizes */}
      <ChatPanel />

    </div>
  )
}