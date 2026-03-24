/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a', // Greyish Black
        primary: '#DA7756',    // Claude-like Terracotta Orange
        secondary: '#9aa0a6',  // Soft Gray
        accent: '#00cc6a',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'surface': '0 1px 0 rgba(255,255,255,0.06) inset, 0 4px 24px rgba(0,0,0,0.12)',
        'surface-lg': '0 1px 0 rgba(255,255,255,0.08) inset, 0 12px 48px rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
}
