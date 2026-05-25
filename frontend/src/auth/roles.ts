import { User } from '../types';

export type AppRole = NonNullable<User['rol']>;

const ROLE_ALIASES: Record<string, AppRole[]> = {
  user: ['user', 'cliente'],
  cliente: ['user', 'cliente'],
  merchant: ['merchant', 'comerciante'],
  comerciante: ['merchant', 'comerciante'],
  admin: ['admin', 'administrador'],
  administrador: ['admin', 'administrador'],
  superadmin: ['superadmin'],
};

export function hasRole(userRole: User['rol'], allowed: AppRole[]) {
  if (!userRole) return false;
  const expanded = new Set(allowed.flatMap((role) => ROLE_ALIASES[role] || [role]));
  return expanded.has(userRole);
}

export function isMerchantRole(role: User['rol']) {
  return hasRole(role, ['merchant']);
}

export function isAdminRole(role: User['rol']) {
  return hasRole(role, ['admin', 'superadmin']);
}
