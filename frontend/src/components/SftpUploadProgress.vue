<template>
  <div class="sftp-upload-progress" :class="{ 'dark-theme': isDark }">
    <!-- 上传按钮 -->
    <div class="upload-trigger">
      <button class="upload-btn" @click="triggerFileSelect" :disabled="isUploading">
        <span class="btn-icon">⬆</span>
        <span>{{ isUploading ? '上传中...' : '选择本地文件上传' }}</span>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        style="display: none"
        @change="handleFileSelect"
      />
    </div>

    <!-- 进度条区域 -->
    <div v-if="isUploading || uploadProgress > 0" class="progress-section">
      <!-- 文件信息 -->
      <div class="file-info">
        <span class="file-name">{{ uploadFileName }}</span>
        <span class="file-size">{{ formatFileSize(uploadLoaded) }} / {{ formatFileSize(uploadTotal) }}</span>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
        <span class="progress-text">{{ uploadProgress }}%</span>
      </div>

      <!-- 操作按钮 -->
      <div class="progress-actions">
        <button v-if="isUploading" class="cancel-btn" @click="handleCancel">
          取消上传
        </button>
        <button v-else-if="uploadProgress === 100" class="done-btn" @click="handleDone">
          完成
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="uploadError" class="error-message">
      <span class="error-icon">⚠</span>
      <span>{{ uploadError }}</span>
      <button class="retry-btn" @click="resetUpload">重试</button>
    </div>

    <!-- 上传历史（可选显示） -->
    <div v-if="showHistory && uploadHistory.length > 0" class="upload-history">
      <div class="history-header">
        <span>上传历史</span>
        <button class="clear-btn" @click="clearHistory">清空</button>
      </div>
      <div class="history-list">
        <div
          v-for="item in uploadHistory"
          :key="item.uploadId"
          class="history-item"
          :class="item.status"
        >
          <span class="history-name">{{ item.fileName }}</span>
          <span class="history-status">
            <template v-if="item.status === 'completed'">✓ 完成</template>
            <template v-else-if="item.status === 'error'">✗ 失败</template>
            <template v-else-if="item.status === 'cancelled'">已取消</template>
            <template v-else>{{ item.progress }}%</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSftpUpload } from '@/composables/useSftpUpload'
import { useThemeStore } from '@/stores/theme'

// Props
const props = defineProps({
  // SFTP 会话 ID（来自 useQuickSftp）
  sessionId: {
    type: String,
    required: true
  },
  // 远程目标目录
  remoteDirectory: {
    type: String,
    default: '/'
  },
  // 是否显示上传历史
  showHistory: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['upload-complete', 'upload-error'])

// 主题
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

// 使用上传 composable
const {
  isUploading,
  uploadProgress,
  uploadLoaded,
  uploadTotal,
  uploadFileName,
  uploadError,
  uploadHistory,
  startUpload,
  cancelUpload,
  resetUpload,
  clearHistory,
  formatFileSize
} = useSftpUpload()

// 文件输入引用
const fileInputRef = ref(null)

// 触发文件选择
const triggerFileSelect = () => {
  if (!isUploading.value && fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// 处理文件选择
const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Electron 环境：获取本地文件绝对路径
  // 注意：在 Web 环境中无法获取本地文件的绝对路径，需要用户手动输入
  // 这里假设是 Electron 环境，使用 file.path 属性
  let localPath = file.path || file.name

  // 构建远程目标路径
  const remotePath = props.remoteDirectory === '/'
    ? `/${file.name}`
    : `${props.remoteDirectory}/${file.name}`

  try {
    await startUpload(props.sessionId, localPath, remotePath)
  } catch (err) {
    emit('upload-error', err.message)
  }

  // 清空 input，允许重复选择同一文件
  event.target.value = ''
}

// 取消上传
const handleCancel = () => {
  cancelUpload()
}

// 完成上传
const handleDone = () => {
  emit('upload-complete', {
    fileName: uploadFileName.value,
    remotePath: props.remoteDirectory
  })
  resetUpload()
}
</script>

<style scoped>
/* 极简进度条样式 - 符合终端工具风格 */
.sftp-upload-progress {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #333;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  transition: all 0.2s ease;
}

.sftp-upload-progress.dark-theme {
  color: #e0e0e0;
  background: #1e1e1e;
  border-color: #3c3c3c;
}

/* 上传按钮 */
.upload-trigger {
  margin-bottom: 10px;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 13px;
  color: #fff;
  background: #2196f3;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-btn:hover:not(:disabled) {
  background: #1976d2;
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dark-theme .upload-btn {
  background: #007acc;
}

.dark-theme .upload-btn:hover:not(:disabled) {
  background: #005a9e;
}

.btn-icon {
  font-size: 14px;
}

/* 进度区域 */
.progress-section {
  margin-top: 10px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.dark-theme .progress-section {
  background: #252526;
  border-color: #3c3c3c;
}

/* 文件信息 */
.file-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.file-name {
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.dark-theme .file-name {
  color: #e0e0e0;
}

.file-size {
  color: #666;
  font-size: 12px;
}

.dark-theme .file-size {
  color: #888;
}

/* 进度条 */
.progress-bar-container {
  position: relative;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.dark-theme .progress-bar-container {
  background: #3c3c3c;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.dark-theme .progress-text {
  color: #e0e0e0;
}

/* 操作按钮 */
.progress-actions {
  margin-top: 10px;
  text-align: right;
}

.cancel-btn,
.done-btn,
.retry-btn {
  padding: 4px 12px;
  font-family: inherit;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-btn {
  color: #fff;
  background: #f44336;
}

.cancel-btn:hover {
  background: #d32f2f;
}

.done-btn {
  color: #fff;
  background: #4caf50;
}

.done-btn:hover {
  background: #388e3c;
}

.retry-btn {
  color: #fff;
  background: #ff9800;
  margin-left: 8px;
}

.retry-btn:hover {
  background: #f57c00;
}

/* 错误提示 */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  color: #c62828;
  font-size: 12px;
}

.dark-theme .error-message {
  background: #3c1f1f;
  border-color: #5c2a2a;
  color: #ef9a9a;
}

.error-icon {
  font-size: 14px;
}

/* 上传历史 */
.upload-history {
  margin-top: 12px;
  border-top: 1px solid #e0e0e0;
  padding-top: 10px;
}

.dark-theme .upload-history {
  border-top-color: #3c3c3c;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.dark-theme .history-header {
  color: #888;
}

.clear-btn {
  padding: 2px 8px;
  font-family: inherit;
  font-size: 11px;
  color: #666;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  cursor: pointer;
}

.dark-theme .clear-btn {
  color: #888;
  border-color: #3c3c3c;
}

.clear-btn:hover {
  background: #f0f0f0;
}

.dark-theme .clear-btn:hover {
  background: #3c3c3c;
}

.history-list {
  max-height: 150px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
  border-bottom: 1px dashed #e0e0e0;
}

.dark-theme .history-item {
  border-bottom-color: #3c3c3c;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item.completed .history-status {
  color: #4caf50;
}

.history-item.error .history-status {
  color: #f44336;
}

.history-item.cancelled .history-status {
  color: #ff9800;
}

.history-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.history-status {
  font-size: 11px;
}
</style>