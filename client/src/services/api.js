import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
})

// Attach JWT token to every request
API.interceptors.request.use(config => {
  const token = localStorage.getItem('tradevest_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const marketAPI = {
  getSymbols:    ()       => API.get('/market/symbols'),
  getQuote:      (symbol) => API.get(`/market/quote/${symbol}`),
}

export const predictAPI = {
  predict: (symbol) => API.get(`/predict/${symbol}`),
}

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login:    (data) => API.post('/auth/login', data),
}

export const portfolioAPI = {
  getPortfolio: ()     => API.get('/portfolio'),
  placeOrder:   (data) => API.post('/portfolio/order', data),
  getHistory:   ()     => API.get('/portfolio/history'),
}

export default API