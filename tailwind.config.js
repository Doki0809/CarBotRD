/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        // Theme-aware tokens — reference CSS variables.
        // These enable `bg-theme-*`, `text-theme-*` etc. with Tailwind's dark: prefix.
        theme: {
          bg:        'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-tertiary':  'var(--bg-tertiary)',
          glass:     'var(--bg-glass)',
          border:    'var(--border-glass)',
          text:      'var(--text-primary)',
          muted:     'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          accent:    'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
        },
        // Static CarBot brand palette (kept for explicit non-theme usage)
        carbot: {
          red:        '#E31C25',
          'red-light': '#FF2D36',
          'red-dark':  '#C9141C',
          'red-glow':  'rgba(227, 28, 37, 0.30)',
        },
        // Static surface tokens (dark-mode defaults — kept for legacy Tailwind class usage)
        surface: {
          DEFAULT: '#15181F',
          deep:    '#0D0F14',
          raised:  '#1C2028',
          hover:   '#222731',
        },
        // Static glass tokens (dark-mode defaults — kept for legacy Tailwind class usage)
        glass: {
          DEFAULT:       'rgba(30, 34, 42, 0.45)',
          border:        'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.14)',
          light:         'rgba(255, 255, 255, 0.06)',
          medium:        'rgba(255, 255, 255, 0.10)',
        },
      },
      backdropBlur: {
        xs:   '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      boxShadow: {
        'glow-red':    '0 0 20px rgba(227, 28, 37, 0.25), 0 0 60px rgba(227, 28, 37, 0.10)',
        'glow-red-sm': '0 0 10px rgba(227, 28, 37, 0.20)',
        'glass':       '0 8px 32px rgba(0, 0, 0, 0.30)',
        'glass-lg':    '0 16px 48px rgba(0, 0, 0, 0.40)',
        'glass-xl':    '0 24px 64px rgba(0, 0, 0, 0.50)',
        'inner-glow':  'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-out forwards',
        'slide-up':   'slideUp 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(227, 28, 37, 0.20)' },
          '50%':      { boxShadow: '0 0 25px rgba(227, 28, 37, 0.40)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
