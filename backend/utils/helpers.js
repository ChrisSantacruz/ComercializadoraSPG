// Función para crear respuesta estándar de la API
const crearRespuesta = (exito = true, mensaje = '', datos = null, meta = null) => {
  const respuesta = {
    exito,
    mensaje
  };
  
  if (datos !== null) {
    respuesta.datos = datos;
  }
  
  if (meta !== null) {
    respuesta.meta = meta;
  }
  
  return respuesta;
};

// Función para crear respuesta de error
const crearRespuestaError = (mensaje, detalles = null) => {
  const respuesta = {
    exito: false,
    mensaje
  };
  
  if (detalles) {
    respuesta.detalles = detalles;
  }
  
  return respuesta;
};

// Función para enviar respuesta exitosa
const successResponse = (res, mensaje, datos = null, codigo = 200) => {
  const respuesta = {
    exito: true,
    mensaje
  };
  
  if (datos !== null) {
    respuesta.datos = datos;
  }
  
  return res.status(codigo).json(respuesta);
};

// Función para enviar respuesta de error
const errorResponse = (res, mensaje, codigo = 500, detalles = null) => {
  const respuesta = {
    exito: false,
    mensaje
  };

  // DEC-API-006: never leak raw internals / stack payloads to clients in production
  if (detalles && process.env.NODE_ENV === 'development') {
    respuesta.detalles = detalles;
  }

  return res.status(codigo).json(respuesta);
};

// Función para paginación
const crearPaginacion = (pagina, limite, total) => {
  const paginaActual = parseInt(pagina) || 1;
  const limitePorPagina = parseInt(limite) || 10;
  const totalPaginas = Math.ceil(total / limitePorPagina);
  const saltar = (paginaActual - 1) * limitePorPagina;
  
  return {
    paginaActual,
    limitePorPagina,
    totalPaginas,
    totalElementos: total,
    saltar,
    tienePaginaAnterior: paginaActual > 1,
    tienePaginaSiguiente: paginaActual < totalPaginas
  };
};

// Función para generar slug único
const generarSlug = (texto, sufijo = '') => {
  let slug = texto
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Remover guiones múltiples
    .replace(/^-|-$/g, ''); // Remover guiones al inicio/final
  
  if (sufijo) {
    slug += `-${sufijo}`;
  }
  
  return slug;
};

// Función para formatear precios en COP
const formatearPrecio = (precio, incluirSimbolo = true) => {
  const precioFormateado = new Intl.NumberFormat('es-CO').format(precio);
  return incluirSimbolo ? `$${precioFormateado} COP` : precioFormateado;
};

// Función para calcular porcentaje de descuento
const calcularPorcentajeDescuento = (precioOriginal, precioOferta) => {
  if (!precioOferta || precioOferta >= precioOriginal) return 0;
  return Math.round(((precioOriginal - precioOferta) / precioOriginal) * 100);
};

// Función para validar email
const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Función para validar teléfono colombiano
const validarTelefonoColombia = (telefono) => {
  const regex = /^(\+57)?[13][0-9]{9}$/;
  return regex.test(telefono.replace(/\s/g, ''));
};

