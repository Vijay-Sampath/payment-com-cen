import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-navy': '#f8fafc',
        'surface': '#ffffff',
        'surface-light': '#f1f5f9',
        'surface-lighter': '#e2e8f0',
        'teal': {
          DEFAULT: '#0d9488',
          dark: '#0f766e',
          light: '#14b8a6',
          glow: 'rgba(13, 148, 136, 0.10)',
        },
        'amber': {
          DEFAULT: '#d97706',
          dark: '#b45309',
          light: '#f59e0b',
          glow: 'rgba(217, 119, 6, 0.10)',
        },
        'coral': {
          DEFAULT: '#dc2626',
          dark: '#b91c1c',
          light: '#ef4444',
          glow: 'rgba(220, 38, 38, 0.10)',
        },
        'electric-blue': '#2563eb',
        'muted': '#64748b',
        'text-primary': '#0f172a',
        'text-secondary': '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'kpi': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
        'kpi-lg': ['2.5rem', { lineHeight: '1.1', fontWeight: '800' }],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'count-up': 'count-up 1s ease-out',
        'flow': 'flow 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 1px 4px rgba(13, 148, 136, 0.15)' },
          '50%': { boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'flow': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
