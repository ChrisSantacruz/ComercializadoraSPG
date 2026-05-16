import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { normalizeUser } from '../../auth/normalizeUser';
import { UserIcon } from '@heroicons/react/24/solid';

const SelectRolePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { usuario?: any; pendingToken?: string } | undefined;
  const usuario = state?.usuario;
  const pendingToken = state?.pendingToken;
  const setSession = useAuthStore((s) => s.setSession);
  const [selectedRol, setSelectedRol] = useState<'cliente' | 'comerciante' | null>(null);

  if (!usuario || !pendingToken) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleContinue = () => {
    if (!selectedRol) return;

    if (selectedRol === 'comerciante') {
      navigate('/complete-merchant-profile', {
        state: { usuario, rol: selectedRol, pendingToken }
      });
    } else {
      void submitRol('cliente');
    }
  };

  const submitRol = async (rol: string) => {
    try {
      const data = await authService.selectRole(
        {
          userId: usuario._id,
          rol
        },
        pendingToken
      );

      if (rol === 'cliente' && data.token && data.usuario) {
        setSession({
          user: normalizeUser(data.usuario),
          token: data.token,
          refreshToken: data.refreshToken ?? null
        });
        navigate('/', { replace: true });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al seleccionar rol';
      alert(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d8e76]/10 via-white to-[#1c3a35]/5 flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0d8e76] text-white rounded-full mb-4 overflow-hidden">
            {usuario.avatar && String(usuario.avatar).trim() ? (
              <img
                src={String(usuario.avatar).trim()}
                alt={usuario.nombre}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-8 w-8" aria-hidden />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenido, {usuario.nombre}!</h1>
          <p className="text-gray-600">Para continuar, selecciona cómo deseas usar la plataforma</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            type="button"
            onClick={() => setSelectedRol('cliente')}
            className={`relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${
              selectedRol === 'cliente'
                ? 'border-[#0d8e76] bg-[#0d8e76]/5 shadow-lg scale-105'
                : 'border-gray-200 bg-white hover:border-[#0d8e76] hover:shadow-md'
            }`}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Soy Cliente</h3>
            <p className="text-gray-600 mb-4">Quiero comprar productos de comerciantes locales</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRol('comerciante')}
            className={`relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${
              selectedRol === 'comerciante'
                ? 'border-green-600 bg-green-50 shadow-lg scale-105'
                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
            }`}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Soy Comerciante</h3>
            <p className="text-gray-600 mb-4">Quiero vender mis productos en la plataforma</p>
          </button>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedRol}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0d8e76] to-[#1c3a35] text-white py-4 px-6 rounded-xl font-semibold hover:from-[#0b7a64] hover:to-[#17312d] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

export default SelectRolePage;
