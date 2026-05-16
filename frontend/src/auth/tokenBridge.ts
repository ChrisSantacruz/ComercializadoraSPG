/** Read tokens from Zustand persist payload without importing the store (breaks axios↔store cycles). */

const AUTH_STORAGE_KEY = 'auth-storage';

type PersistShape = {
  state?: {
    token?: string | null;
    refreshToken?: string | null;
  };
};

function readPersisted(): { token: string | null; refreshToken: string | null } {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: null, refreshToken: null };
    const parsed = JSON.parse(raw) as PersistShape;
    return {
      token: parsed.state?.token ?? null,
      refreshToken: parsed.state?.refreshToken ?? null
    };
  } catch {
    return { token: null, refreshToken: null };
  }
}

export function getAccessTokenFromStorage(): string | null {
  return readPersisted().token;
}

export function getRefreshTokenFromStorage(): string | null {
  return readPersisted().refreshToken;
}
