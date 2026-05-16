import React, { useState } from 'react';
import {
  CurrencyDollarIcon,
  TruckIcon,
  CubeIcon,
  CheckBadgeIcon,
  UsersIcon,
  ShoppingBagIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { useMerchantAnalyticsQuery } from '../../lib/query/hooks/useMerchantQuery';
import { MerchantDashboardSkeleton } from '../../components/merchant/MerchantDashboardSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { getFirstImageUrl } from '../../utils/imageUtils';
import { safeMoney } from '../../lib/safeNumeric';

const PERIODS = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
] as const;

function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {change ? (
            <p
              className={`mt-1 text-xs ${
                changeType === 'positive'
                  ? 'text-success-700'
                  : changeType === 'negative'
                    ? 'text-error-700'
                    : 'text-gray-500'
              }`}
            >
              {change}
            </p>
          ) : null}
        </div>
        <Icon className="h-8 w-8 shrink-0 text-primary-500" aria-hidden />
      </div>
    </div>
  );
}

const MerchantAnalytics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const { data: analytics, isLoading, isError, error, refetch, isFetching } =
    useMerchantAnalyticsQuery(selectedPeriod);

  if (isLoading && !analytics) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <MerchantDashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <ErrorState
          title="No se pudieron cargar las estadísticas"
          message={error instanceof Error ? error.message : 'Error de red'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!analytics) {
    return (
      <EmptyState
        title="Sin datos de analytics"
        description="Cuando registres ventas, verás tendencias aquí."
        actionLabel="Reintentar"
        onAction={() => void refetch()}
      />
    );
  }

  const avgDaily =
    analytics.ventasTotales > 0
      ? Math.round(analytics.totalIngresos / Math.max(analytics.ventasTotales, 1))
      : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 overflow-x-hidden px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Datos del servidor — {isFetching ? 'actualizando…' : 'al día'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Período">
          {PERIODS.map((period) => (
            <button
              key={period.value}
              type="button"
              role="tab"
              aria-selected={selectedPeriod === period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Ingresos del mes"
          value={`$${safeMoney(analytics.ingresosDelMes).toLocaleString('es-CO')}`}
          change={`${analytics.porcentajeCambio >= 0 ? '+' : ''}${analytics.porcentajeCambio.toFixed(1)}% vs mes anterior`}
          changeType={analytics.porcentajeCambio >= 0 ? 'positive' : 'negative'}
          icon={CurrencyDollarIcon}
        />
        <MetricCard
          title="Pedidos en tránsito"
          value={analytics.pedidosEnTransito}
          change="Requieren atención"
          icon={TruckIcon}
        />
        <MetricCard
          title="Productos agotados"
          value={analytics.productosAgotados}
          change="Necesitan restock"
          icon={CubeIcon}
        />
        <MetricCard
          title="Tasa confirmación"
          value={`${analytics.tasaConfirmacion.toFixed(1)}%`}
          change="Sobre pedidos totales"
          icon={CheckBadgeIcon}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Clientes únicos" value={analytics.clientesUnicos} change="En el período" icon={UsersIcon} />
        <MetricCard title="Total productos" value={analytics.totalProductos} icon={ShoppingBagIcon} />
        <MetricCard title="Pedidos del mes" value={analytics.pedidosDelMes} icon={ShoppingBagIcon} />
        <MetricCard
          title="Reseñas"
          value={analytics.totalReseñas}
          change={`${analytics.calificacionPromedio.toFixed(1)} promedio`}
          icon={StarIcon}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Ventas por día</h3>
          {analytics.ventasPorDia.length > 0 ? (
            <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {analytics.ventasPorDia.map((item, index) => (
                <li key={index} className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-600">{item.fecha}</span>
                  <span className="shrink-0 font-medium text-gray-900">
                    {item.ventas} · ${safeMoney(item.ingresos).toLocaleString('es-CO')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Sin ventas en este período.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Pedidos por estado</h3>
          {analytics.pedidosPorEstado.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {analytics.pedidosPorEstado.map((item, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span className="capitalize text-gray-600">{item.estado}</span>
                  <span className="font-medium text-gray-900">{item.cantidad}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No hay pedidos registrados.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Productos más vendidos</h3>
        {analytics.productosMasVendidos.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {analytics.productosMasVendidos.map((item, index) => (
              <li
                key={index}
                className="flex gap-3 rounded-lg border border-gray-100 p-3"
              >
                <img
                  src={getFirstImageUrl(item.producto?.imagenes)}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{item.producto?.nombre}</p>
                  <p className="text-sm text-gray-600">
                    {item.cantidadVendida} u. · $
                    {safeMoney(item.ingresosTotales).toLocaleString('es-CO')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Sin ventas registradas"
            description="Tus productos más vendidos aparecerán cuando cierres pedidos."
          />
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Resumen de ventas</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="text-center sm:text-left">
            <dt className="text-sm text-gray-600">Total pedidos</dt>
            <dd className="text-2xl font-bold text-gray-900">{analytics.pedidosTotales}</dd>
          </div>
          <div className="text-center sm:text-left">
            <dt className="text-sm text-gray-600">Ingresos totales</dt>
            <dd className="text-2xl font-bold text-gray-900">
              ${safeMoney(analytics.totalIngresos).toLocaleString('es-CO')}
            </dd>
          </div>
          <div className="text-center sm:text-left">
            <dt className="text-sm text-gray-600">Promedio por pedido</dt>
            <dd className="text-2xl font-bold text-gray-900">
              ${avgDaily.toLocaleString('es-CO')}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
};

export default MerchantAnalytics;

