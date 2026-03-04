<template>
  <el-footer class="terminal-footer" v-if="isConnected">
    <div class="status-bar">
      <!-- Connection Status with Pulse LED -->
      <div class="status-item status-pill connected">
        <span class="pulse-led"></span>
        <span class="status-text">已连接</span>
      </div>

      <!-- Server Host Info -->
      <div class="status-item host-info">
        <el-icon><Monitor /></el-icon>
        <span class="host-text">{{ connectionDisplay }}</span>
      </div>

      <!-- Actions (Now placed after host info) -->
      <div class="status-actions">
        <div 
          class="action-item" 
          :class="{ active: showSftp }"
          @click="$emit('toggle-sftp')"
          title="文件管理器"
        >
          <el-icon><Folder /></el-icon>
          <span>文件管理</span>
        </div>
        <div 
          class="action-item" 
          @click="$emit('show-commands')"
          title="常用命令库"
        >
          <el-icon><Tickets /></el-icon>
          <span>常用命令</span>
        </div>
      </div>

      <!-- Spacer -->
      <div class="flex-spacer"></div>
    </div>
  </el-footer>
</template>

<script setup>
import { Connection, Monitor, Folder, Tickets } from '@element-plus/icons-vue'

defineProps({
  isConnected: {
    type: Boolean,
    default: false
  },
  connectionDisplay: {
    type: String,
    default: ''
  },
  showSftp: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-sftp', 'show-commands'])
</script>

<style scoped>
.terminal-footer {
  flex-shrink: 0;
  height: 32px !important;
  padding: 0 12px;
  display: flex;
  align-items: center;
  /* Glassmorphism Effect */
  background: rgba(28, 28, 30, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.3);
  color: #d1d1d6;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  font-size: 11px;
  position: relative;
  z-index: 100;
}

.status-bar {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  gap: 12px;
}

.status-pill {
  display: flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status-pill.connected {
  background: rgba(52, 199, 89, 0.1);
  border-color: rgba(52, 199, 89, 0.2);
  color: #32d74b;
  font-weight: 500;
}

.pulse-led {
  width: 6px;
  height: 6px;
  background-color: #32d74b;
  border-radius: 50%;
  margin-right: 6px;
  box-shadow: 0 0 4px rgba(50, 215, 75, 0.6);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(50, 215, 75, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(50, 215, 75, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(50, 215, 75, 0); }
}

.host-info {
  display: flex;
  align-items: center;
  gap: 5px;
  opacity: 0.8;
  font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
}

.flex-spacer {
  flex: 1;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.action-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.action-item.active {
  background: rgba(0, 122, 255, 0.15);
  border-color: rgba(0, 122, 255, 0.3);
  color: #0a84ff;
  font-weight: 500;
}

.status-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.action-item .el-icon {
  font-size: 13px;
}
</style>
