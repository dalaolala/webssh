<template>
  <el-tooltip :content="isDark ? '切换到亮色模式' : '切换到暗黑模式'" placement="bottom">
    <el-button
      class="theme-toggle-btn"
      :class="{ 'dark': isDark }"
      text
      circle
      size="small"
      @click.stop="toggleTheme"
    >
      <el-icon v-if="isDark"><Sunny /></el-icon>
      <el-icon v-else><Moon /></el-icon>
    </el-button>
  </el-tooltip>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const toggleTheme = () => {
  console.log('Toggle theme clicked, current isDark:', isDark.value)
  themeStore.toggleTheme()
  console.log('After toggle, isDark:', isDark.value)
}
</script>

<style scoped>
.theme-toggle-btn {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.08);
  border: 1px solid rgba(0, 122, 255, 0.2);
  transition: all 0.2s ease;
  width: 32px !important;
  height: 32px !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle-btn:hover {
  color: #ffffff;
  background-color: #007AFF;
  border-color: #007AFF;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.theme-toggle-btn:active {
  transform: scale(0.95);
}

.theme-toggle-btn.dark {
  color: #007AFF;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(0, 122, 255, 0.4);
}

.theme-toggle-btn.dark:hover {
  color: #ffffff;
  background-color: #007AFF;
  border-color: #007AFF;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.4);
}
</style>
