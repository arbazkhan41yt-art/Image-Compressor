/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'checkerboard': 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)',
      },
      backgroundSize: {
        'checkerboard': '20px 20px',
      }
    },
  },
  plugins: [],
}