// Tipos base
export interface ApiResponse<T = any> {
  exito: boolean;
  mensaje: string;
  datos?: T;
  errores?: string[];
}

export interface PaginatedResponse<T> {
  datos: T[];
  paginacion: {
    paginaActual: number;
    totalPaginas: number;
    totalElementos: number;
    elementosPorPagina: number;
  };
}

// Usuario y Autenticación
export interface User {
  _id: string;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: {
    calle?: string;
    ciudad?: string;
    departamento?: string;
    codigoPostal?: string;
    pais?: string;
  };
  rol: 'cliente' | 'comerciante';
  nombreEmpresa?: string;
  descripcionEmpresa?: string;
  categoriaEmpresa?: string;
  sitioWeb?: string;
  redesSociales?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  avatar?: string;
  banner?: string;
  verificado: boolean;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  fechaCreacion: string;
  fechaActualizacion: string;
  configuracionNotificaciones?: {
    email: boolean;
    push: boolean;
    pedidos: boolean;
    promociones: boolean;
  };
  estadisticas?: {
    pedidosRealizados: number;
    totalGastado: number;
    productosVendidos?: number;
    ingresosTotales?: number;
  };
}

export interface AuthResponse {
  usuario: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  rol?: 'cliente' | 'comerciante';
  nombreEmpresa?: string;
}

// Productos
export interface Product {
  _id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagenes: string[];
  categoria: string | Category;
  comerciante: string | User;
  estado: 'aprobado' | 'pausado' | 'agotado';
  especificaciones: Record<string, any>;
  tags: string[];
  fechaCreacion: string;
  fechaActualizacion: string;
  estadisticas: {
    vistas: number;
    vendidos: number;
    calificacionPromedio: number;
    totalReseñas: number;
  };
  // Nuevas propiedades agregadas por el backend
  estadisticasReseñas?: {
    totalReseñas: number;
    promedioCalificacion: number;
    distribucionCalificaciones: { [key: number]: number };
  };
  reseñas?: Array<{
    _id: string;
    calificacion: number;
    comentario: string;
    fechaCreacion: string;
    usuario?: {
      _id: string;
      nombre: string;
    };
  }>;
  productosRelacionados?: Array<{
    _id: string;
    nombre: string;
    precio: number;
    imagenes: string[];
    categoria?: {
      _id: string;
      nombre: string;
    };
    comerciante?: {
      _id: string;
      nombre: string;
    };
  }>;
  estadisticasVentas?: {
    totalVendido: number;
    totalIngresos: number;
  };
}

export interface ProductForm {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  especificaciones?: Record<string, any>;
  tags?: string[];
}

// Categorías
export interface Category {
  _id: string;
  nombre: string;
  descripcion?: string;
  slug: string;
  imagen?: string;
  padre?: string | Category;
  hijos?: Category[];
  estado: 'activa' | 'inactiva';
  orden: number;
  fechaCreacion: string;
  contadorProductos: number;
}

// Carrito
export interface CartItem {
  _id: string;
  producto: Product;
  cantidad: number;
  precio: number;
  subtotal: number;
  imagen?: string;
}

export interface Coupon {
  _id: string;
  codigo: string;
  nombre: string;
  tipoDescuento: 'porcentaje' | 'monto_fijo' | 'envio_gratis';
  descuento: number;
  esEnvioGratis?: boolean;
}

export type DeliveryType = 'domicilio' | 'recoger_establecimiento';

export interface Cart {
  _id: string;
  usuario: string;
  productos: CartItem[];
  cupones: Coupon[];
  tipoEntrega: DeliveryType;
  subtotal: number;
  descuentos: number;
  impuestos: number;
  costoEnvio: number;
  total: number;
  fechaActualizacion: string;
}

// Direcciones
export interface Address {
  _id: string;
  alias: string;
  nombreDestinatario: string;
  telefono: string;
  direccion: {
    calle: string;
    numero?: string;
    apartamento?: string;
    barrio: string;
    ciudad: string;
    departamento: string;
    codigoPostal?: string;
    pais: string;
  };
  tipo: 'casa' | 'apartamento' | 'oficina' | 'otro';
  instruccionesEntrega?: string;
  configuracion: {
    esPredeterminada: boolean;
    esFacturacion: boolean;
    esEnvio: boolean;
    activa: boolean;
  };
  direccionCompleta: string;
  estadisticas: {
    vecesUsada: number;
    ultimoUso?: string;
    entregasExitosas: number;
    entregasFallidas: number;
  };
}

// Pedidos
export interface OrderProduct {
  _id: string;
  producto: Product;
  comerciante: User;
  cantidad: number;
  precio: number;
  subtotal: number;
  nombre: string;
  imagen: string;
}

// Dirección específica para pedidos (como se guarda en el backend)
export interface OrderDeliveryAddress {
  nombre: string;
  telefono?: string;
  calle: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  pais?: string;
  instrucciones?: string;
}

export interface OrderTimeline {
  estado: string;
  titulo: string;
  descripcion: string;
  fecha?: string;
  completado: boolean;
  icono: string;
  detalles?: any;
  esCancelacion?: boolean;
}

