import { create } from 'zustand';
import { User } from '@/types/stock';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
  isPremium: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  isAdmin: () => get().user?.role === 'admin',
  isPremium: () => get().user?.role === 'premium' || get().user?.role === 'admin',
}));
