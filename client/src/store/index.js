import { create } from 'zustand'

const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────
  user:  null,
  token: localStorage.getItem('tradevest_token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('tradevest_token', token)
    set({
      user,
      token,
      // Discard guest watchlist on login — Sidebar useEffect will load user's saved list
      watchlist:          [],
      isDefault:          false,
      // Clear tracked predictions — will reload from MongoDB
      trackedPredictions: [],
      trackedSymbols:     [],
    })
  },

  logout: () => {
    localStorage.removeItem('tradevest_token')
    set({
      user:               null,
      token:              null,
      // Clear everything on logout
      watchlist:          [],
      isDefault:          false,
      trackedPredictions: [],
      trackedSymbols:     [],
    })
  },

  // ── Market ────────────────────────────────────────────────────
  currentSymbol: 'TCS.NS',
  currentData:   null,
  prices:        {},
  isLoading:     false,
  error:         null,

  setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),
  setCurrentData:   (data)   => set({ currentData: data, isLoading: false }),

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
  portfolio:    null,
  setPortfolio: (portfolio) => set({ portfolio }),

  // ── Order side ────────────────────────────────────────────────
  orderSide:    'buy',
  setOrderSide: (side) => set({ orderSide: side }),

  // ── Watchlist ─────────────────────────────────────────────────
  // Starts empty on every page load — guest additions are memory only
  // Lost on refresh (intentional — encourages login)
  watchlist:    [],
  isDefault:    false,
  setWatchlist: (watchlist, isDefault) => set({ watchlist, isDefault }),

  addToWatchlist: (symbol, name) => {
    const { watchlist } = get()
    if (watchlist.find(w => w.symbol === symbol)) return
    set({ watchlist: [...watchlist, { symbol, name }] })
  },

  removeFromWatchlist: (symbol) => set(state => ({
    watchlist: state.watchlist.filter(w => w.symbol !== symbol)
  })),

  // ── Tracked Predictions ───────────────────────────────────────
  trackedPredictions: [],
  trackedSymbols:     [],

  setTrackedPredictions: (preds) => set({
    trackedPredictions: preds,
    trackedSymbols:     preds
      .filter(p => p.outcome === 'PENDING')
      .map(p => p.symbol)
  }),

  addTrackedPrediction: (pred) => set(state => ({
    trackedPredictions: [pred, ...state.trackedPredictions],
    trackedSymbols:     [...state.trackedSymbols, pred.symbol]
  })),

  removeTrackedPrediction: (id, symbol) => set(state => ({
    trackedPredictions: state.trackedPredictions.filter(p => p._id !== id),
    trackedSymbols:     state.trackedSymbols.filter(s => s !== symbol)
  })),

}))

export default useStore