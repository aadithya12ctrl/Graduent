/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F5F0',
        text: {
          primary: '#1A1814',
          secondary: '#4b5563',
          tertiary: '#9ca3af',
        },
        accent: {
          core: '#00f2fe',
          success: '#34d399',
          error: '#f43f5e',
          warning: '#fbbf24',
        }
      },
      fontFamily: {
        sans: ['"JetBrains Mono"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
