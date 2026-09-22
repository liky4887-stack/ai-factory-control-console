/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceSunken: '#F4F5F7',
        border: '#E8EAED',
        borderStrong: '#D1D5DB',
        text: '#111318',
        textSecondary: '#525964',
        textTertiary: '#8B92A0',
        accent: '#0F62FE',
        accentSoft: '#E5EEFF',
        success: '#15A04B',
        warning: '#D9821F',
        danger: '#DA1E28',
        omega: '#7C1DAA',
        omegaSoft: '#F3E8FF',
        omegaArmed: '#B91C1C',
        code: '#1A1D21',
        codeText: '#D1D5DB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(17, 19, 24, 0.04), 0 1px 2px rgba(17, 19, 24, 0.03)',
        medium: '0 4px 12px rgba(17, 19, 24, 0.05), 0 1px 3px rgba(17, 19, 24, 0.04)',
        lifted: '0 8px 24px rgba(17, 19, 24, 0.08), 0 2px 8px rgba(17, 19, 24, 0.04)',
        focus: '0 0 0 3px rgba(15, 98, 254, 0.15)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { opacity: '0.5', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(2)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
};
