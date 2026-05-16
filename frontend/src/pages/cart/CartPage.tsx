import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { CartItem } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { useCartMutations } from '../../lib/query/hooks/useCartQuery';
import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card, CardBody } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNotifications } from '../../components/ui/NotificationContainer';
import ProductImage from '../../components/ui/ProductImage';
import { safeInt, safeMoney } from '../../lib/safeNumeric';

type ConfirmState = { kind: 'remove'; productId: string; name: string } | { kind: 'clear' } | null;

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { showWarning } = useNotifications();
  const cart = useCartStore((s) => s.cart);
  const getCart = useCartStore((s) => s.getCart);
  const storeError = useCartStore((s) => s.error);
  const clearStoreError = useCartStore((s) => s.clearError);
  const { updateMutation, removeMutation, clearMutation } = useCartMutations();

  const [bootLoading, setBootLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const rowBusy = (productId: string) =>
    (updateMutation.isPending && updateMutation.variables?.productId === productId) ||
    (removeMutation.isPending && removeMutation.variables === productId);

  const clearingCart = clearMutation.isPending;

  const loadCart = useCallback(async () => {
    clearStoreError();
    try {
      await getCart();
    } catch {
      /* error en store + notify si aplica */
    } finally {
      setBootLoading(false);
    }
  }, [getCart, clearStoreError]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    updateMutation.mutate({ productId, cantidad: newQuantity });
  };

  const handleRemoveItem = (productId: string) => {
    removeMutation.mutate(productId, {
      onSettled: () => setConfirm(null),
    });
  };

  const handleClearCart = () => {
    clearMutation.mutate(undefined, {
      onSettled: () => setConfirm(null),
    });
  };

  const handleCheckout = () => {
    if (!cart || cart.productos.length === 0) {
      showWarning('Carrito vacío', 'Agrega productos antes de ir al checkout.');
      return;
    }
    navigate('/checkout');
  };

  const lineCount = cart?.productos?.length ?? 0;
  const unitCount = cart?.productos?.reduce((t, i) => t + safeInt(i.cantidad, 0), 0) ?? 0;
  const subtotal = safeMoney(cart?.subtotal);
  const descuentos = safeMoney(cart?.descuentos);
  const envio = safeMoney(cart?.costoEnvio);
  const impuestos = safeMoney(cart?.impuestos);
  const total = safeMoney(cart?.total);

  if (bootLoading && !cart) {
    return (
      <Container as="main" className="space-y-6 py-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Container>
    );
  }

  return (
    <Container
      as="main"
      className={`space-y-6 py-8 ${lineCount > 0 ? 'pb-36 max-lg:pb-44 lg:pb-8' : ''}`}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Carrito</h1>
          <p className="mt-1 text-sm text-gray-600">
            {lineCount > 0
              ? `${lineCount} ${lineCount === 1 ? 'línea' : 'líneas'} · ${unitCount} unidades`
              : 'Aún no hay productos aquí'}
          </p>
        </div>
        {lineCount > 0 ? (
          <Button type="button" variant="ghost" className="self-start text-error-700 hover:bg-error-50" onClick={() => setConfirm({ kind: 'clear' })}>
            Vaciar carrito
          </Button>
        ) : null}
      </div>

      {storeError ? (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{storeError}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadCart()}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : null}

      {lineCount > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cart!.productos.map((item: CartItem) => {
              const img0 = item.producto.imagenes?.[0];
              const rawSrc = typeof img0 === 'string' ? img0 : (img0 as { url?: string } | undefined)?.url;
              const qty = safeInt(item.cantidad, 0);
              const stock = safeInt(item.producto.stock, 0);
              const unit = safeMoney(item.precio);
              const sub = safeMoney(item.subtotal);

              return (
                <Card key={item._id} className="overflow-hidden">
                  <CardBody className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 sm:h-32 sm:w-32">
                      {rawSrc ? (
                        <ProductImage src={rawSrc} alt={item.producto.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                          <ShoppingCartIcon className="h-10 w-10" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                      <div>
                        <Link
                          to={`/productos/${item.producto._id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-700"
                        >
                          {item.producto.nombre}
                        </Link>
                        {item.producto.descripcion ? (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.producto.descripcion}</p>
                        ) : null}
                        <p className="mt-2 text-base font-semibold tabular-nums text-gray-900">
                          ${unit.toLocaleString('es-CO')} <span className="text-sm font-normal text-gray-500">c/u</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
                          <button
                            type="button"
                            className="px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            disabled={rowBusy(item.producto._id)}
                            onClick={() =>
                              qty <= 1
                                ? setConfirm({
                                    kind: 'remove',
                                    productId: item.producto._id,
                                    name: item.producto.nombre,
                                  })
                                : void handleUpdateQuantity(item.producto._id, qty - 1)
                            }
                            aria-label="Disminuir cantidad"
                          >
                            −
                          </button>
                          <span className="min-w-[2.5rem] border-x border-gray-200 px-3 py-2 text-center text-sm font-semibold tabular-nums">
                            {rowBusy(item.producto._id) ? '…' : qty}
                          </span>
                          <button
                            type="button"
                            className="px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            disabled={rowBusy(item.producto._id) || qty >= stock}
                            onClick={() => handleUpdateQuantity(item.producto._id, qty + 1)}
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-error-700"
                          disabled={rowBusy(item.producto._id)}
                          onClick={() =>
                            setConfirm({ kind: 'remove', productId: item.producto._id, name: item.producto.nombre })
                          }
                          aria-label={`Quitar ${item.producto.nombre}`}
                        >
                          <TrashIcon className="mr-1 h-4 w-4" />
                          Quitar
                        </Button>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 pt-3 text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-semibold tabular-nums text-gray-900">${sub.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-dropdown max-lg:border-t max-lg:border-gray-200 max-lg:bg-white/95 max-lg:px-4 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))] max-lg:pt-3 max-lg:shadow-strong max-lg:backdrop-blur lg:contents">
              <Card className="lg:sticky lg:top-28 rounded-none border-x-0 border-b-0 max-lg:border-0 max-lg:shadow-none lg:rounded-xl">
              <CardBody>
                <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Subtotal</dt>
                    <dd className="font-medium tabular-nums">${subtotal.toLocaleString('es-CO')}</dd>
                  </div>
                  {descuentos > 0 ? (
                    <div className="flex justify-between text-success-700">
                      <dt>Descuentos</dt>
                      <dd className="font-medium tabular-nums">−${descuentos.toLocaleString('es-CO')}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Envío</dt>
                    <dd className="font-medium tabular-nums">${envio.toLocaleString('es-CO')}</dd>
                  </div>
                  {envio > 0 ? (
                    <p className="text-xs text-gray-500">El costo de envío se confirma antes de pagar.</p>
                  ) : null}
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Impuestos</dt>
                    <dd className="font-medium tabular-nums">${impuestos.toLocaleString('es-CO')}</dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums text-primary-800">${total.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                {cart!.cupones && cart!.cupones.length > 0 ? (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cupones</p>
                    <ul className="mt-2 space-y-2">
                      {cart!.cupones.map((cupon, index) => (
                        <li key={index} className="flex justify-between rounded-lg bg-success-50 px-3 py-2 text-sm">
                          <span className="font-medium text-success-900">{cupon.codigo}</span>
                          <span className="tabular-nums text-success-800">
                            {cupon.tipoDescuento === 'porcentaje'
                              ? `−${cupon.descuento}%`
                              : `−$${safeMoney(cupon.descuento).toLocaleString('es-CO')}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <Button type="button" variant="primary" size="lg" className="mt-6 w-full" onClick={handleCheckout}>
                  Ir al checkout
                </Button>
                <Link
                  to="/productos"
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-base font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  Seguir comprando
                </Link>
              </CardBody>
            </Card>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Tu carrito está vacío"
          description="Explora el catálogo y añade productos. Los totales se calculan al actualizar el carrito en el servidor."
          icon={<ShoppingCartIcon className="h-10 w-10" aria-hidden />}
          actionLabel="Ver productos"
          onAction={() => navigate('/productos')}
        />
      )}

      <Modal
        open={confirm?.kind === 'clear'}
        onClose={() => setConfirm(null)}
        title="Vaciar carrito"
        description="Se eliminarán todas las líneas. Esta acción no se puede deshacer desde aquí."
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={clearingCart}
            onClick={() => void handleClearCart()}
          >
            Vaciar
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirm?.kind === 'remove'}
        onClose={() => setConfirm(null)}
        title="Quitar producto"
        description={
          confirm?.kind === 'remove'
            ? `¿Quitar «${confirm.name}» del carrito?`
            : undefined
        }
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={
              confirm?.kind === 'remove' &&
              removeMutation.isPending &&
              removeMutation.variables === confirm.productId
            }
            onClick={() => confirm?.kind === 'remove' && void handleRemoveItem(confirm.productId)}
          >
            Quitar
          </Button>
        </div>
      </Modal>
    </Container>
  );
};

export default CartPage;
