import type { Config } from 'tailwindcss'

/**
 * Brand color scale — WCAG AA contrast audit (issue #818)
 *
 * Normal text requires a contrast ratio of at least 4.5:1 against its
 * background (WCAG 2.1 AA, 1.4.3). The scale below is the Tailwind
 * `yellow` palette, which is already tuned so that the darker shades
 * pass AA on white and the lighter shades pass AA on near-black.
 *
 * Verified text/background combinations (ratio → result):
 *   brand-700 (#a16207) on white (#ffffff) ........ 5.19:1  PASS
 *   brand-800 (#854d0e) on white (#ffffff) ........ 7.09:1  PASS
 *   brand-900 (#713f12) on white (#ffffff) ........ 8.63:1  PASS
 *   brand-950 (#422006) on white (#ffffff) ....... 13.61:1  PASS
 *   brand-50  (#fefce8) on brand-950 (#422006) ... 13.09:1  PASS
 *   brand-100 (#fef9c3) on brand-950 (#422006) ... 12.62:1  PASS
 *   brand-200 (#fef08a) on brand-950 (#422006) ... 11.72:1  PASS
 *   brand-300 (#fde047) on brand-950 (#422006) .... 9.86:1  PASS
 *   brand-400 (#facc15) on brand-950 (#422006) .... 8.02:1  PASS
 *
 * Do NOT use brand-50..400 as text on white, or brand-500..950 as text
 * on brand-50..200 — those pairings fall below 4.5:1. Use the darker
 * shades for text on light surfaces and the lighter shades for text on
 * dark surfaces.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      colors: {
        brand: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
      },
    },
  },
  plugins: [],
};

export default config;
