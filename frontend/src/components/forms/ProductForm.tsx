import React, { useState, useEffect } from 'react';
import { Product, Category } from '../../types';
import categoryService from '../../services/categoryService';

interface ProductFormProps {
  product?: Product;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    nombre: product?.nombre || '',
    descripcion: product?.descripcion || '',
    precio: product?.precio || '',
    stock: product?.stock || '',
    categoria: typeof product?.categoria === 'string' ? product.categoria : product?.categoria?._id || '',
    tags: product?.tags?.join(', ') || '',
    especificaciones: JSON.stringify(product?.especificaciones || {}, null, 2)
  });
  const [images, setImages] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [especificacionesSimples, setEspecificacionesSimples] = useState(() => {
    try {
      const specs = product?.especificaciones || {};
      return {
        color: specs.color || '',
        tamaño: specs.tamaño || '',
        material: specs.material || '',
        marca: specs.marca || ''
      };
    } catch {
      return { color: '', tamaño: '', material: '', marca: '' };
    }
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categorias = await categoryService.getCategories();

      if (categorias && Array.isArray(categorias) && categorias.length > 0) {
        setCategories(categorias);
      } else {
        throw new Error('No hay categorías disponibles');
      }
    } catch {
      // Usar categorías por defecto si no se pueden cargar desde la API
      // ObjectIds de ejemplo (24 caracteres hex)
      const categoriasDefault: Category[] = [
        { _id: '64f8c2e2a1b2c3d4e5f6a701', nombre: 'Hogar y Decoración', slug: 'hogar-decoracion', estado: 'activa' as const, orden: 1, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a702', nombre: 'Cocina y Comedor', slug: 'cocina-comedor', estado: 'activa' as const, orden: 2, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a703', nombre: 'Infantil y Bebés', slug: 'infantil-bebes', estado: 'activa' as const, orden: 3, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a704', nombre: 'Aseo y Cuidado Personal', slug: 'aseo-cuidado-personal', estado: 'activa' as const, orden: 4, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a705', nombre: 'Manufactura y Herramientas', slug: 'manufactura-herramientas', estado: 'activa' as const, orden: 5, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a706', nombre: 'Tecnología y Electrónicos', slug: 'tecnologia-electronicos', estado: 'activa' as const, orden: 6, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a707', nombre: 'Ropa y Accesorios', slug: 'ropa-accesorios', estado: 'activa' as const, orden: 7, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a708', nombre: 'Deportes y Recreación', slug: 'deportes-recreacion', estado: 'activa' as const, orden: 8, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a709', nombre: 'Mascotas', slug: 'mascotas', estado: 'activa' as const, orden: 9, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a710', nombre: 'Alimentación y Bebidas', slug: 'alimentacion-bebidas', estado: 'activa' as const, orden: 10, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a711', nombre: 'Limpieza del Hogar', slug: 'limpieza-hogar', estado: 'activa' as const, orden: 11, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a712', nombre: 'Jardinería y Plantas', slug: 'jardineria-plantas', estado: 'activa' as const, orden: 12, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a713', nombre: 'Oficina y Papelería', slug: 'oficina-papeleria', estado: 'activa' as const, orden: 13, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a714', nombre: 'Automóviles y Motocicletas', slug: 'automoviles-motocicletas', estado: 'activa' as const, orden: 14, fechaCreacion: '', contadorProductos: 0 },
        { _id: '64f8c2e2a1b2c3d4e5f6a715', nombre: 'Salud y Bienestar', slug: 'salud-bienestar', estado: 'activa' as const, orden: 15, fechaCreacion: '', contadorProductos: 0 }
      ];
      setCategories(categoriasDefault);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImages(Array.from(e.target.files));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.descripcion.trim()) newErrors.descripcion = 'La descripción es requerida';
    
    const precio = Number(formData.precio);
    const stock = Number(formData.stock);
    
    if (!formData.precio || precio <= 0) newErrors.precio = 'El precio debe ser mayor a 0';
    if (formData.stock && stock < 0) newErrors.stock = 'El stock no puede ser negativo';
    if (!formData.categoria) newErrors.categoria = 'Selecciona una categoría';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = new FormData();
    submitData.append('nombre', formData.nombre);
    submitData.append('descripcion', formData.descripcion);
    submitData.append('precio', formData.precio.toString());
    submitData.append('stock', formData.stock.toString());
    submitData.append('categoria', formData.categoria);
    
    if (formData.tags.trim()) {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim());
      submitData.append('tags', JSON.stringify(tagsArray));
    }
    
    // Crear especificaciones a partir de los campos simples
    const especificacionesFinales = Object.fromEntries(
      Object.entries(especificacionesSimples).filter(([key, value]) => value.trim() !== '')
    );
    
    if (Object.keys(especificacionesFinales).length > 0) {
      submitData.append('especificaciones', JSON.stringify(especificacionesFinales));
    }

    // Agregar imágenes si existen
    if (images && Array.isArray(images)) {
      images.forEach((image, index) => {
        submitData.append('imagenes', image);
      });
    }

    onSubmit(submitData);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {product ? 'Editar Producto' : 'Nuevo Producto'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Producto *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nombre ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nombre del producto"
            />
            {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.categoria ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar categoría</option>
              {categories && Array.isArray(categories) && categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.nombre}
                </option>
              ))}
            </select>
            {errors.categoria && <p className="text-red-500 text-sm mt-1">{errors.categoria}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio (COP) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                min="0"
                step="100"
                className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.precio ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ingresa el precio"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">Precio en pesos colombianos (COP)</p>
            {errors.precio && <p className="text-red-500 text-sm mt-1">{errors.precio}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.stock ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ingresa la cantidad disponible"
            />
            {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción *
          </label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.descripcion ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Descripción detallada del producto"
          />
          {errors.descripcion && <p className="text-red-500 text-sm mt-1">{errors.descripcion}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Etiquetas
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Separadas por comas: oferta, nuevo, popular"
          />
          <p className="text-sm text-gray-500 mt-1">Separa las etiquetas con comas</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Especificaciones del Producto
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Color (ej: Azul, Rojo)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={especificacionesSimples.color}
              onChange={(e) => {
                setEspecificacionesSimples(prev => ({ ...prev, color: e.target.value }));
              }}
            />
            <input
              type="text"
              placeholder="Tamaño (ej: Pequeño, Mediano, Grande)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={especificacionesSimples.tamaño}
              onChange={(e) => {
                setEspecificacionesSimples(prev => ({ ...prev, tamaño: e.target.value }));
              }}
            />
            <input
              type="text"
              placeholder="Material (ej: Algodón, Plástico)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={especificacionesSimples.material}
              onChange={(e) => {
                setEspecificacionesSimples(prev => ({ ...prev, material: e.target.value }));
              }}
            />
            <input
              type="text"
              placeholder="Marca (ej: Nike, Samsung)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={especificacionesSimples.marca}
              onChange={(e) => {
                setEspecificacionesSimples(prev => ({ ...prev, marca: e.target.value }));
              }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Agrega detalles específicos del producto que ayuden a los clientes a tomar una decisión
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imágenes del Producto
          </label>
          <input
            type="file"
            onChange={handleImageChange}
            multiple
            accept="image/*"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">Puedes seleccionar múltiples imágenes</p>
          
          {/* Vista previa de imágenes */}
          {images && images.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Vista previa:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Vista previa ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : product ? 'Actualizar' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm; 