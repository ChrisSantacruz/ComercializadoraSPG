import { User } from '../types';

/** API sometimes returns `id` instead of `_id` */
export function normalizeUser(raw: any): User {
  if (!raw) {
    throw new Error('Usuario inválido');
  }
  const id = raw._id ?? raw.id;
  return {
    ...raw,
    _id: String(id),
    rol: raw.rol ?? null,
    verificado: Boolean(raw.verificado),
    estado: raw.estado ?? 'activo'
  } as User;
}
