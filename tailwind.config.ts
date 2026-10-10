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
        background: "#FAF8F2",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F5F1E8",
          hover: "#EFEADE",
          border: "#E5DED3",
          "border-subtle": "#EDE8DE",
          "border-active": "#C9C1B3",
          card: "#FFFFFF",
          dark: "#F0EBE1",
        },
        coffee: {
          DEFAULT: "#76513C",
          hover: "#5F4130",
          active: "#483225",
          subtle: "#F5ECE6",
          border: "#C7B3A6",
        },
        sage: {
          DEFAULT: "#71866A",
          hover: "#5A6D54",
          subtle: "#EFF5EE",
          border: "#C1CDC0",
        },
        teal: {
          DEFAULT: "#477C78",
          hover: "#3A6663",
          subtle: "#EBF5F4",
          border: "#B5D4D2",
        },
        terracotta: {
          DEFAULT: "#C4775A",
          hover: "#A8634B",
          subtle: "#FBF0EB",
          border: "#E3C5B7",
        },
        pamber: {
          DEFAULT: "#B87F3B",
          subtle: "#FDF5E6",
          border: "#E8D3B8",
        },
        persona: {
          red: "#76513C",
          "red-hover": "#5F4130",
          "red-active": "#483225",
          "red-subtle": "#F5ECE6",
          "red-border": "#C7B3A6",
          blue: "#477C78",
          "blue-hover": "#3A6663",
          "blue-subtle": "#EBF5F4",
          "blue-border": "#B5D4D2",
        },
        p3r: {
          blue: "#477C78",
          "blue-hover": "#3A6663",
          "blue-subtle": "#EBF5F4",
          "blue-border": "#B5D4D2",
        },
        text: {
          primary: "#29231F",
          secondary: "#5F574F",
          muted: "#8A8378",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-plus-jakarta)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "monospace",
        ],
        pixel: [
          "var(--font-pixel)",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
