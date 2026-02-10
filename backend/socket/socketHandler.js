const { Client } = require('ssh2');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const encryptionService = require('../utils/encryption');

// 存储活跃的SSH连接
const activeConnections = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    // 验证用户身份
    socket.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'webssh-secret-key');
        socket.userId = decoded.userId;
        socket.emit('authenticated', { success: true });
        console.log('用户认证成功:', decoded.userId);
      } catch (error) {
        socket.emit('authenticated', { success: false, error: '认证失败' });
        socket.disconnect();
      }
    });

    // 建立SSH连接
    socket.on('connect-ssh', async (serverId) => {
      if (!socket.userId) {
        socket.emit('ssh-error', { error: '未认证' });
        return;
      }

      try {
        // 获取服务器信息和认证信息
        const [servers] = await db.pool.execute(
          `SELECT id, name, host, port, username, password_encrypted, 
                  private_key_encrypted, auth_type 
           FROM servers WHERE id = ? AND user_id = ?`,
          [serverId, socket.userId]
        );

        if (servers.length === 0) {
          socket.emit('ssh-error', { error: '服务器不存在' });
          return;
        }

        const server = servers[0];
        
        // 解密认证信息
        let credentials = {};
        if (server.auth_type === 'password' && server.password_encrypted) {
          credentials.password = encryptionService.decryptPassword(
            server.password_encrypted, 
            socket.userId
          );
        } else if (server.auth_type === 'key' && server.private_key_encrypted) {
          credentials.privateKey = encryptionService.decryptPrivateKey(
            server.private_key_encrypted, 
            socket.userId
          );
        }

        // 创建SSH连接
        const conn = new Client();
        
        conn.on('ready', () => {
          console.log('SSH连接已建立:', server.host);
          socket.emit('ssh-connected');
          
          // 存储连接
          activeConnections.set(socket.id, {
            conn,
            serverId: server.id,
            userId: socket.userId
          });

          // 创建shell会话
          conn.shell({}, (err, stream) => {
            if (err) {
              socket.emit('ssh-error', { error: err.message });
              return;
            }

            // 转发终端输出到前端
            stream.on('data', (data) => {
              socket.emit('ssh-data', data.toString());
            });

            // 处理来自前端的输入
            socket.on('ssh-input', (input) => {
              stream.write(input);
            });

            // 处理窗口大小调整
            socket.on('resize', (size) => {
              stream.setWindow(size.rows, size.cols, size.height, size.width);
            });

            // 处理连接关闭
            stream.on('close', () => {
              socket.emit('ssh-closed');
              activeConnections.delete(socket.id);
            });

            socket.sshStream = stream;
          });
        });

        conn.on('error', (err) => {
          console.error('SSH连接错误:', err.message);
          socket.emit('ssh-error', { error: err.message });
        });

        conn.on('close', () => {
          console.log('SSH连接已关闭:', server.host);
          socket.emit('ssh-closed');
          activeConnections.delete(socket.id);
        });

        // 连接配置
        const connConfig = {
          host: server.host,
          port: server.port || 22,
          username: server.username,
          readyTimeout: 20000,
          keepaliveInterval: 30000
        };

        // 添加认证信息
        if (server.auth_type === 'password') {
          connConfig.password = credentials.password;
        } else if (server.auth_type === 'key') {
          connConfig.privateKey = credentials.privateKey;
        }

        // 开始连接
        conn.connect(connConfig);

      } catch (error) {
        console.error('SSH连接准备错误:', error);
        socket.emit('ssh-error', { error: '连接失败' });
      }
    });

    // 快速连接（不保存服务器信息）
    socket.on('quick-connect', (connectionInfo) => {
      if (!socket.userId) {
        socket.emit('ssh-error', { error: '未认证' });
        return;
      }

      const { host, port, username, password, privateKey } = connectionInfo;

      const conn = new Client();
      
      conn.on('ready', () => {
        console.log('快速SSH连接已建立:', host);
        socket.emit('ssh-connected');
        
        // 存储连接
        activeConnections.set(socket.id, {
          conn,
          quickConnect: true,
          userId: socket.userId
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