<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // 初始化认证状态
  authStore.initializeAuth()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  height: 100vh;
  background-color: #f5f5f5;
}

.terminal-container {
  background-color: #1e1e1e;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  padding: 10px;
  height: 100%;
  overflow: auto;
}

.terminal-line {
  line-height: 1.2;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.terminal-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background-color: #ffffff;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>