export interface Order {
  _id: string;
  numeroOrden: string;
  cliente: User;
  productos: OrderProduct[];
  subtotal: number;
  impuestos: number;
  costoEnvio: number;
  descuentos: number;
  total: number;
  tipoEntrega?: DeliveryType;
  estado: 'pendiente' | 'confirmado' | 'procesando' | 'enviado' | 'entregado' | 'cancelado';
  direccionEntrega: OrderDeliveryAddress | Address; // Puede ser cualquiera de las dos estructuras
  envio?: {
    tipoEnvio?: 'normal' | 'express' | 'recoger_tienda';
    empresa?: string;
    numeroGuia?: string;
    fechaEntregaEstimada?: string;
    fechaEntregaReal?: string;
  };
  metodoPago: {
    tipo: 'PSE' | 'Nequi' | 'tarjeta_credito' | 'wompi' | 'wompi_card';
    estado: 'pendiente' | 'aprobado' | 'rechazado';
    transaccionId?: string;
    fechaPago?: string;
  };
  fechaCreacion: string;
  fechaActualizacion: string;
}

// Reseñas
export interface Review {
  _id: string;
  producto: Product;
  usuario: User;
  calificacion: number;
  titulo?: string;
  comentario: string;
  aspectos?: {
    calidad: number;
    precio: number;
    envio: number;
  };
  respuestaComerciante?: {
    respuesta: string;
    fecha: string;
    usuario: User;
  };
  utilidad: {
    util: number;
    noUtil: number;
  };
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaCreacion: string;
  fechaActualizacion: string;
}

// Notificaciones
export interface Notification {
  _id: string;
  usuario: string;
  tipo: 'pedido_actualizado' | 'pago_confirmado' | 'producto_aprobado' | 'reseña_nueva' | 'promocion';
  titulo: string;
  mensaje: string;
  datos?: any;
  leida: boolean;
  fechaCreacion: string;
}

// Dashboard y Análisis
export interface DashboardStats {
  resumenGeneral: {
    totalProductos: number;
    productosActivos: number;
    pedidosDelMes: number;
    ventasDelMes: number;
    reseñasDelMes: number;
  };
  ventasPorDia: Array<{
    _id: string;
    ventas: number;
    ingresos: number;
  }>;
  alertas: Array<{
    tipo: 'info' | 'warning' | 'error';
    mensaje: string;
  }>;
}

export interface AnalyticsData {
  periodo: string;
  ventasPorPeriodo: Array<{
    _id: string;
    pedidos: number;
    ingresos: number;
    productosVendidos: number;
  }>;
  ventasPorProducto: Array<{
    _id: string;
    nombre: string;
    imagenes: string[];
    cantidadVendida: number;
    ingresos: number;
    pedidos: number;
    margenGanancia: number;
  }>;
  metodosPago: Array<{
    _id: string;
    cantidad: number;
    ingresos: number;
  }>;
  estadosPedidos: Array<{
    _id: string;
    cantidad: number;
    porcentaje: string;
  }>;
  clientesTop: Array<{
    _id: string;
    nombre: string;
    email: string;
    pedidos: number;
    gastoTotal: number;
  }>;
  resumen: {
    totalPedidos: number;
    totalIngresos: number;
    promedioVentaDiaria: string;
  };
}

// Pagos
export interface PaymentMethod {
  tipo: 'PSE' | 'Nequi' | 'tarjeta_credito' | 'wompi' | 'wompi_card';
  nombre: string;
  descripcion: string;
  icono: string;
  disponible: boolean;
  configuracion?: any;
}

export interface PaymentRequest {
  tipo: 'PSE' | 'Nequi' | 'tarjeta_credito' | 'wompi' | 'wompi_card';
  monto: number;
  datos: any;
  pedidoId?: string;
  guardarTarjeta?: boolean;
}

export interface PaymentResponse {
  exito: boolean;
  transaccionId: string;
  estado: 'aprobado' | 'rechazado' | 'pendiente';
  mensaje: string;
  urlRedireccion?: string;
  referencia?: string;
}

// Filtros y búsqueda
export interface ProductFilters {
  q?: string;
  categoria?: string;
  estado?: string;
  precioMin?: number;
  precioMax?: number;
  ordenar?: string;
  page?: number;
  limit?: number;
}

export interface OrderFilters {
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

// Estados de la aplicación
export interface AppState {
  isLoading: boolean;
  error: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  currentPage: string;
}

// Formularios
export interface ContactForm {
  nombre: string;
  email: string;
  telefono?: string;
  asunto: string;
  mensaje: string;
}

export interface AddressForm {
  alias: string;
  nombreDestinatario: string;
  telefono: string;
  direccion: {
    calle: string;
    numero?: string;
    apartamento?: string;
    barrio: string;
    ciudad: string;
    departamento: string;
    codigoPostal?: string;
    pais?: string;
  };
  tipo: 'casa' | 'apartamento' | 'oficina' | 'otro';
  instruccionesEntrega?: string;
  esPredeterminada?: boolean;
  esFacturacion?: boolean;
}

export interface OrderForm {
  productos: Array<{
    producto: string;
    cantidad: number;
  }>;
  direccionEntrega: string | AddressForm | null;
  tipoEntrega: DeliveryType;
  metodoPago: {
    tipo: 'PSE' | 'Nequi' | 'tarjeta_credito' | 'wompi' | 'wompi_card';
    datos: any;
  };
  usarDireccionGuardada: boolean;
  comentarios?: string;
} 