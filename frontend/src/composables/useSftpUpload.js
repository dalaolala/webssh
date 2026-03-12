/**
 * SFTP 文件上传 Composable
 * 通过 WebSocket 实现本地文件上传到远程服务器，支持实时进度显示
 */
import { ref, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

/**
 * 使用 SFTP 上传功能
 * @returns {Object} 上传相关的状态和方法
 */
export function useSftpUpload() {
  // Socket 连接
  let socket = null

  // 上传状态
  const isUploading = ref(false)
  const uploadProgress = ref(0) // 0-100
  const uploadLoaded = ref(0)   // 已上传字节数
  const uploadTotal = ref(0)    // 总字节数
  const uploadFileName = ref('')
  const uploadError = ref(null)
  const currentUploadId = ref(null)

  // 上传历史记录
  const uploadHistory = ref([])

  /**
   * 初始化 Socket 连接
   */
  const initSocket = () => {
    if (socket && socket.connected) {
      return socket
    }

    socket = io()

    // 监听上传开始
    socket.on('sftp-upload-started', (data) => {
      const { uploadId, localPath, remotePath, fileSize, fileName } = data
      currentUploadId.value = uploadId
      uploadFileName.value = fileName
      uploadTotal.value = fileSize
      uploadLoaded.value = 0
      uploadProgress.value = 0
      uploadError.value = null
      isUploading.value = true

      // 添加到历史记录
      uploadHistory.value.unshift({
        uploadId,
        fileName,
        localPath,
        remotePath,
        fileSize,
        status: 'uploading',
        progress: 0,
        startTime: Date.now()
      })
    })

    // 监听上传进度
    socket.on('sftp-upload-progress', (data) => {
      const { uploadId, loaded, total, percent } = data
      if (uploadId === currentUploadId.value) {
        uploadLoaded.value = loaded
        uploadTotal.value = total
        uploadProgress.value = percent

        // 更新历史记录
        const historyItem = uploadHistory.value.find(h => h.uploadId === uploadId)
        if (historyItem) {
          historyItem.progress = percent
          historyItem.loaded = loaded
        }
      }
    })

    // 监听上传完成
    socket.on('sftp-upload-complete', (data) => {
      const { uploadId, success, localPath, remotePath } = data
      if (uploadId === currentUploadId.value) {
        isUploading.value = false
        uploadProgress.value = 100

        // 更新历史记录
        const historyItem = uploadHistory.value.find(h => h.uploadId === uploadId)
        if (historyItem) {
          historyItem.status = 'completed'
          historyItem.progress = 100
          historyItem.endTime = Date.now()
        }
      }
    })

    // 监听上传错误
    socket.on('sftp-upload-error', (data) => {
      const { uploadId, error } = data
      isUploading.value = false
      uploadError.value = error

      // 更新历史记录
      const historyItem = uploadHistory.value.find(h => h.uploadId === uploadId)
      if (historyItem) {
        historyItem.status = 'error'
        historyItem.error = error
        historyItem.endTime = Date.now()
      }
    })

    // 监听上传取消
    socket.on('sftp-upload-cancelled', (data) => {
      const { uploadId } = data
      isUploading.value = false
      uploadProgress.value = 0

      // 更新历史记录
      const historyItem = uploadHistory.value.find(h => h.uploadId === uploadId)
      if (historyItem) {
        historyItem.status = 'cancelled'
        historyItem.endTime = Date.now()
      }
    })

    return socket
  }

  /**
   * 开始上传本地文件到远程服务器
   * @param {string} sessionId - SFTP 会话 ID
   * @param {string} localPath - 本地文件绝对路径
   * @param {string} remotePath - 远程目标路径
   * @returns {Promise<void>}
   */
  const startUpload = async (sessionId, localPath, remotePath) => {
    return new Promise((resolve, reject) => {
      // 确保 socket 已连接
      const sock = initSocket()

      if (!sock || !sock.connected) {
        sock.on('connect', () => {
          sock.emit('sftp-upload-start', {
            sessionId,
            localPath,
            remotePath
          })
          resolve()
        })

        sock.on('connect_error', (err) => {
          reject(new Error('WebSocket 连接失败: ' + err.message))
        })
      } else {
        sock.emit('sftp-upload-start', {
          sessionId,
          localPath,
          remotePath
        })
        resolve()
      }
    })
  }

  /**
   * 取消当前上传
   */
  const cancelUpload = () => {
    if (socket && currentUploadId.value) {
      socket.emit('sftp-upload-cancel', {
        uploadId: currentUploadId.value
      })
    }
  }

  /**
   * 重置上传状态
   */
  const resetUpload = () => {
    isUploading.value = false
    uploadProgress.value = 0
    uploadLoaded.value = 0
    uploadTotal.value = 0
    uploadFileName.value = ''
    uploadError.value = null
    currentUploadId.value = null
  }

  /**
   * 清除上传历史
   */
  const clearHistory = () => {
    uploadHistory.value = []
  }

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 组件卸载时断开 socket 连接
  onUnmounted(() => {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  })

  return {
    // 状态
    isUploading,
    uploadProgress,
    uploadLoaded,
    uploadTotal,
    uploadFileName,
    uploadError,
    uploadHistory,

    // 方法
    startUpload,
    cancelUpload,
    resetUpload,
    clearHistory,
    formatFileSize
  }
}