import { useState, useCallback } from 'react'
import { predictAPI } from '../services/api'
import useStore from '../store'

export default function usePrediction() {
  const setCurrentData     = useStore(s => s.setCurrentData)
  const setCurrentName     = useStore(s => s.setCurrentName)
  const setLoading         = useStore(s => s.setLoading)
  const setPredictionError = useStore(s => s.setPredictionError)
  const [predicting, setPredicting] = useState(false)

  const predict = useCallback(async (symbol) => {
    setPredicting(true)
    setLoading(true)
    setPredictionError(null)
    setCurrentData(null)
    try {
      const res = await predictAPI.predict(symbol)
      setCurrentData(res.data)
      if (res.data.name) setCurrentName(res.data.name)
      return res.data
    } catch (err) {
      console.error('Prediction failed:', err)
      setPredictionError(`No data found for ${symbol}. Try a different symbol.`)
      setLoading(false)
      return null
    } finally {
      setPredicting(false)
    }
  }, [])

  return { predict, predicting }
}