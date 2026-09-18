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
      boxShadow: {
        'clay-card': '12px 16px 32px rgba(7, 55, 52, 0.07), -6px -6px 20px rgba(255, 255, 255, 0.95), inset 3px 3px 6px rgba(255, 255, 255, 0.9), inset -4px -4px 10px rgba(7, 55, 52, 0.06)',
        'clay-card-hover': '18px 24px 44px rgba(7, 55, 52, 0.12), -8px -8px 24px rgba(255, 255, 255, 0.98), inset 4px 4px 8px rgba(255, 255, 255, 0.95), inset -5px -5px 12px rgba(7, 55, 52, 0.08)',
        'clay-btn-primary': '0 10px 22px -3px rgba(11, 107, 102, 0.38), 0 4px 6px -2px rgba(0, 0, 0, 0.06), inset 2px 2px 4px rgba(255, 255, 255, 0.45), inset -3px -3px 6px rgba(0, 0, 0, 0.25)',
        'clay-btn-primary-active': '0 4px 10px rgba(11, 107, 102, 0.3), inset 3px 3px 6px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.2)',
        'clay-btn-secondary': '6px 8px 18px rgba(7, 55, 52, 0.08), -4px -4px 12px rgba(255, 255, 255, 0.9), inset 2px 2px 4px rgba(255, 255, 255, 0.9), inset -2px -2px 5px rgba(7, 55, 52, 0.08)',
        'clay-pill': '4px 6px 14px rgba(7, 55, 52, 0.06), -2px -2px 8px rgba(255, 255, 255, 0.85), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.8), inset -2px -2px 4px rgba(7, 55, 52, 0.06)',
        'clay-input': 'inset 3px 3px 6px rgba(7, 55, 52, 0.08), inset -2px -2px 6px rgba(255, 255, 255, 0.9), 0 2px 6px rgba(0, 0, 0, 0.02)',
        'clay-modal': '24px 32px 60px rgba(7, 55, 52, 0.18), -12px -12px 30px rgba(255, 255, 255, 0.95), inset 4px 4px 8px rgba(255, 255, 255, 0.9), inset -4px -4px 12px rgba(7, 55, 52, 0.06)',
      },
      borderRadius: {
        'clay': '24px',
        'clay-lg': '32px',
        'clay-xl': '40px',
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
