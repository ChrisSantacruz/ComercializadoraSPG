import { AxiosError } from 'axios';
import type { ApiResponse } from '../types';

export type ApiErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_MISSING'
  | 'REFRESH_INVALID'
  | 'ACCOUNT_INACTIVE'
  | 'VALIDATION_ERROR'
  | 'VARIANT_REQUIRED'
  | 'VARIANT_UNAVAILABLE'
  | 'PRODUCT_NOT_AVAILABLE'
  | 'PRODUCT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_LINE_ITEM'
  | 'INVALID_QUANTITY'
  | 'ORDER_CREATE_FAILED'
  | 'NETWORK'
  | 'UNKNOWN';

export type ApiFieldError = {
  campo?: string;
  mensaje: string;
};

const SUGGESTED_ACTIONS: Partial<Record<string, string>> = {
  VALIDATION_ERROR: 'Revisa los datos e inténtalo de nuevo',
  VARIANT_REQUIRED: 'Elige talla, color o versión en la ficha del producto',
  VARIANT_UNAVAILABLE: 'Elige otra variante disponible',
  PRODUCT_NOT_AVAILABLE: 'Elige otro producto del catálogo',
  PRODUCT_NOT_FOUND: 'Quita el producto del carrito y actualiza la página',
  INSUFFICIENT_STOCK: 'Reduce la cantidad o elige otra variante',
  INVALID_LINE_ITEM: 'Vuelve al carrito y actualiza la página',
  INVALID_QUANTITY: 'Revisa las cantidades en tu carrito',
  ORDER_CREATE_FAILED: 'Intenta de nuevo en unos segundos',
  TOKEN_EXPIRED: 'Inicia sesión de nuevo',
  TOKEN_INVALID: 'Inicia sesión de nuevo',
  TOKEN_MISSING: 'Inicia sesión para continuar',
  NETWORK: 'Revisa tu conexión e inténtalo de nuevo',
};

export class ApiHttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly suggestedAction?: string;
  readonly fieldErrors?: ApiFieldError[];

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode,
    options?: { suggestedAction?: string; fieldErrors?: ApiFieldError[] },
  ) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.code = code;
    this.suggestedAction = options?.suggestedAction;
    this.fieldErrors = options?.fieldErrors;
  }

  get displayMessage(): string {
    if (this.suggestedAction && this.message) {
      return `${this.message} ${this.suggestedAction}`;
    }
    return this.message;
  }
}

/** @deprecated Use ApiHttpError — kept for auth interceptors */
export class AuthHttpError extends ApiHttpError {}

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

function extractFieldErrors(data: Record<string, unknown> | undefined): ApiFieldError[] | undefined {
  const raw = data?.errores;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((e) => {
    const row = e as Record<string, unknown>;
    return {
      campo: typeof row.campo === 'string' ? row.campo : undefined,
      mensaje: String(row.mensaje || row.msg || 'Dato inválido'),
    };
  });
}

function buildMessageFromPayload(
  data: Record<string, unknown> | undefined,
  fallback: string,
): string {
  const fieldErrors = extractFieldErrors(data);
  if (fieldErrors?.length) {
    return fieldErrors.map((e) => e.mensaje).join('. ');
  }
  const raw =
    (data?.mensaje as string) ||
    (data?.message as string) ||
    fallback;
  return raw;
}

export function parseApiError(error: unknown): ApiHttpError {
  if (error instanceof ApiHttpError) return error;

  const ax = error as AxiosError<ApiResponse & { codigo?: string; accion?: string }>;
  const status = ax.response?.status ?? 0;
  const data = ax.response?.data as Record<string, unknown> | undefined;
  const fieldErrors = extractFieldErrors(data);
  const rawMessage = buildMessageFromPayload(data, typeof ax.message === 'string' ? ax.message : 'Ha ocurrido un error');
  const mensaje = sanitizeUserFacingMessage(status, rawMessage);

  const codigoRaw = (data?.codigo as string) || (data?.code as string);
  const authCodes = new Set([
    'TOKEN_EXPIRED',
    'TOKEN_INVALID',
    'TOKEN_MISSING',
    'REFRESH_INVALID',
    'ACCOUNT_INACTIVE',
  ]);
  const commerceCodes = new Set([
    'VALIDATION_ERROR',
    'VARIANT_REQUIRED',
    'VARIANT_UNAVAILABLE',
    'PRODUCT_NOT_AVAILABLE',
    'PRODUCT_NOT_FOUND',
    'INSUFFICIENT_STOCK',
    'INVALID_LINE_ITEM',
    'INVALID_QUANTITY',
    'ORDER_CREATE_FAILED',
  ]);

  let code: ApiErrorCode = 'UNKNOWN';
  if (codigoRaw && authCodes.has(codigoRaw)) {
    code = codigoRaw as ApiErrorCode;
  } else if (codigoRaw && commerceCodes.has(codigoRaw)) {
    code = codigoRaw as ApiErrorCode;
  } else if (ax.code === 'ERR_NETWORK' || ax.code === 'ECONNABORTED' || status === 0) {
    code = 'NETWORK';
  }

  const suggestedAction =
    (data?.accion as string) ||
    SUGGESTED_ACTIONS[codigoRaw || ''] ||
    SUGGESTED_ACTIONS[code];

  return new ApiHttpError(mensaje, status, code, { suggestedAction, fieldErrors });
}

export function getApiErrorMessage(error: unknown, fallback = 'Ha ocurrido un error'): string {
  if (error instanceof ApiHttpError) return error.displayMessage;
  if (error instanceof Error) return error.message;
  return fallback;
}
