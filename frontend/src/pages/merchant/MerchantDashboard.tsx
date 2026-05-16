import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TruckIcon,
  CubeIcon,
  CheckBadgeIcon,
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  useMerchantAnalyticsQuery,
  useMerchantDashboardQuery,
  useMerchantProductsQuery,
  useMerchantReviewStatsQuery,
} from '../../lib/query/hooks/useMerchantQuery';
import { MerchantDashboardSkeleton } from '../../components/merchant/MerchantDashboardSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import TopProductsWidget from '../../components/dashboard/TopProductsWidget';
import { safeMoney } from '../../lib/safeNumeric';
import { getFirstImageUrl } from '../../utils/imageUtils';

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

const MerchantDashboard: React.FC = () => {
  const dashboard = useMerchantDashboardQuery();
  const analytics = useMerchantAnalyticsQuery('30d');
  const products = useMerchantProductsQuery({ limit: 8, page: 1 });
  const reviews = useMerchantReviewStatsQuery();

  const isLoading =
    dashboard.isLoading || analytics.isLoading || products.isLoading;

  const topProducts = useMemo(() => {
    const fromAnalytics = analytics.data?.productosMasVendidos ?? [];
    if (fromAnalytics.length > 0) return fromAnalytics;
    return (dashboard.data?.productosMasVendidos ?? []).map((p) => ({
      producto: { nombre: p.nombre, imagenes: p.imagenes },
      cantidadVendida: p.totalVendido ?? 0,
      ingresosTotales: p.ingresos ?? 0,
    }));
  }, [analytics.data, dashboard.data]);

  if (isLoading && !dashboard.data) {
    return <MerchantDashboardSkeleton />;
  }

  if (dashboard.isError) {
    return (
      <ErrorState
        title="No pudimos cargar el dashboard"
        message={
          dashboard.error instanceof Error
            ? dashboard.error.message
            : 'Error de red o sesión.'
        }
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const stats = dashboard.data;
  if (!stats) {
    return (
      <EmptyState
        title="Sin datos del panel"
        description="Aún no hay información de ventas para mostrar."
        actionLabel="Reintentar"
        onAction={() => void dashboard.refetch()}
      />
    );
  }

  const r = stats.resumenGeneral;
  const pct = r.porcentajeCambio ?? 0;
  const pctLabel =
    pct === 0
      ? 'Sin variación vs mes anterior'
      : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs mes anterior`;

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Panel comerciante</h1>
        <p className="mt-1 text-sm text-gray-600">Métricas reales de tu tienda — últimos 30 días</p>
        {stats.alertas?.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {stats.alertas.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {a.mensaje}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <MetricTile
          label="Ventas del mes"
          value={`$${safeMoney(r.ventasDelMes).toLocaleString('es-CO')}`}
          hint={pctLabel}
          icon={CurrencyDollarIcon}
        />
        <MetricTile
          label="Pedidos en tránsito"
          value={r.pedidosEnTransito}
          hint="Requieren acción"
          icon={TruckIcon}
        />
        <MetricTile
          label="Agotados"
          value={r.productosAgotados}
          hint="Restock sugerido"
          icon={CubeIcon}
        />
        <MetricTile
          label="Confirmación"
          value={`${(r.tasaConfirmacion ?? 0).toFixed(1)}%`}
          hint="Entregas vs activos"
          icon={CheckBadgeIcon}
        />
        <MetricTile
          label="Clientes únicos"
          value={r.clientesUnicos}
          hint="Este mes"
          icon={UsersIcon}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
            <Badge variant="primary">{r.pedidosDelMes} pedidos / mes</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Productos activos</dt>
              <dd className="text-xl font-semibold text-gray-900">{r.productosActivos}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Total catálogo</dt>
              <dd className="text-xl font-semibold text-gray-900">{r.totalProductos}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Reseñas del mes</dt>
              <dd className="text-xl font-semibold text-gray-900">{r.reseñasDelMes}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Calificación</dt>
              <dd className="text-xl font-semibold text-gray-900">
                {reviews.data?.calificacionPromedio
                  ? reviews.data.calificacionPromedio.toFixed(1)
                  : stats.estadisticasReseñas?.promedioCalificacion?.toFixed(1) ?? '—'}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/merchant/products/new"
              className="inline-flex h-9 items-center rounded-lg bg-secondary-500 px-3 text-sm font-medium text-white hover:bg-secondary-600"
            >
              Nuevo producto
            </Link>
            <Link
              to="/merchant/orders"
              className="inline-flex h-9 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Ver pedidos
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <ShoppingBagIcon className="h-5 w-5 text-primary-600" />
              Catálogo reciente
            </h2>
            <Link to="/merchant/products" className="text-sm font-medium text-primary-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {products.data?.datos?.length ? (
            <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {products.data.datos.slice(0, 6).map((producto) => (
                <li key={producto._id}>
                  <Link
                    to={`/productos/${producto._id}`}
                    className="flex gap-3 rounded-lg border border-gray-100 p-2 hover:bg-gray-50"
                  >
                    <img
                      src={getFirstImageUrl(producto.imagenes)}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{producto.nombre}</p>
                      <p className="text-sm text-gray-600">
                        ${safeMoney(producto.precio).toLocaleString('es-CO')}
                      </p>
                      <Badge variant={producto.stock > 0 ? 'success' : 'error'} className="mt-1">
                        Stock {producto.stock}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Sin productos"
              description="Publica tu primer producto para empezar a vender."
              actionLabel="Publicar producto"
              onAction={() => {
                window.location.href = '/merchant/products/new';
              }}
            />
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProductsWidget topProducts={topProducts} loading={analytics.isFetching} />
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Ingresos (analytics)</h3>
          {analytics.isError ? (
            <p className="mt-4 text-sm text-error-600">
              {analytics.error instanceof Error
                ? analytics.error.message
                : 'No se pudieron cargar tendencias.'}
            </p>
          ) : analytics.data ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Ingresos del mes</dt>
                <dd className="font-semibold text-gray-900">
                  ${safeMoney(analytics.data.ingresosDelMes).toLocaleString('es-CO')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Pedidos totales</dt>
                <dd className="font-semibold text-gray-900">{analytics.data.pedidosTotales}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Entregados</dt>
                <dd className="font-semibold text-gray-900">{analytics.data.pedidosEntregados}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Cargando tendencias…</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default MerchantDashboard;



