const { Client } = require('ssh2');
const fs = require('fs');

// 存储活跃的SSH连接
const activeConnections = new Map();

// 存储活跃的SFTP上传任务（用于取消上传）
const activeUploads = new Map();

// 清理连接的辅助函数
const cleanupConnection = (socketId) => {
  const connection = activeConnections.get(socketId);
  if (connection) {
    try {
      // 移除 socket 事件监听器
      if (connection.sshInputHandler && global.ioSockets) {
        const socket = global.ioSockets.get(socketId);
        if (socket) {
          socket.off('ssh-input', connection.sshInputHandler);
          socket.off('resize', connection.resizeHandler);
        }
      }
      
      // 关闭 SSH 连接
      if (connection.conn) {
        connection.conn.end();
      }
    } catch (error) {
      console.error('清理连接时出错:', error);
    }
    activeConnections.delete(socketId);
  }
};

const socketHandler = (io) => {
  // 存储全局 Socket 引用，用于清理时访问
  global.ioSockets = new Map();
  
  io.on('connection', (socket) => {
    console.log('快速连接用户连接:', socket.id);
    global.ioSockets.set(socket.id, socket);

    // 直接认证成功，无需登录
    socket.emit('authenticated', { success: true });

    // 快速连接（不保存服务器信息）
    socket.on('quick-connect', (connectionInfo) => {
      // 如果已有旧连接，先清理（防止重连时监听器叠加）
      cleanupConnection(socket.id);

      const { host, port, username, password, privateKey } = connectionInfo;

      const conn = new Client();
      
      conn.on('ready', () => {
        console.log('快速SSH连接已建立:', host);
        socket.emit('ssh-connected');
        
        // 存储连接
        activeConnections.set(socket.id, {
          conn,
          quickConnect: true
        });

        // 创建shell会话
        conn.shell({}, (err, stream) => {
          if (err) {
            socket.emit('ssh-error', { error: err.message });
            return;
          }

          // 创建监听器并保存引用
          const sshInputHandler = (input) => {
            stream.write(input);
          };

          const resizeHandler = (size) => {
            stream.setWindow(size.rows, size.cols, size.height, size.width);
          };

          stream.on('data', (data) => {
            socket.emit('ssh-data', data.toString());
          });

          // 注册监听器
          socket.on('ssh-input', sshInputHandler);
          socket.on('resize', resizeHandler);

          stream.on('close', () => {
            socket.emit('ssh-closed');
            
            // 移除监听器
            socket.off('ssh-input', sshInputHandler);
            socket.off('resize', resizeHandler);
            
            // 清理连接
            activeConnections.delete(socket.id);
          });

          socket.sshStream = stream;
          
          // 保存监听器引用到连接对象
          const connection = activeConnections.get(socket.id);
          if (connection) {
            connection.sshInputHandler = sshInputHandler;
            connection.resizeHandler = resizeHandler;
          }
        });
      });

      conn.on('error', (err) => {
        console.error('快速SSH连接错误:', err.message);
        socket.emit('ssh-error', { error: err.message });
      });

      conn.on('close', () => {
        console.log('快速SSH连接已关闭:', host);
        socket.emit('ssh-closed');
        activeConnections.delete(socket.id);
      });

      // 连接配置
      const connConfig = {
        host,
        port: port || 22,
        username,
        readyTimeout: 20000,
        keepaliveInterval: 30000
      };

      if (password) {
        connConfig.password = password;
      } else if (privateKey) {
        connConfig.privateKey = privateKey;
      }

      conn.connect(connConfig);
    });

    // 发送命令到终端
    socket.on('send-command', (command) => {
      if (socket.sshStream) {
        socket.sshStream.write(command + '\n');
      }
    });

    // 断开SSH连接
    socket.on('disconnect-ssh', () => {
      cleanupConnection(socket.id);
    });

    // 处理连接断开
    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);
      cleanupConnection(socket.id);
      global.ioSockets.delete(socket.id);
    });

    // 处理错误
    socket.on('error', (error) => {
      console.error('Socket错误:', socket.id, error);
      cleanupConnection(socket.id);
    });

    // 心跳检测
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // ==================== SFTP 文件上传（本地文件 -> 远程服务器）====================
    
    /**
     * 开始 SFTP 文件上传
     * 数据格式: { sessionId, localPath, remotePath }
     * - sessionId: SFTP 会话 ID（来自 HTTP API 连接）
     * - localPath: 本地文件绝对路径
     * - remotePath: 远程目标路径
     */
    socket.on('sftp-upload-start', async (data) => {
      const { sessionId, localPath, remotePath } = data;
      const uploadId = `${socket.id}-${Date.now()}`;

      try {
        // 验证参数
        if (!sessionId || !localPath || !remotePath) {
          socket.emit('sftp-upload-error', {
            uploadId,
            error: '缺少必要参数：sessionId, localPath, remotePath'
          });
          return;
        }

        // 验证本地文件存在
        if (!fs.existsSync(localPath)) {
          socket.emit('sftp-upload-error', {
            uploadId,
            error: `本地文件不存在: ${localPath}`
          });
          return;
        }

        // 获取本地文件信息
        const stats = fs.statSync(localPath);
        if (!stats.isFile()) {
          socket.emit('sftp-upload-error', {
            uploadId,
            error: `不是有效的文件: ${localPath}`
          });
          return;
        }

        // 从全局 SFTP 连接池获取连接
        const sftpConnections = require('../routes/sftp-quick-simple').getSftpConnections();
        if (!sftpConnections || !sftpConnections.has(sessionId)) {
          socket.emit('sftp-upload-error', {
            uploadId,
            error: 'SFTP 会话不存在或已过期，请重新连接'
          });
          return;
        }

        const connectionEntry = sftpConnections.get(sessionId);
        const sftpHandler = connectionEntry.handler;

        if (!sftpHandler || !sftpHandler.isConnected) {
          socket.emit('sftp-upload-error', {
            uploadId,
            error: 'SFTP 连接已断开，请重新连接'
          });
          return;
        }

        // 发送上传开始事件
        socket.emit('sftp-upload-started', {
          uploadId,
          localPath,
          remotePath,
          fileSize: stats.size,
          fileName: localPath.split(/[/\\]/).pop()
        });

        // 存储上传任务（用于取消）
        const uploadContext = { cancelled: false };
        activeUploads.set(uploadId, uploadContext);

        // 执行流式上传（带进度回调）
        await sftpHandler.uploadFileWithProgress(localPath, remotePath, (progress) => {
          // 检查是否已取消，返回 false 终止上传
          if (uploadContext.cancelled) {
            return false;
          }

          // 推送进度事件
          socket.emit('sftp-upload-progress', {
            uploadId,
            loaded: progress.loaded,
            total: progress.total,
            percent: progress.percent
          });

          return true;
        });

        // 上传完成
        activeUploads.delete(uploadId);
        socket.emit('sftp-upload-complete', {
          uploadId,
          success: true,
          localPath,
          remotePath
        });

      } catch (error) {
        activeUploads.delete(uploadId);
        
        // 如果是用户主动取消，发送取消事件而非错误
        if (error.message === '上传已取消') {
          socket.emit('sftp-upload-cancelled', { uploadId });
        } else {
          console.error('SFTP 上传错误:', error);
          socket.emit('sftp-upload-error', {
            uploadId,
            error: error.message || '上传失败'
          });
        }
      }
    });

    /**
     * 取消 SFTP 文件上传
     * 数据格式: { uploadId }
     */
    socket.on('sftp-upload-cancel', (data) => {
      const { uploadId } = data;

      if (activeUploads.has(uploadId)) {
        const uploadContext = activeUploads.get(uploadId);
        uploadContext.cancelled = true;
        activeUploads.delete(uploadId);

        socket.emit('sftp-upload-cancelled', { uploadId });
      }
    });
  });

  // 全局错误处理
  io.on('error', (error) => {
    console.error('Socket.IO错误:', error);
  });
};

module.exports = socketHandler;