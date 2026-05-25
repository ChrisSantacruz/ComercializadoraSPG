import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  TrashIcon,
  UsersIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import adminService, { AdminDashboard } from '../../services/adminService';
import { Product, User } from '../../types';
import { Badge, Button, Card, CardBody, Input, Select, useNotifications } from '../../components/ui';
import ProductImage from '../../components/ui/ProductImage';
import { getFirstImageUrl } from '../../utils/imageUtils';

const productStateLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

const productStateTone = (estado: string): 'success' | 'warning' | 'error' | 'neutral' => {
  if (['approved', 'aprobado'].includes(estado)) return 'success';
  if (['pending', 'pendiente'].includes(estado)) return 'warning';
  if (['rejected', 'rechazado', 'suspended', 'suspendido'].includes(estado)) return 'error';
  return 'neutral';
};

const getMerchantName = (product: Product) => {
  const merchant = product.comerciante;
  if (merchant && typeof merchant === 'object') {
    return merchant.nombreEmpresa || merchant.nombre || merchant.email || 'Comerciante';
  }
  return 'Comerciante';
};

const AdminDashboardPage: React.FC = () => {
  const { showSuccess, showError } = useNotifications();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'users'>('products');
  const [filters, setFilters] = useState({ q: '', estado: 'pending' });

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, productData, userData] = await Promise.all([
        adminService.getDashboard(),
        adminService.getProducts({ limit: 30, estado: filters.estado || undefined, q: filters.q || undefined }),
        adminService.getUsers({ limit: 30 }),
      ]);
      setDashboard(dashboardData);
      setProducts(productData.datos || []);
      setUsers(userData.datos || []);
    } catch (error) {
      showError('Panel admin', error instanceof Error ? error.message : 'No se pudo cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, [filters.estado, filters.q, showError]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const metrics = useMemo(() => {
    const m = dashboard?.metrics;
    return [
      { label: 'Productos pendientes', value: m?.pendingProducts ?? 0, icon: ClockIcon },
      { label: 'Productos totales', value: m?.totalProducts ?? 0, icon: ShieldCheckIcon },
      { label: 'Comerciantes', value: m?.totalMerchants ?? 0, icon: UsersIcon },
      { label: 'Pedidos', value: m?.totalOrders ?? 0, icon: CheckCircleIcon },
    ];
  }, [dashboard]);

  const runProductAction = async (id: string, action: 'approve' | 'reject' | 'suspend' | 'delete') => {
    try {
      setActionId(`${action}-${id}`);
      if (action === 'approve') {
        await adminService.approveProduct(id);
        showSuccess('Moderación', 'Producto aprobado y visible en catálogo.');
      } else if (action === 'reject') {
        const reason = window.prompt('Razón de rechazo visible para el comerciante');
        if (!reason?.trim()) return;
        await adminService.rejectProduct(id, reason.trim());
        showSuccess('Moderación', 'Producto rechazado con razón registrada.');
      } else if (action === 'suspend') {
        await adminService.suspendProduct(id);
        showSuccess('Moderación', 'Producto suspendido.');
      } else {
        if (!window.confirm('Eliminar este producto de forma permanente?')) return;
        await adminService.deleteProduct(id);
        showSuccess('Moderación', 'Producto eliminado.');
      }
      await loadAdminData();
    } catch (error) {
      showError('Moderación', error instanceof Error ? error.message : 'No se pudo completar la acción.');
    } finally {
      setActionId(null);
    }
  };

  const updateUserStatus = async (user: User, estado: 'activo' | 'inactivo' | 'bloqueado') => {
    try {
      setActionId(`user-${user._id}`);
      await adminService.updateUserStatus(user._id, estado);
      showSuccess('Usuarios', 'Estado actualizado.');
      await loadAdminData();
    } catch (error) {
      showError('Usuarios', error instanceof Error ? error.message : 'No se pudo actualizar el usuario.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Administración</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            Panel operativo
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Controla moderación de productos, usuarios y señales principales antes de abrir staging a pruebas reales.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadAdminData()} loading={loading}>
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardBody className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-950">{metric.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardBody className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeTab === 'products' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600'}`}
              >
                Productos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeTab === 'users' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-600'}`}
              >
                Usuarios
              </button>
            </div>

            {activeTab === 'products' ? (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px] lg:w-[34rem]">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={filters.q}
                    onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                    placeholder="Buscar producto o descripción"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filters.estado}
                  onChange={(event) => setFilters((prev) => ({ ...prev, estado: event.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobados</option>
                  <option value="rejected">Rechazados</option>
                  <option value="suspended">Suspendidos</option>
                </Select>
              </div>
            ) : null}
          </div>

          {activeTab === 'products' ? (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Comerciante</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Precio</th>
                    <th className="py-3 pl-4 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr key={product._id} className="align-middle">
                      <td className="py-3 pr-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            <ProductImage src={getFirstImageUrl(product.imagenes)} alt={product.nombre} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-950">{product.nombre}</p>
                            {product.moderacion?.razonRechazo ? (
                              <p className="mt-1 truncate text-xs text-error-700">{product.moderacion.razonRechazo}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getMerchantName(product)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={productStateTone(product.estado)}>
                          {productStateLabels[product.estado] || product.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-gray-900">
                        ${Number(product.precio || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" loading={actionId === `approve-${product._id}`} onClick={() => void runProductAction(product._id, 'approve')}>
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" loading={actionId === `reject-${product._id}`} onClick={() => void runProductAction(product._id, 'reject')}>
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" loading={actionId === `suspend-${product._id}`} onClick={() => void runProductAction(product._id, 'suspend')}>
                            <NoSymbolIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" loading={actionId === `delete-${product._id}`} onClick={() => void runProductAction(product._id, 'delete')}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <Card key={user._id}>
                  <CardBody className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-950">{user.nombre}</p>
                        <p className="truncate text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Badge variant={user.estado === 'activo' ? 'success' : user.estado === 'bloqueado' ? 'error' : 'neutral'}>
                        {user.estado}
                      </Badge>
                    </div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{user.rol || 'Sin rol'}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" loading={actionId === `user-${user._id}`} onClick={() => void updateUserStatus(user, 'activo')}>
                        Activar
                      </Button>
                      <Button size="sm" variant="outline" loading={actionId === `user-${user._id}`} onClick={() => void updateUserStatus(user, 'bloqueado')}>
                        Bloquear
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
