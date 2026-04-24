import { create } from 'zustand'

const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────
  user:  null,
  token: localStorage.getItem('tradevest_token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('tradevest_token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('tradevest_token')
    set({ user: null, token: null })
  },

  // ── Market ────────────────────────────────────────────────────
  currentSymbol: 'TCS.NS',
  currentData:   null,
  prices:        {},
  isLoading:     false,
  error:         null,

  setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),

  setCurrentData: (data) => set({ currentData: data, isLoading: false }),

  setPrice: (symbol, price, change, changePct, signal) =>
    set(state => ({
      prices: {
        ...state.prices,
        [symbol]: { price, change, changePct, signal }
      }
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError:   (error)     => set({ error }),

  // ── Portfolio ─────────────────────────────────────────────────
  portfolio: null,
  setPortfolio: (portfolio) => set({ portfolio }),

  // ── Order side ───────────────────────────────────────────────
  orderSide: 'buy',
  setOrderSide: (side) => set({ orderSide: side }),
}))

export default useStore