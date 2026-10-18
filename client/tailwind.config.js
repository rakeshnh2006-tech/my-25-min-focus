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
        background: {
          DEFAULT: '#080D1A', // Deep navy
          secondary: '#111827', // Cards
          tertiary: '#1A2234',
          card: '#111827',
          glass: 'rgba(17, 24, 39, 0.85)',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#080D1A',
        },
        primary: {
          DEFAULT: '#4F7CFF', // Electric blue
          hover: '#3D6CF0',
          light: '#6B92FF',
          dark: '#3A63D9',
        },
        focus: {
          50: '#EEF3FF',
          100: '#D9E4FF',
          200: '#B8CEFF',
          300: '#8FB2FF',
          400: '#6B92FF',
          500: '#4F7CFF', // Electric Blue
          600: '#3D6CF0',
          700: '#2A55D6',
          800: '#1E41AB',
          900: '#152C75',
        },
        violet: {
          accent: '#7C3AED', // Subtle violet
          subtle: '#8B5CF6',
          dark: '#5B21B6',
        },
        break: {
          short: '#10B981', // Calm emerald / teal
          'short-subtle': '#064E3B',
          long: '#7C3AED', // Subtle violet
          'long-subtle': '#3B0764',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'glow-primary': '0 0 25px -5px rgba(79, 124, 255, 0.25)',
        'glow-break': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
        'glow-long': '0 0 25px -5px rgba(124, 58, 237, 0.25)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
