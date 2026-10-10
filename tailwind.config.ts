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
          hover: "#F1E8D5",
          border: "#E8E3D8",
          "border-subtle": "#EDE8DE",
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
        },
        p3r: {
          blue: "#71866A",
          "blue-hover": "#5A6D54",
          "blue-subtle": "#EFF5EE",
          "blue-border": "#C1CDC0",
        },
        text: {
          primary: "#292820",
          secondary: "#777568",
          muted: "#A29F91",
        },
      },
      fontFamily: {
        sans: [
          '"DM Sans"',
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
          '"Press Start 2P"',
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
