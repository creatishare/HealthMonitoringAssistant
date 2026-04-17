/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1890FF',
          dark: '#096DD9',
          light: '#E6F7FF',
        },
        success: '#52C41A',
        warning: '#FAAD14',
        danger: '#F5222D',
        medication: {
          DEFAULT: '#722ED1',
          light: '#F9F0FF',
        },
        gray: {
          bg: 'var(--color-bg)',
          card: 'var(--color-card)',
          text: {
            primary: 'var(--color-text-primary)',
            secondary: 'var(--color-text-secondary)',
            helper: 'var(--color-text-helper)',
          },
          border: 'var(--color-border)',
          disabled: 'var(--color-disabled)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      fontSize: {
        'title': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'page-title': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'card-title': ['18px', { lineHeight: '1.5', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'helper': ['14px', { lineHeight: '1.5' }],
        'small': ['12px', { lineHeight: '1.5' }],
        'metric': ['28px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.08)',
        'nav': '0 -2px 8px rgba(0,0,0,0.05)',
        'input-focus': '0 0 0 2px rgba(24,144,255,0.2)',
      },
      maxWidth: {
        'mobile': '480px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
