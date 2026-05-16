import React, { useState, useEffect, useRef } from 'react';
import {
  Bars3BottomLeftIcon,
  BriefcaseIcon,
  CreditCardIcon,
  PaperAirplaneIcon,
  ShoppingBagIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { BRAND_NAME } from '../nav/navData';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const predefinedResponses = {
  greeting: [
    'Soy el asistente virtual de soporte en ' + BRAND_NAME + '. Indica cómo podemos ayudarte con tu pedido o cuenta.',
    '¡Hola! Estoy disponible para dudas de catálogo, envíos, pagos y tu cuenta.',
  ],
  products: [
    'Puedes explorar el inventario público desde “Productos”. Si buscas algo concreto, usa el buscador en la barra superior.',
    'Las referencias están curadas por comerciantes verificados. Si necesitas volumen B2B, podemos canalizar revisión desde la sección de contacto en Sobre nosotros.',
  ],
  shipping: [
    'Realizamos envíos a nivel nacional. Tiempo estimado habitual 1–5 días hábiles según origen / destino. El costo se confirma en checkout.',
    'El detalle exacto por ciudad aparece después de cargar dirección en el paso de entrega.',
  ],
  payments: [
    'Procesamos pagos con Wompi (tarjeta, PSE, Nequi según disponibilidad en el momento del pago). No almacenamos datos de tarjeta en nuestra infraestructura.',
    'Tras autorizar el pago, verificamos el estado en servidor para reflejarlo en tus pedidos.',
  ],
  account: [
    'Puedes registrarte desde “Registrarse” y recuperar contraseña con el flujo oficial de seguridad.',
    'Desde tu perfil revisas datos de contacto, direcciones y avisos de pedido.',
  ],
  returns: [
    'Ventanas de devolución y condiciones están en nuestros términos. Si tienes una incidencia con un pedido, indica número de orden desde Sobre nosotros → contacto.',
  ],
  merchants: [
    'Si vendes desde la app, registra cuenta como comerciante y valida tus datos públicos para que puedan aparecer como vendedores confiables en el PDP.',
    'Gestión de inventario, pedidos y análisis están en el espacio merchant.',
  ],
  technical: [
    'Prueba cerrar pestañas, actualizar sesión y verificar tu conexión. Si algo falló en checkout, revisa tus pedidos y el estado de pago antes de repetir cargos.',
  ],
  goodbye: ['Gracias por escribir. Si surge otra consulta estamos disponibles desde este mismo botón de ayuda.'],
  default: [
    'Para un caso puntual puede atenderte equipo humano. Usa los datos de contacto en Sobre nosotros.',
  ],
} as const;

const quickActions: { label: string; action: keyof typeof predefinedResponses }[] = [
  { label: 'Ver productos', action: 'products' },
  { label: 'Información envíos', action: 'shipping' },
  { label: 'Métodos de pago', action: 'payments' },
  { label: 'Vender en la plataforma', action: 'merchants' },
];

function pickResponse(category: keyof typeof predefinedResponses): string {
  const list = predefinedResponses[category];
  return list[Math.floor(Math.random() * list.length)] ?? predefinedResponses.default[0];
}

const SupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage(pickResponse('greeting'));
    }
    // Solo al abrir: si reiniciamos lista vacía debe volver a saludar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const categorizeMessage = (message: string): keyof typeof predefinedResponses => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('hola') || lowerMessage.includes('hi') || lowerMessage.includes('buenos')) {
      return 'greeting';
    }
    if (lowerMessage.includes('producto') || lowerMessage.includes('catalogo') || lowerMessage.includes('buscar')) {
      return 'products';
    }
    if (lowerMessage.includes('envio') || lowerMessage.includes('entrega') || lowerMessage.includes('shipping')) {
      return 'shipping';
    }
    if (lowerMessage.includes('pago') || lowerMessage.includes('tarjeta') || lowerMessage.includes('pse')) {
      return 'payments';
    }
    if (lowerMessage.includes('cuenta') || lowerMessage.includes('registro') || lowerMessage.includes('login')) {
      return 'account';
    }
    if (
      lowerMessage.includes('devol') ||
      lowerMessage.includes('reembolso') ||
      lowerMessage.includes('cambio')
    ) {
      return 'returns';
    }
    if (lowerMessage.includes('vender') || lowerMessage.includes('comerciante') || lowerMessage.includes('negocio')) {
      return 'merchants';
    }
    if (
      lowerMessage.includes('error') ||
      lowerMessage.includes('no carga') ||
      lowerMessage.includes('bug')
    ) {
      return 'technical';
    }
    if (lowerMessage.includes('gracias') || lowerMessage.includes('adios') || lowerMessage.includes('bye')) {
      return 'goodbye';
    }

    return 'default';
  };

  const addBotMessage = (text: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const addUserMessage = (text: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    addUserMessage(userMessage);
    setInputValue('');
    setIsTyping(true);

    window.setTimeout(() => {
      const category = categorizeMessage(userMessage);
      const response = pickResponse(category);
      addBotMessage(response);
      setIsTyping(false);
    }, 800 + Math.random() * 800);
  };

  const handleQuickAction = (action: keyof typeof predefinedResponses) => {
    addBotMessage(pickResponse(action));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-dropdown flex h-11 w-11 items-center justify-center rounded-full border shadow-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 sm:h-12 sm:w-12 ${
          isOpen
            ? 'border-gray-800 bg-gray-900 text-white hover:bg-gray-800'
            : 'border-gray-200 bg-gray-900 text-white hover:bg-gray-800'
        }`}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Cerrar ayuda en línea' : 'Abrir ayuda en línea'}
      >
        {isOpen ? <XMarkIcon className="h-5 w-5" aria-hidden /> : <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />}
      </button>

      {isOpen && (
        <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-dropdown flex max-h-[min(32rem,calc(100dvh-6rem))] w-[min(100vw-2rem,21rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-strong sm:right-[max(1.25rem,env(safe-area-inset-right,0px))] sm:w-[22rem]">
          <header className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-gray-900">Soporte {BRAND_NAME}</h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                En línea
              </p>
            </div>
            <Bars3BottomLeftIcon className="mt-1 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
          </header>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-lg border px-2.5 py-2 shadow-sm ${
                    message.isUser
                      ? 'border-primary-700/20 bg-primary-700 text-[13px] text-white leading-snug'
                      : 'border-gray-100 bg-white text-[13px] text-gray-800 leading-snug'
                  }`}
                >
                  <p>{message.text}</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      message.isUser ? 'text-white/65' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping ? (
              <div className="mb-4 flex justify-start">
                <div className="inline-flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400"
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400"
                    style={{ animationDelay: '240ms' }}
                  />
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Acciones rápidas
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((qa) => {
                  const Icon =
                    qa.action === 'products'
                      ? ShoppingBagIcon
                      : qa.action === 'shipping'
                        ? TruckIcon
                        : qa.action === 'payments'
                          ? CreditCardIcon
                          : BriefcaseIcon;

                  return (
                    <button
                      key={qa.action}
                      type="button"
                      onClick={() => handleQuickAction(qa.action)}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left text-[12px] font-medium leading-tight text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                      {qa.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex gap-2">
              <label htmlFor="support-chat-message" className="sr-only">
                Escribir mensaje de soporte
              </label>
              <input
                id="support-chat-message"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Tu consulta..."
                disabled={isTyping}
                className="min-h-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
              />
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-900 bg-gray-900 text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-400"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                aria-label="Enviar mensaje"
              >
                <PaperAirplaneIcon className="h-4 w-5" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400">Asistente automatizado • {BRAND_NAME}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChat;
