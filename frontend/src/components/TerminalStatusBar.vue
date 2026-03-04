<template>
  <el-footer class="terminal-footer" v-if="isConnected">
    <div class="status-bar">
      <span class="status-item">
        <el-icon><Connection /></el-icon>
        已连接
      </span>
      <span class="status-item status-item-host">
        <el-icon><Monitor /></el-icon>
        {{ connectionDisplay }}
      </span>
      <span 
        class="status-item clickable" 
        @click="$emit('toggle-sftp')"
        :class="{ active: showSftp }"
      >
        <el-icon><Folder /></el-icon>
        文件管理器
      </span>
      <span 
        class="status-item clickable" 
        @click="$emit('show-commands')"
        title="常用 Linux 命令库"
      >
        <el-icon><Tickets /></el-icon>
        常用命令
      </span>
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
  background: linear-gradient(90deg, #1e1e1e 0%, #252526 50%, #1e1e1e 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  color: #a0a0a0;
  font-size: 13px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 10;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #b0b0b0;
  padding: 6px 14px;
  border-radius: 6px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.status-item:first-child {
  color: #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
  border-color: rgba(103, 194, 58, 0.2);
  font-weight: 600;
}

.status-item-host {
  color: #ffffff !important;
  font-family: 'Courier New', monospace;
  background-color: rgba(0, 0, 0, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.status-item.clickable {
  cursor: pointer;
}

.status-item.clickable:hover {
  background-color: rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.4);
  color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-item.active {
  background-color: rgba(64, 158, 255, 0.2);
  border-color: rgba(64, 158, 255, 0.5);
  color: #409eff;
  font-weight: 600;
  box-shadow: 0 0 12px rgba(64, 158, 255, 0.15);
}

.status-item .el-icon {
  font-size: 15px;
}
</style>
