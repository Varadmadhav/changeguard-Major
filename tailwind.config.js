/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F8F9FB',
          surface: '#FFFFFF',
          'surface-subtle': '#F4F5F7',
          'surface-hover': '#F0F2F5',
          border: '#E4E7EC',
          'border-strong': '#D0D5DD',
          'text-primary': '#101828',
          'text-secondary': '#475467',
          'text-muted': '#667085',
          'text-disabled': '#98A2B3',
        },
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        risk: {
          low: '#16A34A',
          'low-bg': '#F0FDF4',
          'low-border': '#BBF7D0',
          medium: '#D97706',
          'medium-bg': '#FFFBEB',
          'medium-border': '#FDE68A',
          high: '#EA580C',
          'high-bg': '#FFF7ED',
          'high-border': '#FFEDD5',
          critical: '#DC2626',
          'critical-bg': '#FEF2F2',
          'critical-border': '#FECACA',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
        'card': '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px -1px rgba(16, 24, 40, 0.04)',
        'dropdown': '0 4px 6px -2px rgba(16, 24, 40, 0.05), 0 10px 15px -3px rgba(16, 24, 40, 0.08)',
        'modal': '0 20px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.08)',
      },
      borderRadius: {
        'card': '10px',
        'modal': '12px',
        'input': '6px',
        'btn': '6px',
      }
    },
  },
  plugins: [],
}
