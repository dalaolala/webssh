import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const THEME_KEY = 'webssh_theme'
  const THEME_VERSION_KEY = 'webssh_theme_version'
  const CURRENT_VERSION = '1.0' // 版本号,用于重置主题设置

  // 检查版本,如果版本不一致则重置为亮色模式
  const savedVersion = localStorage.getItem(THEME_VERSION_KEY)
  const shouldResetTheme = savedVersion !== CURRENT_VERSION

  // 从 localStorage 读取主题设置，默认为 'light'
  const savedTheme = shouldResetTheme ? 'light' : (localStorage.getItem(THEME_KEY) || 'light')
  const isDark = ref(savedTheme === 'dark')

  // 保存版本号
  if (shouldResetTheme) {
    localStorage.setItem(THEME_VERSION_KEY, CURRENT_VERSION)
    localStorage.setItem(THEME_KEY, 'light')
  }

  // 切换主题
  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  // 设置主题
  const setTheme = (dark) => {
    isDark.value = dark
  }

  // 监听主题变化，保存到 localStorage 并更新 document class
  watch(isDark, (newVal) => {
    localStorage.setItem(THEME_KEY, newVal ? 'dark' : 'light')

    if (newVal) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, { immediate: true })

  return {
    isDark,
    toggleTheme,
    setTheme
  }
})
