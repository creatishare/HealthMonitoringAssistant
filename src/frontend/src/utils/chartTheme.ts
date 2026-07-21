import type { CSSProperties } from 'react'
import { useThemeStore } from '../stores/themeStore'

/**
 * Recharts 图表主题：tick/tooltip 颜色是 JS 写死的，不走 CSS 变量，
 * 因此统一从 themeStore 读取当前主题，供各图表页面复用。
 */
export function useChartTheme() {
  const isDark = useThemeStore((state) => state.isDark)

  const tickStyle = {
    fontSize: 13,
    fill: isDark ? '#B3B3B3' : '#5b6478',
  }

  const tooltipContentStyle: CSSProperties = {
    backgroundColor: isDark ? '#1F1F1F' : 'rgba(255,255,255,0.96)',
    border: isDark ? '1px solid #434343' : '1px solid rgba(145,161,196,0.24)',
    borderRadius: '16px',
    fontSize: '13px',
    color: isDark ? '#E6E6E6' : '#262626',
  }

  const tooltipLabelStyle: CSSProperties = {
    color: isDark ? '#E6E6E6' : '#262626',
  }

  const tooltipItemStyle: CSSProperties = {
    color: isDark ? '#E6E6E6' : '#262626',
  }

  return {
    isDark,
    tickStyle,
    tooltipContentStyle,
    tooltipLabelStyle,
    tooltipItemStyle,
  }
}
