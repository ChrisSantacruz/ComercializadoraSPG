import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';
import { authService } from '../services/authService';
import { normalizeUser } from '../auth/normalizeUser';

export type AuthBootstrapPhase = 'pending' | 'restoring' | 'ready';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  bootstrapPhase: AuthBootstrapPhase;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    nombre: string;
    email: string;
    password: string;
    telefono?: string;
    rol?: 'user' | 'merchant' | 'cliente' | 'comerciante';
    nombreEmpresa?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  bootstrapSession: () => Promise<void>;
  /** @deprecated usar bootstrapSession */
  checkAuth: () => Promise<void>;
  setSession: (payload: { user: User; token: string; refreshToken: string | null }) => void;
  applyTokenPair: (token: string, refreshToken: string) => void;
  clearLocalSession: () => void;
}

const emptySession = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      bootstrapPhase: 'pending',
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          set({
            user: normalizeUser(response.usuario),
            token: response.token,
            refreshToken: response.refreshToken ?? null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            bootstrapPhase: 'ready'
          });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Error al iniciar sesión';
          set({
            ...emptySession,
            isLoading: false,
            error: msg,
            bootstrapPhase: 'ready'
          });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          await authService.registerAccount(userData);
          set({ isLoading: false, error: null });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Error al registrarse';
          set({ isLoading: false, error: msg });
          throw error;
        }
      },

      logout: async () => {
        try {
          if (get().token) {
            await authService.logout();
          }
        } catch {
          // La sesión local debe limpiarse aunque falle el cierre en servidor (red caída, 5xx).
        }
        set({
          ...emptySession,
          bootstrapPhase: 'ready'
        });
      },

      clearError: () => set({ error: null }),

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },

      bootstrapSession: async () => {
        const { token, bootstrapPhase } = get();
        if (bootstrapPhase === 'restoring') return;
        if (!token) {
          set({
            bootstrapPhase: 'ready',
            isAuthenticated: false,
            user: null,
            refreshToken: null
          });
          return;
        }

        set({ bootstrapPhase: 'restoring' });
        try {
          const user = await authService.getProfile();
          set({
            user: normalizeUser(user),
            isAuthenticated: true,
            bootstrapPhase: 'ready',
            error: null
          });
        } catch {
          // Token inválido o error de red: no forzar navegación global (DEC-ERR-003); limpiar persistencia local.
          set({
            ...emptySession,
            bootstrapPhase: 'ready'
          });
        }
      },

      checkAuth: async () => {
        await get().bootstrapSession();
      },

      setSession: ({ user, token, refreshToken }) => {
        set({
          user: normalizeUser(user),
          token,
          refreshToken,
          isAuthenticated: true,
          bootstrapPhase: 'ready',
          error: null
        });
      },

      applyTokenPair: (token: string, refreshToken: string) => {
        set({ token, refreshToken, isAuthenticated: true, bootstrapPhase: 'ready' });
      },

      clearLocalSession: () => {
        set({ ...emptySession, bootstrapPhase: 'ready' });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
