import useStore from '../../store'

export default function Navbar() {
  const user   = useStore(s => s.user)
  const logout = useStore(s => s.logout)

  return (
    <nav style={{
      gridColumn: '1 / -1',
      background:   'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      display:      'flex',
      alignItems:   'center',
      padding:      '0 20px',
      gap:          '16px',
      height:       '48px',
      zIndex:       10,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px', height: '28px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '7px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '12px', color: '#fff'
        }}>TV</div>
        <span style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px' }}>
          Trade<span style={{ color: 'var(--blue)' }}>Vest</span>
        </span>
      </div>

      {/* Badge */}
      <div style={{
        fontSize: '10px', fontWeight: '600',
        background: 'rgba(59,130,246,0.12)',
        color: 'var(--blue)',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: '4px', padding: '2px 8px',
        letterSpacing: '0.5px'
      }}>SIMULATION</div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Market status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--green)',
            animation: 'pulse 2s infinite'
          }} />
          Live Data
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{user.name}</span>
            <button onClick={logout} style={{
              background: 'var(--bg4)', border: '1px solid var(--border2)',
              color: 'var(--muted)', fontSize: '11px',
              padding: '5px 12px', borderRadius: '6px', cursor: 'pointer'
            }}>Logout</button>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Not logged in</div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </nav>
  )
}