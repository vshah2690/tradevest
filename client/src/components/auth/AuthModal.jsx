import { useState } from 'react'
import useStore from '../../store'
import { authAPI } from '../../services/api'

export default function AuthModal({ onClose }) {
  const setAuth    = useStore(s => s.setAuth)
  const [mode,     setMode]     = useState('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    if (mode === 'register' && !name) {
      setError('Name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = mode === 'login'
        ? await authAPI.login({ email, password })
        : await authAPI.register({ name, email, password })

      setAuth(res.data.user, res.data.token)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      background:     'rgba(0,0,0,0.7)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      zIndex:         100,
    }} onClick={onClose}>

      <div style={{
        background:   'var(--bg2)',
        border:       '1px solid var(--border2)',
        borderRadius: '16px',
        padding:      '28px',
        width:        '360px',
        boxShadow:    '0 24px 48px rgba(0,0,0,0.4)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            {mode === 'login'
              ? 'Login to track your portfolio'
              : 'Start with ₹1,00,000 virtual cash'}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display:      'flex',
          background:   'var(--bg3)',
          borderRadius: '8px',
          padding:      '3px',
          marginBottom: '20px'
        }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null) }} style={{
              flex:         1,
              padding:      '7px',
              borderRadius: '6px',
              border:       'none',
              cursor:       'pointer',
              fontSize:     '12px',
              fontWeight:   '600',
              background:   mode === m ? 'var(--bg5)' : 'transparent',
              color:        mode === m ? 'var(--text)' : 'var(--muted)',
              transition:   'all 0.12s'
            }}>{m === 'login' ? 'Login' : 'Register'}</button>
          ))}
        </div>

        {/* Fields */}
        {mode === 'register' && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Name
            </div>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg3)',
                border: '1px solid var(--border2)', borderRadius: '8px',
                padding: '10px 12px', color: 'var(--text)',
                fontFamily: 'var(--font)', fontSize: '13px', outline: 'none'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Email
          </div>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg3)',
              border: '1px solid var(--border2)', borderRadius: '8px',
              padding: '10px 12px', color: 'var(--text)',
              fontFamily: 'var(--font)', fontSize: '13px', outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Password
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', background: 'var(--bg3)',
              border: '1px solid var(--border2)', borderRadius: '8px',
              padding: '10px 12px', color: 'var(--text)',
              fontFamily: 'var(--font)', fontSize: '13px', outline: 'none'
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '16px', padding: '10px 12px',
            background: 'rgba(255,77,106,0.1)',
            border: '1px solid rgba(255,77,106,0.2)',
            borderRadius: '7px', fontSize: '12px', color: 'var(--red)'
          }}>{error}</div>
        )}

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '12px',
          borderRadius: '9px', border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px', fontWeight: '700',
          background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
          color: '#fff', opacity: loading ? 0.7 : 1,
          transition: 'all 0.15s'
        }}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>

        {/* Close */}
        <button onClick={onClose} style={{
          width: '100%', marginTop: '10px', padding: '8px',
          background: 'transparent', border: 'none',
          color: 'var(--muted)', fontSize: '12px', cursor: 'pointer'
        }}>Cancel</button>
      </div>
    </div>
  )
}