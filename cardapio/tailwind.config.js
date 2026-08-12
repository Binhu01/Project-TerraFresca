/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./script.js"],
  safelist: ["bg-green-600", "bg-red-500"],
  theme: {
    extend: {
      colors: {
        forest: "#1E3320",
        "forest-soft": "#2B4530",
        moss: "#4C6B45",
        "moss-light": "#6E8F62",
        sage: "#B9C6A9",
        nude: "#E9DCC7",
        "nude-light": "#F2E9D8",
        cream: "#FBF8F2",
        honey: "#B8863B",
        ink: "#24291F",
      },
      fontFamily: {
        serif: ["Newsreader", "serif"],
        sans: ["Manrope", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};
