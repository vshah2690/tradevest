import { useState } from 'react'
import useStore from '../../store'
import StockSearch from '../search/StockSearch'
import AuthModal   from '../auth/AuthModal'
import NotificationBell from '../notifications/NotificationBell'

export default function Navbar() {
  const user          = useStore(s => s.user)
  const logout        = useStore(s => s.logout)
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <nav className="navbar">

        {/* Logo */}
        <div className="navbar-logo">
          <div className="navbar-logo-box">TV</div>
          <span style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px' }}>
            Trade<span style={{ color: 'var(--blue)' }}>Vest</span>
          </span>
        </div>

        {/* Simulation badge */}
        <div className="navbar-badge">SIMULATION</div>

        {/* Search bar */}
        <div className="navbar-search">
          <StockSearch />
        </div>

        {/* Right side */}
        <div className="navbar-right">
          <div className="navbar-live">
            <NotificationBell />
            <div className="navbar-live-dot" />
            <span className="navbar-live-label">Live Data</span>
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700', color: '#fff',
                flexShrink: 0,
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }} className="navbar-username">
                {user.name}
              </span>
              <button onClick={logout} style={{
                background: 'var(--bg4)',
                border: '1px solid var(--border2)',
                color: 'var(--muted)',
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}>Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{
              background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              padding: '6px 16px',
              borderRadius: '7px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>Login</button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}