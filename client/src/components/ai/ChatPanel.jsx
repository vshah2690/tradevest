import { useState, useRef, useEffect } from 'react'
import useStore from '../../store'
import { aiAPI } from '../../services/api'
import AuthModal from '../auth/AuthModal'

const SUGGESTED_QUESTIONS = [
  'Should I buy this stock now?',
  'What is the risk level?',
  'Explain the AI prediction',
  'What is the price target?',
]

export default function ChatPanel() {
  const currentSymbol = useStore(s => s.currentSymbol)
  const currentData   = useStore(s => s.currentData)
  const token         = useStore(s => s.token)

  const [messages,   setMessages]  = useState([])
  const [input,      setInput]     = useState('')
  const [loading,    setLoading]   = useState(false)
  const [engine,     setEngine]    = useState('gpt4')
  const [isOpen,     setIsOpen]    = useState(false)
  const [showAuth,   setShowAuth]  = useState(false)
  const [remaining,  setRemaining] = useState(5)
  const messagesEndRef             = useRef(null)
  const inputRef                   = useRef(null)

  const symClean = currentSymbol?.replace('.NS','').replace('.BO','')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset chat when stock changes
  useEffect(() => {
    setMessages([])
  }, [currentSymbol])

  // Fetch remaining count when chat opens
    useEffect(() => {
    if (!isOpen || !token) return
    aiAPI.remaining()
        .then(res => setRemaining(res.data.remaining))
        .catch(() => {})
    }, [isOpen, token])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date() }])
    setLoading(true)

    try {
      const res = await aiAPI.chat({
        message: msg,
        symbol:  currentSymbol,
        engine,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      })
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   res.data.reply,
        engine:    res.data.engine,
        timestamp: new Date()
      }])
      if (res.data.remaining !== undefined) setRemaining(res.data.remaining)
    } catch (err) {
  if (err.response?.status === 429) {
    setRemaining(0)
    setMessages(prev => [...prev, {
      role:      'assistant',
      content:   '⏰ You have used all 5 messages. Come back in 3 days for more AI analysis!',
      isError:   false,
      timestamp: new Date()
    }])
  } else {
    setMessages(prev => [...prev, {
      role:      'assistant',
      content:   err.response?.data?.error || 'AI service unavailable. Please try again.',
      isError:   true,
      timestamp: new Date()
    }])
  }
} finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Floating button ───────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <>
        <button
          onClick={() => {
            if (!token) { setShowAuth(true); return }
            setIsOpen(true)
          }}
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
            border: 'none', cursor: 'pointer', fontSize: '22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
            zIndex: 500, transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title={token ? 'Ask AI Analyst' : 'Login to use AI Analyst'}
        >
          🤖
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    )
  }

  // ── Chat panel ────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        width: '360px', height: '520px',
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        zIndex: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(139,92,246,0.1))',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🤖 TradeVest AI
              {currentData && (
                <span style={{
                  fontSize: '10px', fontWeight: '500',
                  color: 'var(--muted)', background: 'var(--bg4)',
                  padding: '2px 6px', borderRadius: '4px'
                }}>
                  {symClean}
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>
              Powered by {engine === 'claude' ? 'Claude (Anthropic)' : 'GPT-4o (OpenAI)'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Engine toggle */}
            <div style={{ display: 'flex', background: 'var(--bg4)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
              {[
                { id: 'gpt4',   label: 'GPT-4' },
                { id: 'claude', label: 'Claude' },
              ].map(e => (
                <button key={e.id} onClick={() => setEngine(e.id)} style={{
                  padding: '3px 8px', borderRadius: '4px', border: 'none',
                  cursor: 'pointer', fontSize: '10px', fontWeight: '600',
                  background: engine === e.id ? 'var(--blue)' : 'transparent',
                  color: engine === e.id ? '#fff' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}>
                  {e.label}
                </button>
              ))}
            </div>

            {/* Remaining counter */}
            <div style={{
              fontSize: '10px', fontWeight: '600',
              color: remaining <= 1 ? 'var(--red)' : 'var(--muted)',
              background: 'var(--bg4)', padding: '3px 7px',
              borderRadius: '4px', fontFamily: 'var(--mono)',
            }}>
              {remaining}/5
            </div>

            {/* Close */}
            <button onClick={() => setIsOpen(false)} style={{
              background: 'transparent', border: 'none',
              color: 'var(--muted)', fontSize: '18px',
              cursor: 'pointer', padding: '2px 4px', lineHeight: 1,
            }}>×</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

          {/* Welcome */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                TradeVest AI Analyst
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                {currentData ? `Ask me anything about ${symClean}` : 'Select a stock then ask me anything'}
              </div>
              {currentData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)} style={{
                      padding: '8px 12px', borderRadius: '8px',
                      border: '1px solid var(--border2)', background: 'var(--bg3)',
                      color: 'var(--text)', cursor: 'pointer',
                      fontSize: '11px', textAlign: 'left', transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg3)'}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '10px',
            }}>
              <div style={{
                maxWidth: '85%', padding: '9px 12px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #2563eb, #8b5cf6)'
                  : msg.isError ? 'rgba(255,77,106,0.1)' : 'var(--bg3)',
                border: msg.role === 'assistant'
                  ? `1px solid ${msg.isError ? 'rgba(255,77,106,0.2)' : 'var(--border)'}` : 'none',
                color: msg.role === 'user' ? '#fff' : msg.isError ? 'var(--red)' : 'var(--text)',
                fontSize: '12px', lineHeight: '1.5',
              }}>
                {msg.content}
                <div style={{
                  fontSize: '9px',
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--muted2)',
                  marginTop: '4px', textAlign: 'right',
                }}>
                  {msg.role === 'assistant' && msg.engine && (
                    <span style={{ marginRight: '4px' }}>
                      {msg.engine === 'claude' ? '🔵 Claude' : '🟢 GPT-4o'}
                    </span>
                  )}
                  {new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
              <div style={{
                padding: '10px 14px', borderRadius: '12px 12px 12px 2px',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: 'var(--blue)',
                    animation: `dot 1.2s ease-in-out ${i * 0.4}s infinite alternate`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: '8px', alignItems: 'flex-end',
          flexShrink: 0, background: 'var(--bg2)',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentData ? `Ask about ${symClean}...` : 'Select a stock first...'}
            disabled={!currentData || loading || remaining === 0}
            rows={1}
            style={{
              flex: 1, background: 'var(--bg3)',
              border: '1px solid var(--border2)', borderRadius: '8px',
              padding: '8px 10px', color: 'var(--text)',
              fontSize: '12px', resize: 'none', outline: 'none',
              fontFamily: 'var(--font)', lineHeight: '1.4',
              maxHeight: '80px', overflowY: 'auto',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || !currentData || remaining === 0}
            style={{
              width: '34px', height: '34px', borderRadius: '8px', border: 'none',
              background: !input.trim() || loading || !currentData || remaining === 0
                ? 'var(--bg4)' : 'linear-gradient(135deg, #2563eb, #8b5cf6)',
              color: !input.trim() || loading || !currentData || remaining === 0
                ? 'var(--muted)' : '#fff',
              cursor: !input.trim() || loading || !currentData || remaining === 0
                ? 'not-allowed' : 'pointer',
              fontSize: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            ↑
          </button>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}