/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Override gray with neutral (no blue tint)
        gray: colors.neutral,
      },
    },
  },
  plugins: [],
}
