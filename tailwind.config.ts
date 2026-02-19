import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
      boxShadow: {
        premium: '0 10px 40px rgba(37,99,235,0.18)',
      },
    },
  },
  plugins: [],
}

export default config
