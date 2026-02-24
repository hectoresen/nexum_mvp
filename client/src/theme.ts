/**
 * Centralized theme configuration for Nexum
 * Update colors here to propagate changes across the entire application
 */

export type ThemeMode = 'light' | 'dark'

// Dark mode color palette
const darkTheme = {
  bg: {
    main: '#0a0a0a',           // Dark mode general black background
    header: '#111111',          // Headers, panels
    card: '#1a1a1a',            // Cards, modals, elevated surfaces
    input: '#111111',           // Input fields
    hover: '#1f1f1f',           // Hover states for cards/buttons
    hoverSubtle: 'rgb(31 41 55)', // Subtle hover (gray-800)
  },
  border: {
    default: 'rgb(31 41 55)',   // Default borders (gray-800)
    subtle: 'rgb(55 65 81)',    // Subtle borders (gray-700)
    input: 'rgb(31 41 55)',     // Input borders
    focus: 'rgb(55 65 81)',     // Focus state borders
  },
  text: {
    primary: '#ffffff',         // Primary text
    secondary: 'rgb(209 213 219)', // Secondary text (gray-300)
    tertiary: 'rgb(156 163 175)',  // Tertiary text (gray-400)
    muted: 'rgb(107 114 128)',     // Muted text (gray-500)
    placeholder: 'rgb(107 114 128)', // Placeholder text
    buttonSecondary: 'rgb(209 213 219)', // Button text in secondary buttons (gray-300)
  },
  button: {
    secondary: '#1a1a1a',           // Slightly lighter than main (#0a0a0a)
    secondaryHover: '#222222',      // Even lighter on hover
  },
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal backdrop
}

// Light mode color palette
const lightTheme = {
  bg: {
    main: '#f8f9fa',           // Light mode soft gray background (off-white)
    header: '#f8f9fa',         // Headers, panels - same as main for consistency
    card: '#ffffff',           // Cards, modals (pure white for contrast)
    input: '#ffffff',          // Input fields (white with border)
    hover: '#f1f3f5',          // Hover states (slightly darker gray)
    hoverSubtle: 'rgb(241 243 245)', // Subtle hover
  },
  border: {
    default: 'rgb(222 226 230)', // Default borders (lighter)
    subtle: 'rgb(233 236 239)',  // Subtle borders (very light)
    input: 'rgb(206 212 218)',   // Input borders
    focus: 'rgb(134 142 150)',   // Focus state borders
  },
  text: {
    primary: '#212529',         // Primary text (almost black)
    secondary: 'rgb(73 80 87)', // Secondary text (gray-700)
    tertiary: 'rgb(108 117 125)',  // Tertiary text (gray-600)
    muted: 'rgb(173 181 189)',     // Muted text (gray-500)
    placeholder: 'rgb(173 181 189)', // Placeholder text
  },
  button: {
    secondary: '#ffffff',           // White (contrast with #f8f9fa background)
    secondaryHover: '#f1f3f5',      // Slightly darker on hover
  },
  overlay: 'rgba(0, 0, 0, 0.3)', // Modal backdrop (lighter)
}

// Status and interactive colors (same for both themes)
const commonColors = {
  status: {
    online: '#22c55e',          // Green
    offline: '#6b7280',         // Gray
    error: '#ef4444',           // Red
    success: '#22c55e',         // Green
    warning: '#f59e0b',         // Amber
  },
  button: {
    primary: '#2563eb',         // Blue-600
    primaryHover: '#3b82f6',    // Blue-500
    danger: '#dc2626',          // Red-600
    dangerHover: '#ef4444',     // Red-500
  },
}

// Get theme based on current mode
export function getTheme(mode: ThemeMode) {
  const base = mode === 'dark' ? darkTheme : lightTheme
  return {
    ...base,
    ...commonColors,
  }
}

// Default to dark theme (will be overridden by ThemeContext)
export const theme = getTheme('dark')

// Helper functions to get Tailwind classes based on theme mode
export function getTw(mode: ThemeMode) {
  if (mode === 'dark') {
    return {
      // Backgrounds
      bgMain: 'bg-[#0a0a0a]',
      bgHeader: 'bg-[#111111]',
      bgCard: 'bg-[#1a1a1a]',
      bgInput: 'bg-[#111111]',
      bgHover: 'hover:bg-[#1f1f1f]',
      bgHoverSubtle: 'hover:bg-gray-800',
      bgActive: 'bg-gray-800',
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
      btnSecondary: 'bg-[#1a1a1a] hover:bg-[#222222] text-gray-300',
      btnDanger: 'bg-red-600 hover:bg-red-500',
    }
  }

  // Light mode
  return {
    // Backgrounds
    bgMain: 'bg-[#f8f9fa]',
    bgHeader: 'bg-[#f8f9fa]',
    bgCard: 'bg-white',
    bgInput: 'bg-white',
    bgHover: 'hover:bg-[#f1f3f5]',
    bgHoverSubtle: 'hover:bg-[#f1f3f5]',
    bgActive: 'bg-[#f1f3f5]',
    // Borders
    borderDefault: 'border-[#dee2e6]',
    borderSubtle: 'border-[#e9ecef]',
    // Text
    textPrimary: 'text-[#212529]',
    textSecondary: 'text-[#495057]',
    textTertiary: 'text-[#6c757d]',
    textMuted: 'text-[#adb5bd]',
    // Buttons
    btnPrimary: 'bg-blue-600 hover:bg-blue-500',
    btnSecondary: 'bg-white hover:bg-[#f1f3f5] text-[#212529] border border-[#dee2e6]',
    btnDanger: 'bg-red-600 hover:bg-red-500',
  }
}

// Default to dark mode (will be overridden by ThemeContext)
export const tw = getTw('dark')
