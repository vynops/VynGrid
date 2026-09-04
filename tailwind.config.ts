import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  safelist: [
    // Product accent colors — must be safelisted since they come from data
    { pattern: /text-(cyan|green|violet|orange|emerald|blue|yellow|rose)-400/ },
    { pattern: /border-(cyan|green|violet|orange|emerald|blue|yellow|rose)-500\/30/ },
    { pattern: /bg-(cyan|green|violet|orange|emerald|blue|yellow|rose)-500\/5/ },
    { pattern: /bg-(cyan|green|violet|orange|emerald|blue|yellow|rose)-500\/10/ },
    { pattern: /bg-(cyan|green|violet|orange|emerald|blue|yellow|rose)-500\/20/ },
    // glow shadows are inlined as full strings in products.ts so no regex needed
    { pattern: /ring-(cyan|green|violet|orange|emerald|blue|yellow|rose)-500\/40/ },
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        surface: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'glow-brand':    '0 0 40px -8px rgba(6,182,212,0.5)',
        'glow-brand-sm': '0 0 20px -4px rgba(6,182,212,0.3)',
        'glow-danger':   '0 0 20px -5px rgba(239,68,68,0.4)',
        'glow-success':  '0 0 20px -5px rgba(34,197,94,0.4)',
        'card':          '0 1px 3px 0 rgba(0,0,0,0.5), 0 1px 2px -1px rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':      'float 6s ease-in-out infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'spin-slow':  'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
