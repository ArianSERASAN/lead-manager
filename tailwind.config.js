/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand primary — SERASAN purple (used for all primary actions, nav active, buttons)
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // Brand accent — SERASAN teal
        accent: {
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
        },
        // Brand success — SERASAN green
        success: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Legacy aliases
        'serasan': {
          purple: '#7c3aed',
          teal: '#06b6d4',
          green: '#10b981',
        },
        'reactiva': {
          green: '#34d399',
          dark: '#059669',
        },
        // Sidebar dark theme colors
        sidebar: {
          DEFAULT: '#1e1b4b',
          light: '#312e81',
          accent: '#4338ca',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 300ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'fade-in-up': 'fadeInUp 350ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'fade-in-down': 'fadeInDown 300ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'slide-in-left': 'slideInLeft 300ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'scale-in': 'scaleIn 250ms cubic-bezier(0.23, 1, 0.32, 1) both',
        'shimmer': 'shimmer 1.5s infinite',
        'count-up': 'countUp 600ms cubic-bezier(0.23, 1, 0.32, 1) both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.15)',
        'glow-teal': '0 0 20px rgba(6, 182, 212, 0.15)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.15)',
        'sidebar': '4px 0 24px rgba(30, 27, 75, 0.12)',
      },
    },
  },
  plugins: [],
}
