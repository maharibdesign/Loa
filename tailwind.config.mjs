/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- Core Telegram Theme ---
        'tg-bg': 'var(--tg-theme-bg-color)',
        'tg-text': 'var(--tg-theme-text-color)',
        'tg-hint': 'var(--tg-theme-hint-color)',
        'tg-link': 'var(--tg-theme-link-color)',
        'tg-button': 'var(--tg-theme-button-color)',
        'tg-button-text': 'var(--tg-theme-button-text-color)',
        'tg-secondary-bg': 'var(--tg-theme-secondary-bg-color)',

        // --- MODERNISTIC PALETTE ---
        modern: {
          primary: {
            start: '#6366F1', // Indigo 500
            end: '#A855F7',   // Purple 500
          },
          accent: {
            success: '#22D3EE', // Cyan 400
            danger: '#F43F5E',   // Rose 500
            warning: '#F59E0B',  // Amber 500
          },
          'plate': 'rgba(255, 255, 255, 0.05)',
        }
      },
    },
  },
  plugins: [],
}