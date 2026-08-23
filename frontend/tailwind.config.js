/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14181F",
          900: "#10131A",
          800: "#1C222C",
          700: "#262E3A",
          600: "#333D4C",
          950: "#0B0D12",
        },
        paper: {
          DEFAULT: "#F7F5F0",
          dim: "#EFEBE2",
        },
        moss: {
          50: "#EDF4F1",
          100: "#D3E5DD",
          400: "#3D8770",
          500: "#2F6F5E",
          600: "#245648",
          700: "#1B4237",
        },
        amber: {
          50: "#FBF3E7",
          100: "#F0DDB4",
          400: "#CE9A4C",
          500: "#B9812E",
          600: "#8F6120",
        },
        line: "#DEDACD",
        ink2: "#5B6270",
        success: "#2F8F5B",
        warn: "#C6862F",
        danger: "#C0453B",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20, 24, 31, 0.04), 0 4px 16px rgba(20, 24, 31, 0.06)",
        lift: "0 8px 24px rgba(20, 24, 31, 0.10)",
        tab: "0 2px 6px rgba(185, 129, 46, 0.25)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 80%, 100%": { opacity: 0.25, transform: "scale(0.85)" },
          "40%": { opacity: 1, transform: "scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        riseIn: {
          "0%": { opacity: 0, transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        drift: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(3%, -4%) scale(1.08)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
        driftSlow: {
          "0%": { transform: "translate(0, 0) scale(1.05)" },
          "50%": { transform: "translate(-4%, 3%) scale(1)" },
          "100%": { transform: "translate(0, 0) scale(1.05)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.35s ease-out both",
        pulseDot: "pulseDot 1.2s ease-in-out infinite",
        fadeIn: "fadeIn 0.25s ease-out both",
        riseIn: "riseIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        drift: "drift 14s ease-in-out infinite",
        driftSlow: "driftSlow 20s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        floatSlow: "floatSlow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
