/**
 * Centralized theme configuration for Nexum
 * Update colors here to propagate changes across the entire application
 */

export const theme = {
  // Background colors
  bg: {
    main: '#0a0a0a',           // Dark mode general black background - main app background
    header: '#111111',          // Dark mode gray detail 1 - headers, panels
    card: '#1a1a1a',            // Cards, modals, elevated surfaces
    input: '#111111',           // Input fields
    hover: '#1f1f1f',           // Hover states for cards/buttons
    hoverSubtle: 'rgb(31 41 55)', // Subtle hover (gray-800 equivalent)
  },

  // Border colors
  border: {
    default: 'rgb(31 41 55)',   // Default borders (gray-800)
    subtle: 'rgb(55 65 81)',    // Subtle borders (gray-700)
    input: 'rgb(31 41 55)',     // Input borders
    focus: 'rgb(55 65 81)',     // Focus state borders
  },

  // Text colors
  text: {
    primary: '#ffffff',         // Primary text (white)
    secondary: 'rgb(209 213 219)', // Secondary text (gray-300)
    tertiary: 'rgb(156 163 175)',  // Tertiary text (gray-400)
    muted: 'rgb(107 114 128)',     // Muted text (gray-500)
    placeholder: 'rgb(107 114 128)', // Placeholder text
  },

  // Status colors
  status: {
    online: '#22c55e',          // Green
    offline: '#6b7280',         // Gray
    error: '#ef4444',           // Red
    success: '#22c55e',         // Green
    warning: '#f59e0b',         // Amber
  },

  // Interactive elements
  button: {
    primary: '#2563eb',         // Blue-600
    primaryHover: '#3b82f6',    // Blue-500
    secondary: 'rgb(31 41 55)', // Gray-800
    secondaryHover: 'rgb(55 65 81)', // Gray-700
    danger: '#dc2626',          // Red-600
    dangerHover: '#ef4444',     // Red-500
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal backdrop
}

// Helper function to use theme colors in className strings
export const tw = {
  // Backgrounds
  bgMain: 'bg-[#0a0a0a]',
  bgHeader: 'bg-[#111111]',
  bgCard: 'bg-[#1a1a1a]',
  bgInput: 'bg-[#111111]',
  bgHover: 'hover:bg-[#1f1f1f]',
  bgHoverSubtle: 'hover:bg-gray-800',

  // Borders
  borderDefault: 'border-gray-800',
  borderSubtle: 'border-gray-700',

  // Text
  textPrimary: 'text-white',
  textSecondary: 'text-gray-300',
  textTertiary: 'text-gray-400',
  textMuted: 'text-gray-500',

  // Buttons
  btnPrimary: 'bg-blue-600 hover:bg-blue-500',
  btnSecondary: 'bg-gray-800 hover:bg-gray-700',
  btnDanger: 'bg-red-600 hover:bg-red-500',
}
