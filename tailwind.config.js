/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette matches the recruiter section's "Modern Clinical" look
        // (src/styles/recruiters.css) so the whole app reads as one system.
        navy: '#0f1923',
        blue: {
          DEFAULT: '#1a6bcc',
          dark: '#14508f',
          light: '#eaf2fb',
          border: '#b8d4ef',
        },
        text: {
          mid: '#374151',
          muted: '#6b7280',
        },
        border: '#e5e7eb',
        surface: '#f8faff',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        headline: '-0.04em',
      },
      borderRadius: {
        card: '4px',
        btn: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 25, 35, 0.06), 0 1px 2px rgba(15, 25, 35, 0.04)',
        float: '0 10px 30px rgba(15, 25, 35, 0.12)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
}
