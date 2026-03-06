const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Socket handlers
const socketHandler = require('./socket/socketHandler');

// Crypto utilities
const { getPublicKey, createCryptoMiddleware } = require('./utils/crypto');

// SFTP routes
const sftpQuickSimpleRouter = require('./routes/sftp-quick-simple');

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 加密API路由
app.get('/api/crypto/public-key', (req, res) => {
  try {
    const publicKey = getPublicKey();
    res.json({ success: true, publicKey });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取公钥失败' });
  }
});

// SFTP快速连接API路由（无认证版本）
app.use('/api/sftp/quick', sftpQuickSimpleRouter);

// 快速连接API路由
app.post('/api/quick-connect', (req, res) => {
  // 直接返回成功响应，因为认证逻辑已移除
  res.json({ success: true, message: '快速连接已启用' });
});

// Socket.io connection handling
socketHandler(io);

// Serve frontend for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

console.log('WebSSH快速连接服务器已启动 - 无需数据库连接');

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`WebSSH server running on port ${PORT}`);
});