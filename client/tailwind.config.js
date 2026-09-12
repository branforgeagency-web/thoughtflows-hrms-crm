/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        thoughtflows: {
          aqua: '#66e2e2',
          light: '#38d5cc',
          vibrant: '#18bab3',
          teal: '#12a39d',
          deep: '#0d7d79',
          ocean: '#095a58',
          navy: '#1b3240',
          glow: '#5eead4'
        }
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-medium': 'float 5s ease-in-out infinite',
        'float-fast': 'float 3.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'sway': 'sway 6s ease-in-out infinite',
        'draw-slow': 'draw 2.6s ease-out forwards',
        'twinkle': 'twinkle 3.2s ease-in-out infinite',
        'dash-flow': 'dashFlow 3s linear infinite',
        'nudge-x': 'nudgeX 1.8s ease-in-out infinite',
        'breathe': 'breathe 4.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-12px) translateX(6px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.08)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        draw: {
          'from': { strokeDashoffset: '600' },
          'to': { strokeDashoffset: '0' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        dashFlow: {
          'from': { strokeDashoffset: '0' },
          'to': { strokeDashoffset: '-40' },
        },
        nudgeX: {
          '0%, 100%': { transform: 'translateX(0px)' },
          '50%': { transform: 'translateX(4px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serifItalic: ['"Playfair Display"', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
