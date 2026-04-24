import { useEffect, useRef } from 'react'
import useStore from '../store'

export default function useWebSocket() {
  const setPrice   = useStore(s => s.setPrice)
  const wsRef      = useRef(null)

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'

    function connect() {
      wsRef.current = new WebSocket(WS_URL)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
      }

      wsRef.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'PRICE_UPDATE') {
            setPrice(data.symbol, data.price, data.change, data.changePct, data.signal)
          }
        } catch {}
      }

      wsRef.current.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connect, 3000)
      }

      wsRef.current.onerror = () => {
        wsRef.current?.close()
      }
    }

    connect()

    return () => wsRef.current?.close()
  }, [])
}