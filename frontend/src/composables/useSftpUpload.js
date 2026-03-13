/**
 * SFTP 文件上传 Composable
 * 通过 WebSocket 实现本地文件上传到远程服务器，支持多文件并行上传和实时进度显示
 */
import { ref, computed, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

/**
 * 使用 SFTP 上传功能
 * @returns {Object} 上传相关的状态和方法
 */
export function useSftpUpload() {
  // Socket 连接
  let socket = null

  // 上传任务列表（支持多文件并行上传）
  const uploadTasks = ref([])

  // 计算属性：是否有任务正在上传
  const isUploading = computed(() => {
    return uploadTasks.value.some(task => task.status === 'uploading')
  })

  // 计算属性：正在上传的任务数量
  const uploadingCount = computed(() => {
    return uploadTasks.value.filter(task => task.status === 'uploading').length
  })

  // 计算属性：总进度（所有任务的平均进度）
  const totalProgress = computed(() => {
    const tasks = uploadTasks.value.filter(t => t.status !== 'pending')
    if (tasks.length === 0) return 0
    const total = tasks.reduce((sum, t) => sum + (t.progress || 0), 0)
    return Math.round(total / tasks.length)
  })

  // 计算属性：是否所有任务都已完成（完成或取消）
  const allTasksFinished = computed(() => {
    if (uploadTasks.value.length === 0) return false
    return uploadTasks.value.every(t =>
      t.status === 'completed' || t.status === 'cancelled' || t.status === 'error'
    )
  })

  // 计算属性：是否所有任务都成功完成
  const allTasksCompleted = computed(() => {
    if (uploadTasks.value.length === 0) return false
    return uploadTasks.value.every(t => t.status === 'completed')
  })

  // 计算属性：是否所有任务都被取消
  const allTasksCancelled = computed(() => {
    if (uploadTasks.value.length === 0) return false
    return uploadTasks.value.every(t => t.status === 'cancelled')
  })

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
      const { uploadId, localPath, remotePath, fileSize, fileName, startPosition = 0, isResuming = false } = data

      // 通过 localPath 匹配任务（因为前端使用临时 ID，后端使用不同的 ID）
      const task = uploadTasks.value.find(t => t.localPath === localPath && t.status === 'pending')
      if (task) {
        // 更新为后端返回的真实 uploadId
        task.uploadId = uploadId
        task.status = 'uploading'
        task.fileName = fileName
        task.localPath = localPath
        task.remotePath = remotePath
        task.fileSize = fileSize
        task.progress = startPosition > 0 ? Math.floor((startPosition / fileSize) * 100) : 0
        task.loaded = startPosition
        task.total = fileSize
        task.startTime = Date.now()
        task.isResuming = isResuming // 是否为断点续传
      }
    })

    // 监听上传进度
    socket.on('sftp-upload-progress', (data) => {
      const { uploadId, loaded, total, percent } = data
      
      const task = uploadTasks.value.find(t => t.uploadId === uploadId)
      if (task) {
        task.loaded = loaded
        task.total = total
        task.progress = percent
      }
    })

    // 监听上传完成
    socket.on('sftp-upload-complete', (data) => {
      const { uploadId } = data
      
      const task = uploadTasks.value.find(t => t.uploadId === uploadId)
      if (task) {
        task.status = 'completed'
        task.progress = 100
        task.endTime = Date.now()
      }
    })

    // 监听上传错误
    socket.on('sftp-upload-error', (data) => {
      const { uploadId, localPath, error } = data

      // 先尝试通过 uploadId 匹配
      let task = uploadTasks.value.find(t => t.uploadId === uploadId)

      // 如果找不到，尝试通过 localPath 匹配（处理文件夹上传等场景）
      if (!task && localPath) {
        task = uploadTasks.value.find(t => t.localPath === localPath && t.status === 'pending')
      }

      if (task) {
        task.status = 'error'
        task.error = error
        task.endTime = Date.now()
      }
    })

    // 监听上传取消
    socket.on('sftp-upload-cancelled', (data) => {
      const { uploadId } = data

      const task = uploadTasks.value.find(t => t.uploadId === uploadId)
      if (task) {
        task.status = 'cancelled'
        task.endTime = Date.now()
      }
    })

    // 监听上传冲突（文件已存在）
    socket.on('sftp-upload-conflict', (data) => {
      const { uploadId, localPath, remotePath, localSize, remoteSize, fileName } = data

      const task = uploadTasks.value.find(t => t.uploadId === uploadId || t.localPath === localPath)
      if (task) {
        task.status = 'conflict'
        task.conflictInfo = {
          localSize,
          remoteSize,
          fileName,
          remotePath
        }
        task.endTime = Date.now()
      }
    })

    return socket
  }

  /**
   * 添加上传任务
   * @param {string} sessionId - SFTP 会话 ID
   * @param {string} localPath - 本地文件绝对路径
   * @param {string} remotePath - 远程目标路径
   * @returns {string} uploadId
   */
  const addUploadTask = (sessionId, localPath, remotePath) => {
    const sock = initSocket()
    
    // 生成临时 uploadId（后端会返回正式的）
    const tempUploadId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    const fileName = localPath.split(/[/\\]/).pop()

    // 创建任务
    const task = {
      uploadId: tempUploadId,
      fileName,
      localPath,
      remotePath,
      status: 'pending',
      progress: 0,
      loaded: 0,
      total: 0,
      fileSize: 0,
      startTime: null,
      endTime: null,
      error: null
    }

    uploadTasks.value.push(task)

    // 发送上传请求
    if (sock && sock.connected) {
      sock.emit('sftp-upload-start', {
        sessionId,
        localPath,
        remotePath
      })
    } else {
      sock.on('connect', () => {
        sock.emit('sftp-upload-start', {
          sessionId,
          localPath,
          remotePath
        })
      })
    }

    return tempUploadId
  }

  /**
   * 批量添加上传任务
   * @param {string} sessionId - SFTP 会话 ID
   * @param {Array} files - 文件列表 [{ localPath, remotePath }, ...]
   */
  const addUploadTasks = (sessionId, files) => {
    const uploadIds = []
    for (const file of files) {
      const uploadId = addUploadTask(sessionId, file.localPath, file.remotePath)
      uploadIds.push(uploadId)
    }
    return uploadIds
  }

  /**
   * 取消指定上传任务
   * @param {string} uploadId
   */
  const cancelUpload = (uploadId) => {
    if (socket) {
      // 同时发送 uploadId 和 localPath，确保后端能找到任务
      const task = uploadTasks.value.find(t => t.uploadId === uploadId)
      socket.emit('sftp-upload-cancel', {
        uploadId,
        localPath: task?.localPath
      })
    }
  }

  /**
   * 确认覆盖已存在的文件
   * @param {string} sessionId - SFTP 会话 ID
   * @param {string} localPath - 本地文件路径
   * @param {string} remotePath - 远程目标路径
   */
  const confirmOverwrite = (sessionId, localPath, remotePath) => {
    if (socket && socket.connected) {
      // 找到对应的任务并重置状态
      const task = uploadTasks.value.find(t => t.localPath === localPath && t.status === 'conflict')
      if (task) {
        task.status = 'pending'
        task.startTime = null
        task.endTime = null
      }

      socket.emit('sftp-upload-confirm-overwrite', {
        sessionId,
        localPath,
        remotePath
      })
    }
  }

  /**
   * 取消冲突任务（用户选择不覆盖）
   * @param {string} uploadId
   */
  const cancelConflict = (uploadId) => {
    const task = uploadTasks.value.find(t => t.uploadId === uploadId)
    if (task && task.status === 'conflict') {
      task.status = 'cancelled'
      task.endTime = Date.now()
    }
  }

  /**
   * 取消所有正在上传的任务
   */
  const cancelAllUploads = () => {
    // 取消正在上传的任务
    uploadTasks.value
      .filter(t => t.status === 'uploading')
      .forEach(t => cancelUpload(t.uploadId))

    // 取消 pending 状态的任务（通知后端取消，并标记前端状态）
    uploadTasks.value
      .filter(t => t.status === 'pending')
      .forEach(t => {
        // 通知后端取消（通过 localPath）
        if (socket) {
          socket.emit('sftp-upload-cancel', { localPath: t.localPath })
        }
        t.status = 'cancelled'
        t.endTime = Date.now()
      })
  }

  /**
   * 移除已完成的任务（包括 completed、cancelled、error 状态）
   */
  const clearCompletedTasks = () => {
    uploadTasks.value = uploadTasks.value.filter(
      t => t.status === 'uploading' || t.status === 'pending'
    )
  }

  /**
   * 清空所有已完成的任务
   */
  const clearAllFinishedTasks = () => {
    uploadTasks.value = uploadTasks.value.filter(
      t => t.status === 'uploading' || t.status === 'pending'
    )
  }

  /**
   * 清空所有任务
   */
  const clearAllTasks = () => {
    // 先取消所有正在上传的任务
    cancelAllUploads()
    uploadTasks.value = []
  }

  /**
   * 移除指定任务
   * @param {string} uploadId
   */
  const removeTask = (uploadId) => {
    const task = uploadTasks.value.find(t => t.uploadId === uploadId)
    if (task && task.status === 'uploading') {
      cancelUpload(uploadId)
    }
    uploadTasks.value = uploadTasks.value.filter(t => t.uploadId !== uploadId)
  }

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 获取任务状态文本
   */
  const getStatusText = (task) => {
    // 如果传入的是字符串（向后兼容）
    if (typeof task === 'string') {
      const map = {
        pending: '等待中',
        uploading: '上传中',
        completed: '已完成',
        error: '失败',
        cancelled: '已取消',
        conflict: '文件冲突'
      }
      return map[task] || task
    }

    // 传入的是任务对象
    const map = {
      pending: '等待中',
      uploading: task?.isResuming ? '续传中' : '上传中',
      completed: '已完成',
      error: '失败',
      cancelled: '已取消',
      conflict: '文件冲突'
    }
    return map[task?.status] || task?.status
  }

  // 组件卸载时断开 socket 连接
  onUnmounted(() => {
    if (socket) {
      // 移除所有事件监听器，避免内存泄漏
      socket.off('sftp-upload-started')
      socket.off('sftp-upload-progress')
      socket.off('sftp-upload-complete')
      socket.off('sftp-upload-error')
      socket.off('sftp-upload-cancelled')
      socket.off('sftp-upload-conflict')
      socket.disconnect()
      socket = null
    }
  })

  return {
    // 状态
    uploadTasks,
    isUploading,
    uploadingCount,
    totalProgress,
    allTasksFinished,
    allTasksCompleted,
    allTasksCancelled,

    // 方法
    addUploadTask,
    addUploadTasks,
    cancelUpload,
    confirmOverwrite,
    cancelConflict,
    cancelAllUploads,
    clearCompletedTasks,
    clearAllFinishedTasks,
    clearAllTasks,
    removeTask,
    formatFileSize,
    getStatusText
  }
}