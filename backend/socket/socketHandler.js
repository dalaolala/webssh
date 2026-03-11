const { Client } = require('ssh2');

// 存储活跃的SSH连接
const activeConnections = new Map();

// 清理连接的辅助函数
const cleanupConnection = (socketId) => {
  const connection = activeConnections.get(socketId);
  if (connection) {
    try {
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
  io.on('connection', (socket) => {
    console.log('快速连接用户连接:', socket.id);

    // 直接认证成功，无需登录
    socket.emit('authenticated', { success: true });

    // 快速连接（不保存服务器信息）
    socket.on('quick-connect', (connectionInfo) => {
      // 如果已有旧连接，先清理（防止重连时监听器叠加）
      cleanupConnection(socket.id);

      // 移除可能残留的旧 ssh-input / resize 监听器
      socket.removeAllListeners('ssh-input');
      socket.removeAllListeners('resize');

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

          stream.on('data', (data) => {
            socket.emit('ssh-data', data.toString());
          });

          socket.on('ssh-input', (input) => {
            stream.write(input);
          });

          socket.on('resize', (size) => {
            stream.setWindow(size.rows, size.cols, size.height, size.width);
          });

          stream.on('close', () => {
            socket.emit('ssh-closed');
            activeConnections.delete(socket.id);
            // 清理绑定在当前 stream 上的输入监听器
            socket.removeAllListeners('ssh-input');
            socket.removeAllListeners('resize');
          });

          socket.sshStream = stream;
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
  });

  // 全局错误处理
  io.on('error', (error) => {
    console.error('Socket.IO错误:', error);
  });
};

module.exports = socketHandler;