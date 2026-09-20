/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#070A0F',
          900: '#0B0F17',
          850: '#111726',
          800: '#161F33',
          700: '#1E2B45',
          600: '#2A3B5C',
          500: '#3B527E',
        },
        neon: {
          cyan: '#00F0FF',
          blue: '#38BDF8',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          purple: '#A855F7',
        }
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -5px rgba(0, 240, 255, 0.3)',
        'emerald-glow': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'rose-glow': '0 0 20px -5px rgba(244, 63, 94, 0.3)',
        'purple-glow': '0 0 20px -5px rgba(168, 85, 247, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 240, 255, 0.5)' },
        }
      }
    },
  },
  plugins: [],
}
