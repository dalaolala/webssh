const { Client } = require('ssh2');

// 存储活跃的SSH连接
const activeConnections = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('快速连接用户连接:', socket.id);

    // 直接认证成功，无需登录
    socket.emit('authenticated', { success: true });

    // 快速连接（不保存服务器信息）
    socket.on('quick-connect', (connectionInfo) => {
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
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.conn.end();
        activeConnections.delete(socket.id);
      }
    });

    // 处理连接断开
    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.conn.end();
        activeConnections.delete(socket.id);
      }
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