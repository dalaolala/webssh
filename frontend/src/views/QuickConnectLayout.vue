<template>
  <div class="quick-connect-layout">
    <!-- 固定顶部栏 -->
    <div class="layout-header" :class="{ dark: isTerminal }">
      <el-button @click="$router.push('/dashboard')" size="small" text :style="{ color: isTerminal ? '#aaa' : '#888' }">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <span class="header-divider"></span>
      <span class="page-title" v-if="!isTerminal">快速连接</span>

      <!-- 终端 Tab -->
      <div v-if="isTerminal" class="terminal-tab">
        <span class="tab-dot"></span>
        <span class="tab-label">{{ tabLabel }}</span>
      </div>
    </div>

    <!-- 子页面内容 -->
    <div class="layout-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'

const route = useRoute()
const terminalStore = useTerminalStore()

const isTerminal = computed(() => route.path.includes('/terminal'))

const tabLabel = computed(() => {
  const conn = terminalStore.currentConnection
  if (!conn) return '终端'
  const name = conn.name || ''
  const userHost = `${conn.username || ''}@${conn.host || ''}:${conn.port || 22}`
  return name ? `${name} (${userHost})` : userHost
})
</script>

<style scoped>
.quick-connect-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 36px;
  flex-shrink: 0;
  z-index: 100;
  gap: 8px;
  transition: background-color 0.2s, border-color 0.2s;
}

.layout-header.dark {
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.header-divider {
  width: 1px;
  height: 14px;
  background: #dcdfe6;
}

.layout-header.dark .header-divider {
  background: #555;
}

.page-title {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

/* Terminal Tab */
.terminal-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #1e1e1e;
  border-radius: 4px;
  border: 1px solid #3e3e42;
}

.tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #67c23a;
  flex-shrink: 0;
}

.tab-label {
  font-size: 12px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
