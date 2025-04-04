/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4DA3FF',
          DEFAULT: '#0078FF',
          dark: '#0056B8',
        },
        secondary: {
          light: '#FFB74D',
          DEFAULT: '#FF9800',
          dark: '#C77700',
        },
        background: {
          light: '#F9FAFC',
          DEFAULT: '#F1F5F9',
          dark: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 