import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0A0A0A",
        secondary: "#FFFFFF",
        accent: "#C19A6B",
        soft: "#F5F5F5",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        luxe: "0 8px 30px rgba(10,10,10,0.16)",
      },
    },
  },
  plugins: [],
} satisfies Config;

