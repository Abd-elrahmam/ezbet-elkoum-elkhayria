/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "Tahoma", "sans-serif" , "Aref Ruqaa"],
        
      },
      colors: {
        primary: {
          50: "#eefcf4",
          100: "#d6f7e3",
          200: "#b0edcb",
          300: "#7bdcac",
          400: "#43c489",
          500: "#1fa871",
          600: "#14875c",
          700: "#136c4c",
          800: "#12563e",
          900: "#0f4734",
          950: "#07281d",
        },
        sand: {
          50: "#faf8f3",
          100: "#f3ede0",
          200: "#e7dabf",
          300: "#d7c096",
          400: "#c6a26c",
          500: "#b98a4f",
          600: "#a97442",
          700: "#8c5c38",
          800: "#724b33",
          900: "#5e3f2c",
        },
      },
    },
  },
  plugins: [],
};
