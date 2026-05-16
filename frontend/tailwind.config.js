/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        // Nueva paleta de colores para Comercializadora SPG
        'verde-oscuro': '#1c3a35',
        'naranja': '#f2902f',
        'verde-turquesa': '#0d8e76',
        
        primary: {
          50: '#f0f9f7',
          100: '#dcf2ec',
          200: '#b9e6da',
          300: '#87d4c1',
          400: '#54bda5',
          500: '#0d8e76', // Verde turquesa principal
          600: '#0b7a64',
          700: '#0a6453',
          800: '#095043',
          900: '#083f36',
        },
        secondary: {
          50: '#fef6ed',
          100: '#fdecd5',
          200: '#fad6aa',
          300: '#f7ba74',
          400: '#f2902f', // Naranja principal
          500: '#f27c29',
          600: '#e35a1f',
          700: '#bc451c',
          800: '#953a1e',
          900: '#78321c',
        },
        accent: {
          50: '#f4f8f7',
          100: '#e4efed',
          200: '#c9dfdb',
          300: '#9cc5bd',
          400: '#6aa49a',
          500: '#1c3a35', // Verde oscuro principal (verde-oscuro)
          600: '#17312d',
          700: '#142824',
          800: '#12201e',
          900: '#101b19',
          // Navbar / footer / overlays: mismo matiz que 900 pero más profundo (evitar bg “fantasma”).
          950: '#081210',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22C55E', // Verde éxito
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#EF4444', // Rojo error
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B', // Amarillo advertencia
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        gray: {
          50: '#F9FAFB', // Fondo general
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6B7280', // Texto secundario
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827', // Texto principal
        },
      },
      zIndex: {
        nav: '50',
        dropdown: '60',
        modal: '70',
        toast: '80',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.04)',
        'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 