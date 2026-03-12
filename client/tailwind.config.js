/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        'surface-hover': 'var(--surface-hover)',
        'surface-active': 'var(--surface-active)',
        primary: {
          50:  'var(--color-primary-50, #eef2ff)',
          100: 'var(--color-primary-100, #e0e7ff)',
          200: 'var(--color-primary-200, #c7d2fe)',
          300: 'var(--color-primary-300, #a5b4fc)',
          400: 'var(--color-primary-400, #818cf8)',
          500: 'var(--color-primary-500, #6366f1)',
          600: 'var(--color-primary-600, #4f46e5)',
          700: 'var(--color-primary-700, #4338ca)',
          800: 'var(--color-primary-800, #3730a3)',
          900: 'var(--color-primary-900, #312e81)',
          DEFAULT: 'var(--color-primary-500, #6366f1)',
        },
        accent: 'var(--accent)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        text: 'rgb(var(--text-rgb) / <alpha-value>)',
        'text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      }
    },
  },
  plugins: [],
}
