<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// 移除认证相关的初始化逻辑
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

/* GitHub Tooltip 卡片样式 */
.github-popper.el-popper {
  padding: 0 !important;
  border-radius: 10px !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06) !important;
  background: rgba(255, 255, 255, 0.97) !important;
  backdrop-filter: blur(24px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(200%) !important;
  overflow: hidden !important;
}

/* 深色模式 */
.dark .github-popper.el-popper,
html.dark .github-popper.el-popper {
  background: rgba(36, 36, 38, 0.97) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.3) !important;
}

.dark .github-popper .github-card-app-name,
html.dark .github-popper .github-card-app-name {
  color: #f0f0f5;
}

.dark .github-popper .github-card-divider,
html.dark .github-popper .github-card-divider {
  background: rgba(255, 255, 255, 0.08);
}

.dark .github-popper .github-card-link,
html.dark .github-popper .github-card-link {
  color: #e0e0e5;
}

.dark .github-popper .github-card-link:hover,
html.dark .github-popper .github-card-link:hover {
  background: rgba(64, 158, 255, 0.14);
}

.dark .github-popper .github-card-link:hover .github-card-link-label,
html.dark .github-popper .github-card-link:hover .github-card-link-label {
  color: #409eff;
}
</style>