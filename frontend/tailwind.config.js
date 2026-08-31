/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14181F",
        muted: "#6B7280",
        surface: "#FFFFFF",
        canvas: "#F7F8FA",
        border: "#E4E7EC",
        accent: {
          DEFAULT: "#4338CA",
          hover: "#372AA8",
          soft: "#EEF0FD",
        },
        status: {
          sent: "#16A34A",
          sentSoft: "#EAF7EE",
          scheduled: "#2563EB",
          scheduledSoft: "#EAF1FE",
          limited: "#D97706",
          limitedSoft: "#FDF3E5",
          failed: "#DC2626",
          failedSoft: "#FCEAEA",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};
