const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow;
const PORT = 3000;
let backendServer = null;

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

function startBackend() {
  const express = require('express');
  const { createServer } = require('http');
  const { Server } = require('socket.io');
  const cors = require('cors');
  const dotenv = require('dotenv');

  // 加载后端模块
  const socketHandler = require('../backend/socket/socketHandler');
  const { getPublicKey } = require('../backend/utils/crypto');
  const sftpQuickSimpleRouter = require('../backend/routes/sftp-quick-simple');
  const webdavRouter = require('../backend/routes/webdav');

  // 加载环境变量
  dotenv.config();

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // 确定前端静态文件路径
  const frontendDistPath = path.join(__dirname, '../frontend/dist');

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static(frontendDistPath));

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

  // WebDAV同步API路由
  app.use('/api/webdav', webdavRouter);

  // 快速连接API路由
  app.post('/api/quick-connect', (req, res) => {
    res.json({ success: true, message: '快速连接已启用' });
  });

  // Socket.io connection handling
  socketHandler(io);

  // Serve frontend for production
  app.use(express.static(frontendDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  console.log('WebSSH快速连接服务器已启动');

  return new Promise((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`WebSSH server running on port ${PORT}`);
      resolve({ app, httpServer, io });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 隐藏菜单栏
  Menu.setApplicationMenu(null);

  // 检查端口是否被占用
  isPortInUse(PORT).then(async (inUse) => {
    if (!inUse) {
      // 启动后端服务器
      console.log('正在启动后端服务器...');
      backendServer = await startBackend();

      // 等待后端完全启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 加载前端应用
    console.log('正在加载前端应用...');
    mainWindow.loadURL(`http://localhost:${PORT}`);
  });

  mainWindow.on('closed', () => {
    // 关闭窗口时关闭后端服务器
    if (backendServer && backendServer.httpServer) {
      backendServer.httpServer.close();
    }
  });

  // 拦截所有非 localhost 的导航和新窗口，用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost`) && !url.startsWith(`https://localhost`)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost`) && !url.startsWith(`https://localhost`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendServer && backendServer.httpServer) {
    backendServer.httpServer.close();
  }
});
