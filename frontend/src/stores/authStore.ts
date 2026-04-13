import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthState {
  // Estado
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Acciones
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    nombre: string;
    email: string;
    password: string;
    telefono?: string;
    rol?: 'cliente' | 'comerciante';
    nombreEmpresa?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.login({ email, password });
          
          set({
            user: response.usuario,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Error al iniciar sesión',
          });
          throw error;
        }
      },

      // Registro
      register: async (userData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.register(userData);
          
          set({
            user: response.usuario,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Error al registrarse',
          });
          throw error;
        }
      },

      // Logout
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          // Continuar con logout local aunque falle el servidor
          console.warn('Error al hacer logout en servidor:', error);
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // Limpiar error
      clearError: () => {
        set({ error: null });
      },

      // Actualizar usuario
      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...userData },
          });
        }
      },

      // Verificar autenticación
      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        
        try {
          const user = await authService.getProfile();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // Establecer usuario (para OAuth)
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      // Establecer token (para OAuth)
      setToken: (token: string | null) => {
        set({ token });
      },

    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 