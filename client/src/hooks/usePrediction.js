import { useState, useCallback } from 'react'
import { predictAPI } from '../services/api'
import useStore from '../store'

export default function usePrediction() {
  const setCurrentData = useStore(s => s.setCurrentData)
  const setLoading     = useStore(s => s.setLoading)
  const [predicting, setPredicting] = useState(false)

  const predict = useCallback(async (symbol) => {
    setPredicting(true)
    setLoading(true)
    try {
      const res = await predictAPI.predict(symbol)
      setCurrentData(res.data)
      return res.data
    } catch (err) {
      console.error('Prediction failed:', err)
      setLoading(false)
      return null
    } finally {
      setPredicting(false)
    }
  }, [])

  return { predict, predicting }
}