// Función para generar número de orden único
const generarNumeroOrden = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SPG-${timestamp}-${random}`;
};

// Función para calcular tiempo de lectura (en minutos)
const calcularTiempoLectura = (texto) => {
  const palabras = texto.split(' ').length;
  const tiempoLectura = Math.ceil(palabras / 200); // 200 palabras por minuto promedio
  return tiempoLectura;
};

// Función para truncar texto
const truncarTexto = (texto, longitud = 100, sufijo = '...') => {
  if (texto.length <= longitud) return texto;
  return texto.substring(0, longitud).trim() + sufijo;
};

// Función para capitalizar primera letra
const capitalizarPrimeraLetra = (texto) => {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

// Función para capitalizar cada palabra
const capitalizarPalabras = (texto) => {
  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
};

// Función para limpiar texto (remover HTML, etc.)
const limpiarTexto = (texto) => {
  return texto
    .replace(/<[^>]*>/g, '') // Remover HTML tags
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
};

// Función para generar colores aleatorios
const generarColorAleatorio = () => {
  const colores = [
    '#1D4ED8', '#3B82F6', '#10B981', '#F59E0B', 
    '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'
  ];
  return colores[Math.floor(Math.random() * colores.length)];
};

// Función para validar formato de archivo
const validarFormatoArchivo = (nombreArchivo, formatosPermitidos) => {
  const extension = nombreArchivo.split('.').pop().toLowerCase();
  return formatosPermitidos.includes(extension);
};

// Función para obtener extensión de archivo
const obtenerExtensionArchivo = (nombreArchivo) => {
  return nombreArchivo.split('.').pop().toLowerCase();
};

// Función para convertir bytes a formato legible
const formatearTamañoArchivo = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Función para generar hash simple
const generarHashSimple = (texto) => {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    const char = texto.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  return Math.abs(hash).toString(36);
};

// Función para debounce
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Función para throttle
const throttle = (func, delay) => {
  let lastExecTime = 0;
  return (...args) => {
    const currentTime = Date.now();
    if (currentTime - lastExecTime > delay) {
      func.apply(null, args);
      lastExecTime = currentTime;
    }
  };
};

// Función para ordenar objetos por múltiples campos
const ordenarPor = (array, campos) => {
  return array.sort((a, b) => {
    for (let campo of campos) {
      let direccion = 1;
      if (campo.startsWith('-')) {
        direccion = -1;
        campo = campo.substring(1);
      }
      
      const valorA = a[campo];
      const valorB = b[campo];
      
      if (valorA < valorB) return -1 * direccion;
      if (valorA > valorB) return 1 * direccion;
    }
    return 0;
  });
};

// Función para agrupar array por campo
const agruparPor = (array, campo) => {
  return array.reduce((grupos, item) => {
    const clave = item[campo];
    if (!grupos[clave]) {
      grupos[clave] = [];
    }
    grupos[clave].push(item);
    return grupos;
  }, {});
};

// Función para obtener valores únicos de array
const obtenerValoresUnicos = (array, campo = null) => {
  if (campo) {
    return [...new Set(array.map(item => item[campo]))];
  }
  return [...new Set(array)];
};

// Función para convertir objeto a query string
const objetoAQueryString = (obj) => {
  return Object.keys(obj)
    .filter(key => obj[key] !== undefined && obj[key] !== null && obj[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
};

// Función para parsear query string a objeto
const queryStringAObjeto = (queryString) => {
  const params = new URLSearchParams(queryString);
  const obj = {};
  for (let [key, value] of params) {
    obj[key] = value;
  }
  return obj;
};

module.exports = {
  crearRespuesta,
  crearRespuestaError,
  successResponse,
  errorResponse,
  paginateData: crearPaginacion,
  crearPaginacion,
  generarSlug,
  formatearPrecio,
  calcularPorcentajeDescuento,
  validarEmail,
  validarTelefonoColombia,
  generarNumeroOrden,
  calcularTiempoLectura,
  truncarTexto,
  capitalizarPrimeraLetra,
  capitalizarPalabras,
  limpiarTexto,
  generarColorAleatorio,
  validarFormatoArchivo,
  obtenerExtensionArchivo,
  formatearTamañoArchivo,  
  generarHashSimple,
  debounce,
  throttle,
  ordenarPor,
  agruparPor,
  obtenerValoresUnicos,
  objetoAQueryString,
  queryStringAObjeto
};

// Rutas /uploads/ y URLs absolutas se devuelven tal cual; el cliente concatena el origen de la API.
const transformarUrlImagen = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url;
};

// Transformar producto con URLs de imágenes
const transformarProducto = (producto) => {
  if (!producto) return null;
  
  try {
    // Crear una copia para no mutar el original
    const productoTransformado = { ...producto };
    
    // Transformar imagenPrincipal
    if (productoTransformado.imagenPrincipal) {
      productoTransformado.imagenPrincipal = transformarUrlImagen(productoTransformado.imagenPrincipal);
    }
    
    // Transformar imagenes array
    if (productoTransformado.imagenes && Array.isArray(productoTransformado.imagenes)) {
      productoTransformado.imagenes = productoTransformado.imagenes.map(img => {
        if (!img) return null;
        return {
          ...img,
          url: transformarUrlImagen(img.url)
        };
      }).filter(Boolean);
    }

    if (productoTransformado.media && Array.isArray(productoTransformado.media)) {
      productoTransformado.media = productoTransformado.media.map((m) => ({
        ...m,
        url: transformarUrlImagen(m.url),
        thumbnail: m.thumbnail ? transformarUrlImagen(m.thumbnail) : undefined,
      }));
    }
    
    return productoTransformado;
  } catch (error) {
    console.error('Error transformando producto:', error);
    return producto; // Devolver el producto original si hay error
  }
};

// Transformar array de productos
const transformarProductos = (productos) => {
  if (!Array.isArray(productos)) return [];
  return productos.map(transformarProducto).filter(Boolean);
};

// Transformar usuario con URLs de imágenes
const transformarUsuario = (usuario) => {
  if (!usuario) return null;
  
  if (usuario.avatar) {
    usuario.avatar = transformarUrlImagen(usuario.avatar);
  }
  
  if (usuario.banner) {
    usuario.banner = transformarUrlImagen(usuario.banner);
  }
  
  return usuario;
};

// Validar ObjectId de MongoDB
const validarObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  crearRespuesta,
  crearRespuestaError,
  successResponse,
  errorResponse,
  paginateData: crearPaginacion,
  crearPaginacion,
  generarSlug,
  formatearPrecio,
  calcularPorcentajeDescuento,
  validarEmail,
  validarTelefonoColombia,
  generarNumeroOrden,
  calcularTiempoLectura,
  truncarTexto,
  capitalizarPrimeraLetra,
  capitalizarPalabras,
  limpiarTexto,
  generarColorAleatorio,
  validarFormatoArchivo,
  obtenerExtensionArchivo,
  formatearTamañoArchivo,  
  generarHashSimple,
  debounce,
  throttle,
  ordenarPor,
  agruparPor,
  obtenerValoresUnicos,
  objetoAQueryString,
  queryStringAObjeto,
  transformarUrlImagen,
  transformarProducto,
  transformarProductos,
  transformarUsuario,
  validarObjectId
};