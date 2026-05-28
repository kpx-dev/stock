/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          50: "#f5f7fa",
          100: "#e6ebf2",
          200: "#c3cdd9",
          300: "#9aa7b6",
          400: "#6b7785",
          500: "#475160",
          600: "#363e4b",
          700: "#262d39",
          800: "#181d27",
          900: "#0d1117",
          950: "#06080c",
        },
        accent: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};
