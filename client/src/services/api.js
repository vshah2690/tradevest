import axios from 'axios'
import useStore from '../store'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
})

// Attach JWT token to every request
API.interceptors.request.use(config => {
  const token = localStorage.getItem('tradevest_token')
    || useStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const marketAPI = {
  getSymbols: ()       => API.get('/market/symbols'),
  getQuote:   (symbol) => API.get(`/market/quote/${symbol}`),
  getHistory: (symbol) => API.get(`/market/history/${symbol}`),
  search:     (query)  => API.get(`/market/search?query=${encodeURIComponent(query)}`),
}

export const predictAPI = {
  predict: (symbol) => API.get(`/predict/${symbol}`),
}

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login:    (data) => API.post('/auth/login', data),
  me:       ()     => API.get('/auth/me'),
}

export const portfolioAPI = {
  getPortfolio: ()     => API.get('/portfolio'),
  placeOrder:   (data) => API.post('/portfolio/order', data),
  getHistory:   ()     => API.get('/portfolio/history'),
}

export const watchlistAPI = {
  get:    ()             => API.get('/watchlist'),
  add:    (symbol, name) => API.post('/watchlist/add', { symbol, name }),
  remove: (symbol)       => API.delete(`/watchlist/${symbol}`),
}

export const trackAPI = {
  track:  (data) => API.post('/track', data),
  getAll: ()     => API.get('/track'),
  delete: (id)   => API.delete(`/track/${id}`),
}

export default API