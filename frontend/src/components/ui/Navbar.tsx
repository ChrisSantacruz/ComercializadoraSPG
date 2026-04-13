import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';

const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      logout();
      navigate('/');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/productos?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      // Enfocar el input cuando se abre
      setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  };

  return (
    <>
      {/* Barra superior verde oscuro - Oculta en mobile */}
      <div className="hidden md:block bg-[#1c3a35] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-xs lg:text-sm">
            {/* Lado izquierdo */}
            <div className="flex items-center space-x-3 lg:space-x-6">
              <div className="flex items-center space-x-1.5 lg:space-x-2">
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#f2902f]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2h.5a1.5 1.5 0 010 3h-1.5v7a1 1 0 01-1 1H5a1 1 0 01-1-1V9H2.5a1.5 1.5 0 010-3H3V4z" />
                </svg>
                <span className="text-[#f2902f] font-medium">⚡ Envío eficaz</span>
              </div>
              
              <div className="flex items-center space-x-1.5 lg:space-x-2">
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#0d8e76]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="text-[#0d8e76] font-medium">🔄 Devolución inmediata</span>
              </div>
            </div>

            {/* Lado derecho */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="flex items-center space-x-1.5 lg:space-x-2">
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span className="text-gray-300">Soporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>

  {/* Barra principal verde turquesa */}
  <header className="bg-[#0d8e76] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-18 lg:h-20">
            
            {/* Lado izquierdo - Logo y navegación */}
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8">
              {/* Logo AndinoExpress */}
              <Link to="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <img 
                  src="/images/Logo.png" 
                  alt="AndinoExpress Logo" 
                  className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-lg shadow-lg object-contain"
                />
                <div className="hidden sm:flex flex-col justify-center">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white leading-none">AndinoExpress</h1>
                  <p className="text-[#f2902f] text-[10px] sm:text-xs md:text-sm leading-tight mt-0.5">Tu plataforma rápida y confiable</p>
                </div>
              </Link>

              {/* Enlaces de navegación */}
              <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
                <Link 
                  to="/" 
                  className="text-white hover:text-orange-200 font-medium transition duration-300 flex items-center space-x-1.5 text-sm xl:text-base"
                >
                  <svg className="w-4 h-4 xl:w-5 xl:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span>Inicio</span>
                </Link>
                
                <Link 
                  to="/productos" 
                  className="text-white hover:text-orange-200 font-medium transition duration-300 flex items-center space-x-1.5 text-sm xl:text-base"
                >
                  <svg className="w-4 h-4 xl:w-5 xl:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Productos</span>
                </Link>

                {/* Dropdown de Categorías */}
                <div className="relative">
                  <button 
                    onClick={() => setShowCategories(!showCategories)}
                    className="text-white hover:text-orange-200 font-medium transition duration-300 flex items-center space-x-1.5 text-sm xl:text-base"
                  >
                    <svg className="w-4 h-4 xl:w-5 xl:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Categorías</span>
                    <svg className={`w-3 h-3 xl:w-4 xl:h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {showCategories && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                      <div className="py-2">
                        <Link to="/productos?categoria=electronica" className="block px-4 py-2 text-gray-800 hover:bg-red-50 hover:text-red-600 transition duration-200">
                          🖥️ Electrónica
                        </Link>
                        <Link to="/productos?categoria=ropa" className="block px-4 py-2 text-gray-800 hover:bg-red-50 hover:text-red-600 transition duration-200">
                          👕 Ropa y Accesorios
                        </Link>
                        <Link to="/productos?categoria=hogar" className="block px-4 py-2 text-gray-800 hover:bg-red-50 hover:text-red-600 transition duration-200">
                          🏠 Hogar y Jardín
                        </Link>
                        <Link to="/productos?categoria=deportes" className="block px-4 py-2 text-gray-800 hover:bg-red-50 hover:text-red-600 transition duration-200">
                          ⚽ Deportes
                        </Link>
                        <Link to="/productos?categoria=belleza" className="block px-4 py-2 text-gray-800 hover:bg-red-50 hover:text-red-600 transition duration-200">
                          💄 Belleza y Salud
                        </Link>
                        <Link to="/productos?categoria=juguetes" className="block px-4 py-2 text-gray-800 hover:bg-red-50 hover:text-red-600 transition duration-200">
                          🧸 Juguetes y Juegos
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <Link 
                  to="/sobre-nosotros" 
                  className="text-white hover:text-orange-200 font-medium transition duration-300 flex items-center space-x-1.5 text-sm xl:text-base"
                >
                  <svg className="w-4 h-4 xl:w-5 xl:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Sobre Nosotros</span>
                </Link>
              </nav>
            </div>

            {/* Centro - Botón de búsqueda */}
            <div className="hidden sm:flex flex-1 justify-center max-w-xs">
              <button
                onClick={toggleSearch}
                className="bg-white/10 hover:bg-white/20 text-white p-2 sm:p-2.5 md:p-3 rounded-full transition-all duration-200 border border-white/20 hover:border-white/40 hover:scale-105"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>

            {/* Lado derecho - Acciones del usuario */}
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-6">
              {isAuthenticated ? (
                <>
                  {/* Pedidos y cuenta */}
                  <Link 
                    to="/profile" 
                    className="text-white hover:text-orange-200 transition duration-300 flex items-center space-x-1.5 hover:scale-105"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden lg:block text-xs xl:text-sm font-medium">Mi Cuenta</span>
                  </Link>

                  {/* Carrito */}
                  <Link 
                    to="/carrito" 
                    className="text-white hover:text-orange-200 transition-all duration-300 relative hover:scale-105"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                    </svg>
                    {/* Indicador de cantidad del carrito */}
                    <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-orange-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold shadow-lg">
                      {getItemCount()}
                    </span>
                  </Link>

                  {/* Cerrar sesión */}
                  <button 
                    onClick={handleLogout}
                    className="text-white hover:text-orange-200 transition-all duration-300 flex items-center space-x-1.5 hover:scale-105"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden lg:block text-xs xl:text-sm font-medium">Salir</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Iniciar sesión */}
                  <Link 
                    to="/login" 
                    className="text-white hover:text-orange-200 transition-all duration-300 flex items-center space-x-1.5 hover:scale-105"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden lg:block text-xs xl:text-sm font-medium">Iniciar Sesión</span>
                  </Link>

                  {/* Registrarse */}
                  <Link 
                    to="/register" 
                    className="bg-orange-500 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 rounded-full font-medium hover:bg-orange-600 transition-all duration-300 text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Registrarse
                  </Link>
                </>
              )}

              {/* Botón de menú móvil */}
              <div className="lg:hidden">
                <button 
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="text-white hover:text-[#f2902f] p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                >
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showMobileMenu ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Menú móvil desplegable */}
      {showMobileMenu && (
        <div className="lg:hidden bg-[#1c3a35] shadow-xl border-t border-[#0d8e76]/30">
          <div className="px-4 py-6 space-y-4">
            {/* Enlaces principales */}
            <div className="space-y-3">
              <Link 
                to="/" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 text-white hover:text-[#f2902f] transition duration-300 py-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="font-medium">Inicio</span>
              </Link>
              
              <Link 
                to="/productos" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 text-white hover:text-[#f2902f] transition duration-300 py-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Productos</span>
              </Link>

              <Link 
                to="/sobre-nosotros" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-3 text-white hover:text-[#f2902f] transition duration-300 py-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Sobre Nosotros</span>
              </Link>
            </div>

            {/* Categorías móviles */}
            <div className="border-t border-[#0d8e76]/30 pt-4">
              <h3 className="text-[#f2902f] font-semibold mb-3 text-sm uppercase tracking-wide">Categorías</h3>
              <div className="space-y-2">
                <Link to="/productos?categoria=electronica" onClick={() => setShowMobileMenu(false)} className="block text-gray-300 hover:text-[#f2902f] transition duration-200 py-1">
                  🖥️ Electrónica
                </Link>
                <Link to="/productos?categoria=ropa" onClick={() => setShowMobileMenu(false)} className="block text-gray-300 hover:text-[#f2902f] transition duration-200 py-1">
                  👕 Ropa y Accesorios
                </Link>
                <Link to="/productos?categoria=hogar" onClick={() => setShowMobileMenu(false)} className="block text-gray-300 hover:text-[#f2902f] transition duration-200 py-1">
                  🏠 Hogar y Jardín
                </Link>
                <Link to="/productos?categoria=deportes" onClick={() => setShowMobileMenu(false)} className="block text-gray-300 hover:text-[#f2902f] transition duration-200 py-1">
                  ⚽ Deportes
                </Link>
                <Link to="/productos?categoria=belleza" onClick={() => setShowMobileMenu(false)} className="block text-gray-300 hover:text-[#f2902f] transition duration-200 py-1">
                  💄 Belleza y Cuidado
                </Link>
              </div>
            </div>

            {/* Sección de usuario móvil */}
            <div className="border-t border-[#0d8e76]/30 pt-4 space-y-3">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/perfil" 
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center space-x-3 text-white hover:text-[#f2902f] transition duration-300 py-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Mi Cuenta</span>
                  </Link>

                  <Link 
                    to="/carrito" 
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center space-x-3 text-white hover:text-[#f2902f] transition duration-300 py-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                    </svg>
                    <span className="font-medium">Carrito ({getItemCount()})</span>
                  </Link>

                  <button 
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center space-x-3 text-white hover:text-[#f2902f] transition duration-300 py-2 w-full text-left"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Cerrar Sesión</span>
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center space-x-3 text-white hover:text-[#f2902f] transition duration-300 py-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Iniciar Sesión</span>
                  </Link>

                  <Link 
                    to="/register" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block w-full bg-[#f2902f] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#e07d1f] transition-all duration-300 text-center"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de búsqueda desplegable */}
      {showSearch && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-xl animate-slide-down">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
            <form onSubmit={handleSearch} className="relative max-w-4xl mx-auto">
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  placeholder="¿Qué estás buscando? Encuentra productos increíbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 sm:px-6 sm:py-4 pl-10 sm:pl-14 pr-16 sm:pr-20 rounded-xl sm:rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-300 focus:ring-offset-2 focus:ring-offset-primary-600 text-sm sm:text-base lg:text-lg shadow-soft border-0"
                />
                <div className="absolute left-2.5 sm:left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="submit"
                  className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-primary-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2 rounded-lg sm:rounded-xl hover:bg-primary-600 transition duration-200 font-medium shadow-medium text-xs sm:text-sm md:text-base"
                >
                  Buscar
                </button>
              </div>
              
              {/* Sugerencias de búsqueda */}
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                <span className="text-white/80 text-xs sm:text-sm font-medium">Búsquedas populares:</span>
                {['Electrónica', 'Ropa', 'Hogar', 'Deportes', 'Belleza'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      navigate(`/productos?search=${encodeURIComponent(suggestion)}`);
                      setShowSearch(false);
                    }}
                    className="text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
