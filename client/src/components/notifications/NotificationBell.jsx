import { useState, useEffect, useRef } from 'react'
import useStore from '../../store'
import { notificationAPI } from '../../services/api'

export default function NotificationBell() {
  const token                         = useStore(s => s.token)
  const [notifications, setNotifs]    = useState([])
  const [unreadCount,   setUnread]    = useState(0)
  const [open,          setOpen]      = useState(false)
  const [loading,       setLoading]   = useState(false)
  const dropdownRef                   = useRef(null)

  // Load notifications
  const loadNotifications = async () => {
    if (!token) return
    try {
      const res = await notificationAPI.getAll()
      setNotifs(res.data.notifications || [])
      setUnread(res.data.unreadCount || 0)
    } catch {}
  }

  useEffect(() => {
    loadNotifications()
    // Poll every 2 minutes for new notifications
    const interval = setInterval(loadNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [token])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(!open)
  }

  const handleMarkRead = async (id) => {
    await notificationAPI.markRead(id)
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllRead()
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnread(0)
  }

  const handleDelete = async (id) => {
    await notificationAPI.delete(id)
    const deleted = notifications.find(n => n._id === id)
    setNotifs(prev => prev.filter(n => n._id !== id))
    if (deleted && !deleted.isRead) setUnread(prev => Math.max(0, prev - 1))
  }

  const handleDeleteAll = async () => {
    await notificationAPI.deleteAll()
    setNotifs([])
    setUnread(0)
  }

  const getIcon = (type) => {
    if (type === 'prediction_correct') return '✅'
    if (type === 'prediction_wrong')   return '❌'
    if (type === 'prediction_expiring') return '⏰'
    return '📊'
  }

  const getTimeAgo = (date) => {
    const diff  = Date.now() - new Date(date).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (days > 0)  return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0)  return `${mins}m ago`
    return 'Just now'
  }

  if (!token) return null

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position:   'relative',
          background: open ? 'var(--bg3)' : 'transparent',
          border:     '1px solid var(--border2)',
          borderRadius: '8px',
          padding:    '6px 10px',
          cursor:     'pointer',
          color:      'var(--text)',
          fontSize:   '16px',
          display:    'flex',
          alignItems: 'center',
          transition: 'all 0.15s'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <div style={{
            position:   'absolute',
            top:        '-6px',
            right:      '-6px',
            background: 'var(--red)',
            color:      '#fff',
            fontSize:   '10px',
            fontWeight: '700',
            borderRadius: '50%',
            width:      '18px',
            height:     '18px',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border:     '2px solid var(--bg2)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:     'absolute',
          top:          '100%',
          right:        0,
          marginTop:    '6px',
          width:        '340px',
          background:   'var(--bg2)',
          border:       '1px solid var(--border2)',
          borderRadius: '12px',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.4)',
          zIndex:       100,
          overflow:     'hidden',
          maxHeight:    '480px',
          display:      'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding:      '12px 16px',
            borderBottom: '1px solid var(--border)',
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
            flexShrink:   0
          }}>
            <div style={{ fontWeight: '700', fontSize: '13px' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft:   '8px',
                  background:   'rgba(59,130,246,0.15)',
                  color:        'var(--blue)',
                  fontSize:     '10px',
                  padding:      '2px 7px',
                  borderRadius: '10px',
                  fontWeight:   '600'
                }}>{unreadCount} new</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--blue)', fontSize: '11px',
                  cursor: 'pointer', padding: '2px 6px'
                }}>Mark all read</button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleDeleteAll} style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--muted)', fontSize: '11px',
                  cursor: 'pointer', padding: '2px 6px'
                }}>Clear all</button>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding:   '32px 16px',
                textAlign: 'center',
                color:     'var(--muted)',
                fontSize:  '12px'
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
                No notifications yet.
                <br />
                Track predictions to get notified!
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  onClick={() => !notif.isRead && handleMarkRead(notif._id)}
                  style={{
                    padding:      '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    background:   notif.isRead ? 'transparent' : 'rgba(59,130,246,0.05)',
                    cursor:       notif.isRead ? 'default' : 'pointer',
                    display:      'flex',
                    gap:          '10px',
                    alignItems:   'flex-start',
                    transition:   'background 0.15s',
                    position:     'relative'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(59,130,246,0.05)'}
                >
                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div style={{
                      position:     'absolute',
                      left:         '6px',
                      top:          '50%',
                      transform:    'translateY(-50%)',
                      width:        '5px',
                      height:       '5px',
                      borderRadius: '50%',
                      background:   'var(--blue)'
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{ fontSize: '20px', flexShrink: 0, marginLeft: '6px' }}>
                    {getIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:   '12px',
                      fontWeight: notif.isRead ? '500' : '700',
                      marginBottom: '3px'
                    }}>
                      {notif.title}
                    </div>
                    <div style={{
                      fontSize:   '11px',
                      color:      'var(--muted)',
                      lineHeight: '1.4'
                    }}>
                      {notif.message}
                    </div>
                    <div style={{
                      fontSize:   '10px',
                      color:      'var(--muted2)',
                      marginTop:  '4px',
                      fontFamily: 'var(--mono)'
                    }}>
                      {getTimeAgo(notif.createdAt)}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(notif._id) }}
                    style={{
                      background:   'transparent',
                      border:       'none',
                      color:        'var(--muted2)',
                      fontSize:     '16px',
                      cursor:       'pointer',
                      padding:      '0 4px',
                      flexShrink:   0,
                      lineHeight:   1,
                      borderRadius: '4px',
                      transition:   'color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}