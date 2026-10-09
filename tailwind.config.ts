import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          soft: "rgb(var(--bg-soft) / <alpha-value>)",
          softer: "rgb(var(--bg-softer) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          // Accent-coloured text/icons on surfaces (fills use DEFAULT).
          fg: "rgb(var(--accent-fg) / <alpha-value>)",
        },
        // Status colours, themed in globals.css
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          bg: "rgb(var(--danger-bg) / <alpha-value>)",
          border: "rgb(var(--danger-border) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          bg: "rgb(var(--success-bg) / <alpha-value>)",
          border: "rgb(var(--success-border) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          bg: "rgb(var(--warning-bg) / <alpha-value>)",
          border: "rgb(var(--warning-border) / <alpha-value>)",
        },
        // Find-match highlight (editor + Find results list).
        find: "rgb(var(--find) / <alpha-value>)",
        // Gray scale is variable-driven so it inverts in light mode (the UI is
        // designed around light-on-dark text).
        gray: {
          50: "rgb(var(--gray-50) / <alpha-value>)",
          100: "rgb(var(--gray-100) / <alpha-value>)",
          200: "rgb(var(--gray-200) / <alpha-value>)",
          300: "rgb(var(--gray-300) / <alpha-value>)",
          400: "rgb(var(--gray-400) / <alpha-value>)",
          500: "rgb(var(--gray-500) / <alpha-value>)",
          600: "rgb(var(--gray-600) / <alpha-value>)",
          700: "rgb(var(--gray-700) / <alpha-value>)",
          800: "rgb(var(--gray-800) / <alpha-value>)",
          900: "rgb(var(--gray-900) / <alpha-value>)",
          950: "rgb(var(--gray-950) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Dense UI type scale. Each step carries its own line-height and
      // tracking (Inter wants looser tracking small, tighter large).
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px", letterSpacing: "0.005em" }],
        xs: ["12px", { lineHeight: "16px", letterSpacing: "0em" }],
        sm: ["14px", { lineHeight: "20px", letterSpacing: "-0.006em" }],
        base: ["16px", { lineHeight: "24px", letterSpacing: "-0.011em" }],
        lg: ["18px", { lineHeight: "26px", letterSpacing: "-0.014em" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.017em" }],
      },
      letterSpacing: {
        tightish: "-0.011em",
        // All-caps labels need air between letters.
        caps: "0.06em",
      },
    },
  },
  plugins: [],
};

export default config;
