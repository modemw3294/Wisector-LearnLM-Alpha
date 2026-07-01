import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
          ring: "var(--accent-ring)",
        },
        notion: {
          bg: "#ffffff",
          sidebar: "#f9f8f7",
          border: "#f0efed",
          border2: "#e4e3e3",
          text: "#2c2c2b",
          text2: "#7d7a75",
          text3: "#5f5e59",
          text4: "#91918e",
          text5: "#a19e99",
          overlay: "rgba(0, 0, 0, 0.07)",
          overlay2: "rgba(0, 0, 0, 0.04)",
          shadow: "rgba(25, 25, 25, 0.03)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'SimHei', 'Arial', 'Helvetica', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.15px',
      },
    },
  },
  plugins: [],
};

export default config;
