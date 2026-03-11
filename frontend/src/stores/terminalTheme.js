import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { terminalThemes, fontSizeOptions } from '@/config/terminalThemes'

export const useTerminalThemeStore = defineStore('terminalTheme', () => {
  const THEME_KEY = 'webssh_terminal_theme'
  const FONT_SIZE_KEY = 'webssh_terminal_font_size'

  // 从 localStorage 读取配色方案，默认 'apple-dark'
  const currentThemeId = ref(
    localStorage.getItem(THEME_KEY) || 'apple-dark'
  )

  // 从 localStorage 读取字体大小，默认 14
  const fontSize = ref(
    parseInt(localStorage.getItem(FONT_SIZE_KEY)) || 14
  )

  // 获取当前配色方案对象
  const currentTheme = computed(() => {
    return terminalThemes.find(t => t.id === currentThemeId.value) || terminalThemes[0]
  })

  // 获取所有可用的配色方案
  const availableThemes = computed(() => terminalThemes)

  // 获取深色配色方案
  const darkThemes = computed(() => {
    return terminalThemes.filter(t => t.category === 'dark')
  })

  // 获取亮色配色方案
  const lightThemes = computed(() => {
    return terminalThemes.filter(t => t.category === 'light')
  })

  // 获取字体大小选项
  const availableFontSizes = computed(() => fontSizeOptions)

  // 设置配色方案
  const setTheme = (themeId) => {
    const theme = terminalThemes.find(t => t.id === themeId)
    if (theme) {
      currentThemeId.value = themeId
    }
  }

  // 设置字体大小
  const setFontSize = (size) => {
    if (size >= 10 && size <= 30) {
      fontSize.value = size
    }
  }

  // 增加字体大小
  const increaseFontSize = () => {
    if (fontSize.value < 30) {
      fontSize.value += 2
    }
  }

  // 减小字体大小
  const decreaseFontSize = () => {
    if (fontSize.value > 10) {
      fontSize.value -= 2
    }
  }

  // 重置为默认值
  const resetToDefaults = () => {
    currentThemeId.value = 'apple-dark'
    fontSize.value = 14
  }

  // 持久化配色方案
  watch(currentThemeId, (newId) => {
    localStorage.setItem(THEME_KEY, newId)
  })

  // 持久化字体大小
  watch(fontSize, (newSize) => {
    localStorage.setItem(FONT_SIZE_KEY, newSize.toString())
  })

  return {
    // 状态
    currentThemeId,
    currentTheme,
    fontSize,
    
    // 计算属性
    availableThemes,
    darkThemes,
    lightThemes,
    availableFontSizes,
    
    // 方法
    setTheme,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetToDefaults
  }
})
