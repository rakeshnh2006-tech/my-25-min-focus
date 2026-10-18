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
          DEFAULT: '#070B16', // Deep Midnight Sanctuary (best for optical stamina)
          secondary: '#0F172A',
          tertiary: '#151F36',
          card: '#10192E',
          glass: 'rgba(15, 23, 42, 0.72)',
          inset: '#070C18',
        },
        study: {
          canvas: '#070B16',
          panel: 'rgba(16, 25, 46, 0.72)',
          'panel-solid': '#10192E',
          card: 'rgba(19, 31, 56, 0.65)',
          inset: 'rgba(7, 12, 24, 0.85)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-highlight': 'rgba(255, 255, 255, 0.16)',
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
          950: '#070B16',
        },
        primary: {
          DEFAULT: '#4E75FF', // Electric cognitive indigo
          hover: '#3D64EC',
          light: '#7092FF',
          dark: '#3455CA',
        },
        focus: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#7092FF',
          500: '#4E75FF', // Electric Indigo for alert cognitive processing
          600: '#3D64EC',
          700: '#2F4EC6',
          800: '#1E3596',
          900: '#152468',
        },
        break: {
          short: '#10B981', // Calm Sage Emerald (relaxes optic nerve)
          'short-subtle': '#064E3B',
          long: '#8B5CF6', // Amethyst Violet (reflective cognitive consolidation)
          'long-subtle': '#3B0764',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 8px 30px -4px rgba(0, 0, 0, 0.5)',
        'glow-primary': '0 0 30px -4px rgba(78, 117, 255, 0.35)',
        'glow-break': '0 0 30px -4px rgba(16, 185, 129, 0.35)',
        'glow-long': '0 0 30px -4px rgba(139, 92, 246, 0.35)',
        'glow-amber': '0 0 30px -4px rgba(245, 158, 11, 0.35)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'clay-card': '0 20px 40px -15px rgba(0,0,0,0.7), inset 0 1px 1px 0 rgba(255,255,255,0.12), inset 0 -2px 6px 0 rgba(0,0,0,0.4)',
        'clay-button': '0 8px 18px -4px rgba(0,0,0,0.5), inset 0 1.5px 1px 0 rgba(255,255,255,0.25), inset 0 -2.5px 4px 0 rgba(0,0,0,0.35)',
        'clay-inset': 'inset 0 3px 8px 0 rgba(0,0,0,0.6), inset 0 -1px 2px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
