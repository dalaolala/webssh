<template>
  <div class="sftp-page">
    <el-container class="sftp-container" v-loading="quickSftp.loading.value" element-loading-text="正在连接 SFTP...">
      <!-- 顶部连接状态和操作栏 -->
      <el-header height="48px" class="sftp-header">
        <div class="header-left">
          <el-icon class="header-icon"><Folder /></el-icon>
          <span class="header-title">文件管理器 
            <span class="server-info" v-if="connectionDisplay">({{ connectionDisplay }})</span>
          </span>
          <el-tag 
            size="small" 
            :type="quickSftp.isConnected.value ? 'success' : 'info'"
            class="status-tag"
          >
            {{ quickSftp.isConnected.value ? '已连接' : '未连接' }}
          </el-tag>
        </div>
        
        <div class="header-right">
          <el-button 
            v-if="!quickSftp.isConnected.value" 
            type="primary" 
            size="small" 
            @click="connectSftp"
            :loading="quickSftp.loading.value"
          >
            <el-icon><Connection /></el-icon>
            重试连接
          </el-button>
          
          <el-button 
            v-else
            type="danger" 
            size="small" 
            @click="disconnectSftp"
          >
            <el-icon><Close /></el-icon>
            断开连接
          </el-button>
        </div>
      </el-header>

      <!-- 主要内容区：包含文件管理器组件 -->
      <el-main class="sftp-main">
        <!-- 未连接时的提示或错误信息 -->
        <div v-if="error" class="error-container">
          <el-alert 
            :title="`连接失败: ${error}`" 
            type="error" 
            show-icon 
            :closable="false"
          >
            <template #default>
              <div class="error-actions">
                <el-button size="small" type="primary" @click="connectSftp">重新连接</el-button>
                <el-button size="small" @click="goBack">返回上页</el-button>
              </div>
            </template>
          </el-alert>
        </div>
        
        <div v-else-if="!quickSftp.isConnected.value && !quickSftp.loading.value" class="waiting-container">
          <el-empty description="暂未连接 SFTP" :image-size="100">
            <template #default>
              <p class="empty-tip">点击右上角的"重试连接"按钮以尝试连接服务器</p>
            </template>
          </el-empty>
        </div>

        <!-- 成功连接后显示文件管理器组件 -->
        <div v-else-if="quickSftp.isConnected.value" class="file-manager-wrapper">
          <QuickSftpFileManager :sftp="quickSftp" />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Folder, Connection, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useQuickSftp } from '@/composables/useQuickSftp'
import QuickSftpFileManager from '@/components/QuickSftpFileManager.vue'

const props = defineProps({
  tabId: {
    type: String,
    required: true
  },
  connectionInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const quickSftp = useQuickSftp()
const error = ref('')

// 显示格式化：用户名@主机:端口
const connectionDisplay = computed(() => {
  const conn = props.connectionInfo
  if (conn) {
    return `${conn.username || ''}@${conn.host || ''}:${conn.port || 22}`
  }
  return ''
})

// 执行连接
const connectSftp = async () => {
  error.value = ''
  try {
    const success = await quickSftp.connectSftp({
      host: props.connectionInfo.host,
      port: props.connectionInfo.port,
      username: props.connectionInfo.username,
      password: props.connectionInfo.password,
      privateKey: props.connectionInfo.privateKey
    })
    
    if (success) {
      ElMessage.success('SFTP 连接成功')
    } else {
      error.value = quickSftp.error.value || '未知连接错误'
    }
  } catch (err) {
    error.value = err.message || '连接异常'
    ElMessage.error('SFTP 连接失败: ' + error.value)
  }
}

// 断开连接
const disconnectSftp = async () => {
  try {
    await quickSftp.disconnectSftp()
    ElMessage.success('已断开 SFTP 连接')
  } catch (err) {
    console.error('断开连接发生错误:', err)
  }
}

// 返回/关闭Tab
const goBack = () => {
  emit('close')
}

// 挂载时尝试连接
onMounted(() => {
  if (props.connectionInfo) {
    connectSftp()
  }
})

// 卸载时清理连接
onUnmounted(() => {
  if (quickSftp.isConnected.value) {
    quickSftp.disconnectSftp()
  }
})
</script>

<style scoped>
.sftp-page {
  height: 100%;
  width: 100%;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.sftp-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sftp-header {
  background-color: #ffffff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: #409eff;
}

.header-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.server-info {
  font-weight: normal;
  color: #606266;
  margin-left: 4px;
}

.status-tag {
  margin-left: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sftp-main {
  flex: 1;
  padding: 16px;
  overflow: hidden; /* 防止外层滚动，由内层FileManager处理滚动 */
  display: flex;
  flex-direction: column;
}

.error-container, .waiting-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.error-container {
  align-items: flex-start;
  padding-top: 40px;
}

.error-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.empty-tip {
  color: #909399;
  font-size: 13px;
  margin-top: -10px;
}

.file-manager-wrapper {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

/* 确保内部 FileManager 组件能够充满容器 */
:deep(.sftp-file-manager) {
  height: 100%;
  flex: 1;
}
</style>
