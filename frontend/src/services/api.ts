import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';
import { API_BASE } from '../config/env';
import { getAccessTokenFromStorage, getRefreshTokenFromStorage } from '../auth/tokenBridge';
import { emitAuthSessionLost } from '../auth/authEvents';
import { AuthHttpError, parseApiError } from './authErrors';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (err: unknown, token: string | null = null) => {
  queue.forEach((p) => {
    if (err) p.reject(err);
    else if (token) p.resolve(token);
    else p.reject(new Error('No token'));
  });
  queue = [];
};

function shouldSkipAuthRetry(config?: InternalAxiosRequestConfig) {
  const url = config?.url || '';
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/oauth/exchange') ||
    url.includes('/auth/firebase-login') ||
    url.includes('/auth/verificar-codigo') ||
    url.includes('/auth/seleccionar-rol')
  );
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessTokenFromStorage();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response,
  async (error: AxiosError<ApiResponse & { codigo?: string }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const codigo = error.response?.data?.codigo;

    if (status === 401 && original && !original._retry && !shouldSkipAuthRetry(original)) {
      const isExpired =
        codigo === 'TOKEN_EXPIRED' || error.response?.data?.mensaje === 'Token expirado.';

      if (isExpired) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            queue.push({
              resolve: (token: string) => {
                original.headers.Authorization = `Bearer ${token}`;
                resolve(api(original));
              },
              reject
            });
          });
        }

        original._retry = true;
        isRefreshing = true;

        const refresh = getRefreshTokenFromStorage();
        if (!refresh) {
          isRefreshing = false;
          emitAuthSessionLost({ reason: 'no_refresh' });
          return Promise.reject(parseApiError(error));
        }

        try {
          const { data } = await axios.post<ApiResponse<{ token: string; refreshToken: string }>>(
            `${API_BASE}/auth/refresh`,
            { refreshToken: refresh },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (!data.exito || !data.datos?.token) {
            throw new Error(data.mensaje || 'Refresh fallido');
          }

          const { useAuthStore } = await import('../stores/authStore');
          useAuthStore.getState().applyTokenPair(data.datos.token, data.datos.refreshToken);

          processQueue(null, data.datos.token);
          original.headers.Authorization = `Bearer ${data.datos.token}`;
          return api(original);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          emitAuthSessionLost({ reason: 'refresh_failed' });
          return Promise.reject(parseApiError(refreshErr));
        } finally {
          isRefreshing = false;
        }
      }

      emitAuthSessionLost({ reason: 'unauthorized' });
    }

    return Promise.reject(parseApiError(error));
  }
);

export const handleApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  const data = response.data;

  if (Array.isArray(data)) {
    return data as T;
  }

  if (data && typeof data === 'object' && 'exito' in data) {
    if (data.exito) {
      return data.datos as T;
    }
    throw new AuthHttpError(data.mensaje || 'Error en la API', response.status, 'UNKNOWN');
  }

  return data as T;
};

export { AuthHttpError } from './authErrors';

export default api;
