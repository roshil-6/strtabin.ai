/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0b0b', // Deep Black
        primary: '#DA7756',    // Claude-like Terracotta Orange
        secondary: '#9aa0a6',  // Soft Gray
        accent: '#00cc6a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
