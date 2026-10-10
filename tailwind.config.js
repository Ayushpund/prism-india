/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { void: '#F2EEE3', paper: '#F2EEE3', card: '#FFFDF7', cyan: '#1F4BFF', magenta: '#FF2E63', lime: '#12B76A', amber: '#FF9F1C', yellow: '#FFD60A', red: '#FF2E3B', ink: '#0B0B0B', mute: '#5B5B55' },
      fontFamily: { sans: ['var(--font-sans)', 'system-ui', 'sans-serif'], display: ['var(--font-display)', 'sans-serif'], mono: ['var(--font-mono)', 'monospace'] },
    },
  },
  plugins: [],
};
