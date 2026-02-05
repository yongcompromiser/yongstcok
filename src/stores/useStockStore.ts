import { create } from 'zustand';
import { Stock, StockPrice } from '@/types/stock';

interface StockState {
  // 검색
  searchQuery: string;
  searchResults: Stock[];
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Stock[]) => void;

  // 선택된 종목
  selectedStock: Stock | null;
  selectedPrice: StockPrice | null;
  setSelectedStock: (stock: Stock | null) => void;
  setSelectedPrice: (price: StockPrice | null) => void;

  // 관심기업 (로컬 캐시)
  watchlist: Stock[];
  setWatchlist: (stocks: Stock[]) => void;
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  // 검색
  searchQuery: '',
  searchResults: [],
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),

  // 선택된 종목
  selectedStock: null,
  selectedPrice: null,
  setSelectedStock: (selectedStock) => set({ selectedStock }),
  setSelectedPrice: (selectedPrice) => set({ selectedPrice }),

  // 관심기업
  watchlist: [],
  setWatchlist: (watchlist) => set({ watchlist }),
  addToWatchlist: (stock) => set((state) => ({
    watchlist: [...state.watchlist, stock]
  })),
  removeFromWatchlist: (symbol) => set((state) => ({
    watchlist: state.watchlist.filter((s) => s.symbol !== symbol)
  })),
}));
