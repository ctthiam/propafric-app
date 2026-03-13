/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        green: {
          deep:  '#1a3d2e',
          main:  '#2D6A4F',
          mid:   '#3d8b6a',
          light: '#52b788',
        },
        gold: {
          main:  '#C9A84C',
          light: '#e8c96e',
          pale:  '#f5e8c0',
        },
        cream: {
          DEFAULT: '#faf8f3',
          dark:    '#f0ebe0',
        },
        ink: {
          DEFAULT: '#0d1f17',
          mid:     '#2a3d32',
          light:   '#4a6357',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}