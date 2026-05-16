/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Dynamic color classes used in Settings and Insights pages
    { pattern: /bg-(emerald|amber|indigo|purple|red|green)-(500|400|300)\/(10|20|30)/ },
    { pattern: /text-(emerald|amber|indigo|purple|red|green)-(400|300)/ },
    { pattern: /border-(emerald|amber|indigo|purple|red|green)-(500|400)\/(20|30)/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        slate: {
          950: '#0a0f1e',
        }
      },
      animation: {
        'pulse-slow': 'pulse-slow 2.4s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
