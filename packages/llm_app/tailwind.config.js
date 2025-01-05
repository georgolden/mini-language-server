/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kawaii: {
          pink: {
            light: '#fce7f3',
            DEFAULT: '#f9a8d4',
            dark: '#db2777',
          },
          purple: {
            light: '#f3e8ff',
            DEFAULT: '#d8b4fe',
            dark: '#9333ea',
          },
        },
      },
    },
  },
  plugins: [],
};
