export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0faf9",
          100: "#d2f2ee",
          200: "#a7e4dd",
          300: "#72cfca",
          400: "#3db4ae",
          500: "#1f9995",
          600: "#147c7a",
          700: "#126362",
          800: "#134f4f",
          900: "#134142",
        },

        ink: {
          50: "#f7f9fb",
          100: "#eef2f6",
          200: "#dce3eb",
          300: "#c2ccd8",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },

      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },

      boxShadow: {
        soft: "0 2px 12px rgba(15, 23, 42, 0.06)",
        card: "0 1px 4px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)",
        dropdown:
          "0 4px 24px rgba(15, 23, 42, 0.10), 0 1px 4px rgba(15, 23, 42, 0.06)",
      },

      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },

      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
    },
  },

  plugins: [],
};
