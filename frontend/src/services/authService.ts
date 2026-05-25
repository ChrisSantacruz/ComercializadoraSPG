import api, { handleApiResponse } from './api';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../types';
import { normalizeUser } from '../auth/normalizeUser';

function mapAuthPayload(raw: { usuario: unknown; token: string; refreshToken?: string | null }): AuthResponse {
  return {
    usuario: normalizeUser(raw.usuario),
    token: raw.token,
    refreshToken: raw.refreshToken ?? null
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    const d = handleApiResponse<{ usuario: unknown; token: string; refreshToken?: string }>(response);
    return mapAuthPayload(d);
  },

  /** Registro inicial (sin sesión JWT hasta verificar email) */
  registerAccount: async (userData: RegisterData): Promise<{ usuario: User }> => {
    const response = await api.post('/auth/register', userData);
    const d = handleApiResponse<{ usuario: unknown }>(response);
    return { usuario: normalizeUser(d.usuario) };
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/profile');
    const data = handleApiResponse<{ usuario: unknown; estadisticas: unknown }>(response);
    return normalizeUser(data.usuario);
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await api.put('/users/profile', userData);
    const raw = handleApiResponse<unknown>(response);
    return normalizeUser(raw);
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await api.put('/auth/password', {
      currentPassword,
      newPassword
    });
    return handleApiResponse<void>(response);
  },

  forgotPassword: async (email: string): Promise<void> => {
    const response = await api.post('/auth/forgot-password', { email });
    return handleApiResponse<void>(response);
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const response = await api.put(`/auth/reset-password/${encodeURIComponent(token)}`, {
      newPassword
    });
    return handleApiResponse<void>(response);
  },

  verifyEmail: async (token: string): Promise<void> => {
    const response = await api.post('/auth/verify-email', { token });
    return handleApiResponse<void>(response);
  },

  verifyEmailWithCode: async (email: string, codigo: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/verificar-codigo', { email, codigo });
    const d = handleApiResponse<{ usuario: unknown; token: string; refreshToken?: string }>(response);
    return mapAuthPayload(d);
  },

  resendVerificationCode: async (email: string): Promise<void> => {
    const response = await api.post('/auth/reenviar-codigo', { email }, { timeout: 45000 });
    return handleApiResponse<void>(response);
  },

  resendVerificationEmail: async (): Promise<void> => {
    const response = await api.post('/auth/resend-verification');
    return handleApiResponse<void>(response);
  },

  logout: async (): Promise<void> => {
    const response = await api.post('/auth/logout');
    return handleApiResponse<void>(response);
  },

  exchangeOAuthCode: async (code: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/oauth/exchange', { code });
    const d = handleApiResponse<{ usuario: unknown; token: string; refreshToken: string }>(response);
    return mapAuthPayload(d);
  },

  firebaseLogin: async (payload: {
    idToken: string;
    provider: 'google';
    email: string | null;
    nombre: string | null;
    photoURL: string | null;
  }): Promise<{
    requiereSeleccionRol?: boolean;
    pendingToken?: string;
    usuario?: unknown;
    token?: string;
    refreshToken?: string;
  }> => {
    const response = await api.post('/auth/firebase-login', payload);
    return handleApiResponse(response);
  },

  selectRole: async (
    body: Record<string, unknown>,
    pendingToken: string
  ): Promise<{
    requiereVerificacion?: boolean;
    userId?: string;
    token?: string;
    refreshToken?: string;
    usuario?: unknown;
  }> => {
    const response = await api.post('/auth/seleccionar-rol', body, {
      headers: { Authorization: `Bearer ${pendingToken}` }
    });
    return handleApiResponse(response);
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/users/avatar', formData);
    const raw = handleApiResponse<unknown>(response);
    return normalizeUser(raw);
  },

  uploadBanner: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('banner', file);

    const response = await api.post('/users/banner', formData);
    const raw = handleApiResponse<unknown>(response);
    return normalizeUser(raw);
  },

  deleteAccount: async (password: string): Promise<void> => {
    const response = await api.delete('/users/account', {
      data: { password }
    });
    return handleApiResponse<void>(response);
  }
};
