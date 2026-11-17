module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: { extend: { colors: { acento: "#0135D8", marino: "#01075D", intenso: "#0135D8", electrico: "#026CF8", cian: "#07F5EC", turquesa: "#03EAC1", esmeralda: "#05C899" } } },
  plugins: [require("@tailwindcss/forms")],
};
