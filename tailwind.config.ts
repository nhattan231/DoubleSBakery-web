import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ed',
          100: '#fdedd5',
          200: '#fbd7aa',
          300: '#f8b974',
          400: '#f4923c',
          500: '#f17716',
          600: '#e25d0c',
          700: '#bb440c',
          800: '#953712',
          900: '#782f12',
        },
        bakery: {
          cream: '#FFF8F0',
          brown: '#8B6914',
          dark: '#4A3728',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Tắt preflight để tránh conflict với Ant Design
  },
};

export default config;
