/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // KlasWerk design tokens — driven by client branding config
      // CSS variables are set at runtime from config.js, then consumed here
      colors: {
        kw: {
          black:     'var(--kw-black)',
          dark:      'var(--kw-dark)',
          surface:   'var(--kw-surface)',
          panel:     'var(--kw-panel)',
          border:    'var(--kw-border)',
          'border-lt': 'var(--kw-border-lt)',
          primary:   'var(--kw-primary)',
          'primary-dk': 'var(--kw-primary-dk)',
          'primary-lt': 'var(--kw-primary-lt)',
          cream:     'var(--kw-cream)',
          muted:     'var(--kw-muted)',
          success:   'var(--kw-success)',
          danger:    'var(--kw-danger)',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        editorial: ['Cormorant Garamond', 'serif'],
        body: ['Raleway', 'sans-serif'],
        admin: ['Syne', 'sans-serif'],
        mono: ['Syne Mono', 'monospace'],
      },
      borderRadius: {
        kw: '4px',
        'kw-lg': '8px',
      },
    },
  },
  plugins: [],
}
