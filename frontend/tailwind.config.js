/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta AXIOMA
        palette: {
          dark: '#352151',      // Violeta oscuro principal
          purple: '#8E6AAA',    // Violeta medio
          light: '#9B7BC7',     // Violeta claro
          accent: '#F5E6D3',    // Beige/arena
          yellow: '#FCE5B7',    // Amarillo/crema
          cream: '#FCE5B7',     // Crema (alias de yellow)
          pink: '#F1ABB5',      // Rosa
        },
        // Colores semánticos
        primary: '#ffffff',
        secondary: {
          DEFAULT: '#6B4E9B',
          hover: '#5A3D8A',
        },
        accent: {
          DEFAULT: '#F5E6D3',
          light: '#FAF3EB',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
        },
        success: {
          DEFAULT: '#22C55E',
          hover: '#16A34A',
        },
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
        },
        // Textos
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          light: '#94a3b8',
          white: '#FFFFFF',
        },
        // Bordes y fondos
        border: '#E5E7EB',
        background: {
          DEFAULT: '#FAFAFA',
          dark: '#F3F4F6',
        },
        // Sidebar
        sidebar: {
          DEFAULT: '#352151',
          hover: '#4a2d6b',
          active: '#8E6AAA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
