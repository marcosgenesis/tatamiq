/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: "#b15300",
        "brand-strong": "#8c3f00",
        "brand-soft": "#fff0df",
        canvas: "#fbf8f3",
        ink: "#241f1a",
        "muted-ink": "#6e6258",
      },
    },
  },
  plugins: [],
};
