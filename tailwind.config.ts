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
        background: "#080808",
        surface: {
          DEFAULT: "#101010",
          elevated: "#161616",
          border: "#202020",
          borderLight: "#2A2A2A",
        },
        champagne: {
          DEFAULT: "#D4C5A5",
          light: "#E5D9C0",
          dark: "#B8A782",
          subtle: "rgba(212, 197, 165, 0.15)",
        },
        text: {
          primary: "#F5F3EE",
          secondary: "#B5B3AE",
          muted: "#777570",
          faint: "#454440",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-grotesk)", "monospace"],
      },
      letterSpacing: {
        widest: "0.2em",
        ultra: "0.3em",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        subtlePulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        subtlePulse: "subtlePulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
