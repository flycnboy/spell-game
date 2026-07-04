/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        celebrate: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(-10deg) scale(1.1)' },
          '50%': { transform: 'rotate(10deg) scale(1.2)' },
          '75%': { transform: 'rotate(-5deg) scale(1.05)' },
          '100%': { transform: 'rotate(0deg) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.4s ease-in-out',
        pop: 'pop 0.3s ease-in-out',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        bounce: 'bounce 1s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        celebrate: 'celebrate 0.6s ease-in-out',
        float: 'float 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
