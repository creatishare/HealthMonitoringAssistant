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
          DEFAULT: '#3E63DD',
          dark: '#2F4FB8',
          light: '#E8EEFF',
          soft: '#F4F7FF',
        },
        success: '#2F9E6D',
        warning: '#D98E04',
        danger: '#D9485F',
        medication: {
          DEFAULT: '#6F5BD3',
          light: '#F1EEFF',
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
        'title': ['30px', { lineHeight: '1.2', fontWeight: '700' }],
        'page-title': ['22px', { lineHeight: '1.3', fontWeight: '650' }],
        'card-title': ['18px', { lineHeight: '1.45', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.65' }],
        'helper': ['14px', { lineHeight: '1.55' }],
        'small': ['12px', { lineHeight: '1.5' }],
        'metric': ['30px', { lineHeight: '1.15', fontWeight: '700' }],
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
        'card': '24px',
        'button': '16px',
        'input': '18px',
      },
      boxShadow: {
        'card': '0 18px 45px rgba(25, 36, 68, 0.08)',
        'nav': '0 18px 40px rgba(25, 36, 68, 0.12)',
        'input-focus': '0 0 0 4px rgba(62, 99, 221, 0.14)',
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
