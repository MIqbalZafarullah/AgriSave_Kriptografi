/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        lime: { 400: '#bef264', 500: '#a3e635' },
        surface: {
          DEFAULT: '#05070a',
          card: '#0a0c10',
          elevated: '#0f1117',
          border: 'rgba(255,255,255,0.06)',
        },
      },
      keyframes: {
        'float': { '0%,100%': { transform: 'translateY(0) rotate(0deg)', opacity: '0.1' }, '50%': { transform: 'translateY(-30px) rotate(5deg)', opacity: '0.3' } },
        'pulse-red': { '0%,100%': { borderColor: 'rgba(239,68,68,0.4)', boxShadow: '0 0 10px rgba(239,68,68,0.1)' }, '50%': { borderColor: 'rgba(239,68,68,1)', boxShadow: '0 0 25px rgba(239,68,68,0.5)' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(20px) scale(0.97)' }, to: { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'glow-pulse': { '0%,100%': { boxShadow: '0 0 20px rgba(190,242,100,0.1)' }, '50%': { boxShadow: '0 0 40px rgba(190,242,100,0.3)' } },
      },
      animation: {
        'float': 'float 10s ease-in-out infinite',
        'pulse-red': 'pulse-red 1.5s infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
