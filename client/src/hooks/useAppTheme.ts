/**
 * Custom hook to access current theme values and Tailwind classes
 * Automatically updates when theme mode changes
 */

import { useTheme } from '../contexts/ThemeContext'
import { getTheme, getTw } from '../theme'

export function useAppTheme() {
  const { mode, setMode, toggleMode } = useTheme()

  // Get current theme colors and Tailwind classes based on mode
  const theme = getTheme(mode)
  const tw = getTw(mode)

  return {
    mode,
    setMode,
    toggleMode,
    theme,
    tw,
  }
}
