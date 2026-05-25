import React, { useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button, FormField, Input } from '../../ui';
import { ProductVariantDraft } from './types';
import { formatCurrency } from './productFormUtils';

type AttributeDraft = {
  id: string;
  name: string;
  values: string;
};

interface ProductVariantBuilderProps {
  variants: ProductVariantDraft[];
  basePrice: string;
  baseStock: string;
  disabled?: boolean;
  onChange: (variants: ProductVariantDraft[]) => void;
}

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const splitValues = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const cartesian = (groups: Array<{ name: string; values: string[] }>) =>
  groups.reduce<Array<Record<string, string>>>(
    (acc, group) =>
      acc.flatMap((item) =>
        group.values.map((value) => ({
          ...item,
          [group.name]: value,
        })),
      ),
    [{}],
  );

const signatureFor = (attributes: Record<string, string>) =>
  Object.entries(attributes)
    .map(([key, value]) => [key.trim().toLowerCase(), value.trim().toLowerCase()])
    .filter(([key, value]) => key && value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

const attributesLabel = (attributes: Record<string, string>) =>
  Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');

export const ProductVariantBuilder: React.FC<ProductVariantBuilderProps> = ({
  variants,
  basePrice,
  baseStock,
  disabled,
  onChange,
}) => {
  const [attributes, setAttributes] = useState<AttributeDraft[]>([
    { id: createId(), name: 'Color', values: '' },
    { id: createId(), name: 'Talla', values: '' },
  ]);

  const activeCount = variants.filter((variant) => variant.activo).length;
  const stockTotal = variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0);
  const minPrice = variants.reduce<number | null>((min, variant) => {
    const price = Number(variant.precioOferta || variant.precio || basePrice);
    if (!Number.isFinite(price) || price <= 0) return min;
    return min == null ? price : Math.min(min, price);
  }, null);

  const generatedPreview = useMemo(() => {
    const groups = attributes
      .map((attribute) => ({
        name: attribute.name.trim(),
        values: splitValues(attribute.values),
      }))
      .filter((attribute) => attribute.name && attribute.values.length > 0);

    if (groups.length === 0) return [];
    return cartesian(groups);
  }, [attributes]);

  const updateAttribute = (id: string, patch: Partial<AttributeDraft>) => {
    setAttributes((current) =>
      current.map((attribute) => (attribute.id === id ? { ...attribute, ...patch } : attribute)),
    );
  };

  const addAttribute = () => {
    setAttributes((current) => [...current, { id: createId(), name: '', values: '' }]);
  };

  const removeAttribute = (id: string) => {
    setAttributes((current) => current.filter((attribute) => attribute.id !== id));
  };

  const generateVariants = () => {
    const existing = new Map(variants.map((variant) => [signatureFor(variant.attributes), variant]));
    const parsedBaseStock = Math.max(0, Math.floor(Number(baseStock) || 0));
    const generatedCount = generatedPreview.length || 1;
    const stockPerVariant = Math.floor(parsedBaseStock / generatedCount);
    const stockRemainder = parsedBaseStock % generatedCount;

    const next = generatedPreview.map((attributesSet, index) => {
      const existingVariant = existing.get(signatureFor(attributesSet));
      if (existingVariant) return existingVariant;

      return {
        sku: '',
        attributes: attributesSet,
        precio: basePrice || '',
        precioOferta: '',
        stock: String(stockPerVariant + (index < stockRemainder ? 1 : 0)),
        imagenes: [],
        activo: true,
        isDefault: variants.length === 0 && index === 0,
      };
    });

    onChange(next.map((variant, index) => ({ ...variant, isDefault: index === 0 })));
  };

  const updateVariant = (index: number, patch: Partial<ProductVariantDraft>) => {
    onChange(variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  };

  const setDefaultVariant = (index: number) => {
    onChange(variants.map((variant, i) => ({ ...variant, isDefault: i === index })));
  };

  const removeVariant = (index: number) => {
    const next = variants.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((variant) => variant.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    onChange(next);
  };

  const updateVariantImage = (index: number, url: string) => {
    updateVariant(index, {
      imagenes: url.trim() ? [{ url: url.trim() }] : [],
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Variantes activas" value={String(activeCount)} />
        <SummaryCard label="Stock total" value={String(stockTotal)} />
        <SummaryCard label="Precio desde" value={formatCurrency(minPrice || basePrice)} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-950">Atributos del producto</h3>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Crea atributos flexibles como color, talla, versión, almacenamiento o material. Se generan combinaciones exactas para stock y precio.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addAttribute} disabled={disabled}>
            <PlusIcon className="mr-2 h-4 w-4" aria-hidden />
            Añadir atributo
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {attributes.map((attribute) => (
            <div key={attribute.id} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
              <Input
                value={attribute.name}
                onChange={(event) => updateAttribute(attribute.id, { name: event.target.value })}
                disabled={disabled}
                placeholder="Atributo"
              />
              <Input
                value={attribute.values}
                onChange={(event) => updateAttribute(attribute.id, { values: event.target.value })}
                disabled={disabled}
                placeholder="Valores separados por coma. Ej: rojo, azul, negro"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAttribute(attribute.id)}
                disabled={disabled || attributes.length <= 1}
                aria-label="Eliminar atributo"
              >
                <TrashIcon className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Combinaciones listas: <span className="font-semibold text-gray-800">{generatedPreview.length}</span>
          </p>
          <Button type="button" onClick={generateVariants} disabled={disabled || generatedPreview.length === 0}>
            <Squares2X2Icon className="mr-2 h-4 w-4" aria-hidden />
            Generar combinaciones
          </Button>
        </div>
      </div>

      {variants.length > 0 ? (
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div
              key={`${signatureFor(variant.attributes)}-${index}`}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 text-sm font-semibold text-gray-950">{attributesLabel(variant.attributes)}</p>
                    {variant.isDefault ? (
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                        Variante principal
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        variant.activo ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {variant.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Edita el precio, stock e imagen de esta combinación.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={variant.isDefault ? 'primary' : 'outline'}
                    onClick={() => setDefaultVariant(index)}
                    disabled={disabled}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircleIcon className="mr-1.5 h-4 w-4" aria-hidden />
                    Principal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={variant.activo ? 'outline' : 'secondary'}
                    onClick={() => updateVariant(index, { activo: !variant.activo })}
                    disabled={disabled}
                    className="w-full sm:w-auto"
                  >
                    {variant.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeVariant(index)}
                    disabled={disabled}
                    aria-label="Eliminar variante"
                    className="col-span-2 w-full sm:col-span-1 sm:w-auto"
                  >
                    <TrashIcon className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                <FormField id={`variant-sku-${index}`} label="SKU">
                  <Input
                    value={variant.sku}
                    onChange={(event) => updateVariant(index, { sku: event.target.value })}
                    disabled={disabled}
                    placeholder="Auto"
                  />
                </FormField>
                <FormField id={`variant-price-${index}`} label="Precio">
                  <Input
                    type="number"
                    value={variant.precio}
                    onChange={(event) => updateVariant(index, { precio: event.target.value })}
                    disabled={disabled}
                    min="0"
                    step="100"
                    inputMode="numeric"
                  />
                </FormField>
                <FormField id={`variant-offer-${index}`} label="Oferta">
                  <Input
                    type="number"
                    value={variant.precioOferta}
                    onChange={(event) => updateVariant(index, { precioOferta: event.target.value })}
                    disabled={disabled}
                    min="0"
                    step="100"
                    inputMode="numeric"
                    placeholder="Opcional"
                  />
                </FormField>
                <FormField id={`variant-stock-${index}`} label="Stock">
                  <Input
                    type="number"
                    value={variant.stock}
                    onChange={(event) => updateVariant(index, { stock: event.target.value })}
                    disabled={disabled}
                    min="0"
                    inputMode="numeric"
                  />
                </FormField>
                <FormField id={`variant-image-${index}`} label="Imagen">
                  <Input
                    value={variant.imagenes[0]?.url || ''}
                    onChange={(event) => updateVariantImage(index, event.target.value)}
                    disabled={disabled}
                    placeholder="URL de imagen"
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-sm font-medium text-gray-950">Sin variantes todavía</p>
          <p className="mt-1 text-sm text-gray-500">Agrega atributos y genera combinaciones para controlar stock, precio e imagen por opción.</p>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-2 text-lg font-semibold text-gray-950">{value}</p>
  </div>
);
