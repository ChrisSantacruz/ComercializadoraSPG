import { AxiosError } from 'axios';
import { ApiResponse } from '../types';

export type AuthErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_MISSING'
  | 'REFRESH_INVALID'
  | 'ACCOUNT_INACTIVE'
  | 'NETWORK'
  | 'UNKNOWN';

export class AuthHttpError extends Error {
  readonly status: number;
  readonly code: AuthErrorCode;

  constructor(message: string, status: number, code: AuthErrorCode) {
    super(message);
    this.name = 'AuthHttpError';
    this.status = status;
    this.code = code;
  }
}

function sanitizeUserFacingMessage(status: number, message: string): string {
  if (process.env.NODE_ENV !== 'production') return message;
  if (status >= 500) {
    return 'No pudimos completar la operación. Intenta de nuevo en unos segundos.';
  }
  if (status === 0) {
    return 'No hay conexión o el servidor no respondió. Revisa tu red e inténtalo de nuevo.';
  }
  return message;
}

export function parseApiError(error: unknown): AuthHttpError {
  if (error instanceof AuthHttpError) return error;

  const ax = error as AxiosError<ApiResponse & { codigo?: string }>;
  const status = ax.response?.status ?? 0;
  const data = ax.response?.data as Record<string, unknown> | undefined;
  const raw =
    (data?.mensaje as string) ||
    (data?.message as string) ||
    (typeof ax.message === 'string' ? ax.message : null) ||
    'Ha ocurrido un error';
  const mensaje = sanitizeUserFacingMessage(status, raw);

  const codigoRaw = data?.codigo as string | undefined;
  const code: AuthErrorCode =
    codigoRaw === 'TOKEN_EXPIRED' ||
    codigoRaw === 'TOKEN_INVALID' ||
    codigoRaw === 'TOKEN_MISSING' ||
    codigoRaw === 'REFRESH_INVALID' ||
    codigoRaw === 'ACCOUNT_INACTIVE'
      ? codigoRaw
      : ax.code === 'ERR_NETWORK' || ax.code === 'ECONNABORTED'
        ? 'NETWORK'
        : 'UNKNOWN';

  return new AuthHttpError(mensaje, status, code);
}
