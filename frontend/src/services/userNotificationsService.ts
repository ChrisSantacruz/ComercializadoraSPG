import api, { handleApiResponse } from './api';
import { ApiResponse } from '../types';

export interface AppNotification {
  _id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  estado: 'no_leida' | 'leida' | 'archivada';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  fechaCreacion: string;
  datos?: {
    elementoId?: string;
    tipoElemento?: string;
    url?: string;
    accion?: string;
    datosExtra?: unknown;
  };
}

export interface UserNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const userNotificationsService = {
  async list(): Promise<UserNotificationsResult> {
    const response = await api.get<ApiResponse<UserNotificationsResult>>('/notifications/user');
    return handleApiResponse(response);
  },

  async markRead(id: string): Promise<void> {
    const response = await api.put<ApiResponse<unknown>>(`/notifications/${id}/read`);
    handleApiResponse(response);
  },
};
