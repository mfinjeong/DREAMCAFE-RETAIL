import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark charcoal foundation
        background: "oklch(0.12 0.015 260)", // #0F1115
        surface: {
          DEFAULT: "oklch(0.16 0.015 260)", // #15181F
          muted: "oklch(0.135 0.015 260)",  // #111419
          hover: "oklch(0.19 0.018 260)",  // #1B1F27
          border: "oklch(0.24 0.015 260)", // #242933
          "border-subtle": "oklch(0.19 0.012 260)",
        },
        // Persona 5 inspired Red
        persona: {
          red: "oklch(0.55 0.20 25)",       // #D82239
          "red-hover": "oklch(0.48 0.20 25)",
          "red-active": "oklch(0.42 0.19 25)",
          "red-subtle": "oklch(0.20 0.06 25)", // Solid dark red background
          "red-border": "oklch(0.32 0.10 25)",
        },
        // Persona 3 Reload inspired Blue
        p3r: {
          blue: "oklch(0.55 0.16 250)",      // #2563EB solid cobalt ink
          "blue-hover": "oklch(0.48 0.16 250)",
          "blue-subtle": "oklch(0.20 0.05 250)", // Solid dark blue background
          "blue-border": "oklch(0.32 0.08 250)",
        },
        // Maintenance Amber
        pamber: {
          DEFAULT: "oklch(0.68 0.14 75)",   // #C98822
          subtle: "oklch(0.22 0.04 75)",
          border: "oklch(0.35 0.07 75)",
        },
        // Typography
        text: {
          primary: "#F2F3F5",
          secondary: "#8F96A3",
          muted: "#5B6270",
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
