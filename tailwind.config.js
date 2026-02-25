/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        carbot: {
          red: '#dc2626',
          'red-light': '#ef4444',
          'red-dark': '#b91c1c',
          'red-glow': 'rgba(220,38,38,0.3)',
        },
        surface: {
          DEFAULT: '#12121a',
          deep: '#0a0a0f',
          raised: '#1a1a2e',
          hover: '#1e1e30',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          border: 'rgba(255,255,255,0.08)',
          'border-hover': 'rgba(255,255,255,0.14)',
          light: 'rgba(255,255,255,0.06)',
          medium: 'rgba(255,255,255,0.10)',
        },
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(220,38,38,0.25), 0 0 60px rgba(220,38,38,0.1)',
        'glow-red-sm': '0 0 10px rgba(220,38,38,0.2)',
        'glass': '0 8px 32px rgba(0,0,0,0.3)',
        'glass-lg': '0 16px 48px rgba(0,0,0,0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(220,38,38,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(220,38,38,0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
