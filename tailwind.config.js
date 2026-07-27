/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Medical workstation palette
        ws: {
          void:    '#04060a',
          deepest: '#070b14',
          dark:    '#0d1220',
          panel:   '#111827',
          surface: '#161f2e',
          raised:  '#1c2a3e',
          hover:   '#22334e',
          select:  '#0f2d50',
          active:  '#0a2040',
        },
        accent: {
          blue:   '#0ea5e9',
          cyan:   '#22d3ee',
          teal:   '#14b8a6',
          green:  '#22c55e',
          amber:  '#f59e0b',
          red:    '#ef4444',
          purple: '#a855f7',
        },
        fov:    '#ffe040',
        xhair:  '#00d4ff',
        sweep:  '#22c55e',
      },
      fontFamily: {
        ui:   ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', '"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', '0.875rem'],
        'xs':  ['0.7rem',   '1rem'],
        'sm':  ['0.8rem',   '1.2rem'],
      },
      borderWidth: { '0.5': '0.5px' },
      animation: {
        'pulse-dot': 'pulseDot 1s ease-in-out infinite',
        'sweep':     'sweepDown 1.8s linear infinite',
        'row-pulse': 'rowPulse 1.5s ease-in-out infinite',
        'fade-in':   'fadeIn 0.2s ease',
        'slide-in':  'slideIn 0.25s ease',
      },
      keyframes: {
        pulseDot: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.3' },
        },
        sweepDown: {
          from: { top: '0' },
          to:   { top: '100%' },
        },
        rowPulse: {
          '0%,100%': { backgroundColor: 'rgba(14,165,233,0.07)' },
          '50%':     { backgroundColor: 'rgba(14,165,233,0.18)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
