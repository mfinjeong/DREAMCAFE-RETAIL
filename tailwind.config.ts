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
        background: "#FEFEFE",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#FFF7ED",
          hover: "#FFF1E6",
          border: "#E7DDE1",
          "border-subtle": "#F3EBEE",
          "border-active": "#D8C5CD",
          card: "#FFFFFF",
          dark: "#F8F2F4",
        },
        coffee: {
          DEFAULT: "#F97316",
          hover: "#EA580C",
          active: "#C2410C",
          subtle: "#FFF7ED",
          border: "#FED7AA",
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
                  primary: "#211C20",
                  secondary: "#51464C",
                  muted: "#7A6F75",
        },
                orange: {
                  DEFAULT: "#F97316",
                  hover: "#EA580C",
                  active: "#C2410C",
                  subtle: "#FFF7ED",
                  border: "#FED7AA",
                },
                maroon: {
                  DEFAULT: "#7F1D3A",
                  hover: "#64172F",
                  active: "#450A1A",
                  subtle: "#FDF2F8",
                  border: "#FBCFE8",
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
