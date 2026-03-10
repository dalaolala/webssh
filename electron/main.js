const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow;
const DEFAULT_PORT = 3000;
let backendServer = null;
let currentBackendPort = null;

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 已有实例在运行，退出当前实例
  // 注意：不能在这里直接调用 dialog，因为 app 可能还未准备好
  console.log('WebSSH 应用已在运行中，退出当前实例...');
  
  // 使用延迟退出，确保应用完全退出
  process.nextTick(() => {
    app.quit();
    process.exit(0);
  });
}

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

// 检查应用是否已在运行（端口检测作为后备）
async function isAppAlreadyRunning() {
  // 检查默认端口是否被占用
  const defaultPortInUse = await isPortInUse(DEFAULT_PORT);
  if (defaultPortInUse) {
    // 检查是否是WebSSH后端（发送HTTP请求验证）
    try {
      const response = await new Promise((resolve) => {
        const http = require('http');
        const req = http.get(`http://localhost:${DEFAULT_PORT}/api/crypto/public-key`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => resolve(false));
      });
      return response;
    } catch (error) {
      return false;
    }
  }
  return false;
}

function getAvailablePort(startPort = DEFAULT_PORT, maxPort = 3100) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      if (port > maxPort) {
        resolve(null); // 没有找到可用端口
        return;
      }
      
      const server = net.createServer();
      server.once('error', () => {
        // 端口被占用，尝试下一个端口
        server.close();
        tryPort(port + 1);
      });
      
      server.once('listening', () => {
        // 端口可用
        server.close();
        resolve(port);
      });
      
      server.listen(port);
    };
    
    tryPort(startPort);
  });
}

function startBackend(port = 3000) {
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
    httpServer.listen(port, () => {
      console.log(`WebSSH server running on port ${port}`);
      currentBackendPort = port; // 保存当前端口
      resolve({ app, httpServer, io, port });
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

  // 检查端口是否被占用，并自动选择可用端口
  getAvailablePort().then(async (availablePort) => {
    if (availablePort) {
      // 启动后端服务器
      console.log('正在启动后端服务器...');
      backendServer = await startBackend(availablePort);

      // 等待后端完全启动
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 加载前端应用
      console.log('正在加载前端应用...');
      mainWindow.loadURL(`http://localhost:${availablePort}`);
    } else {
      // 没有找到可用端口，显示错误信息
      console.error('错误：没有找到可用的端口 (3000-3100)');
      const errorHtml = `
        <html>
          <head><title>端口错误</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #f56c6c;">启动失败</h1>
            <p>无法启动 WebSSH 应用，端口 3000-3100 都被占用。</p>
            <p>请关闭占用这些端口的应用程序后重试。</p>
            <button onclick="window.close()" style="padding: 10px 20px; background: #f56c6c; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
          </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
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

// IPC 处理程序
ipcMain.handle('get-backend-port', () => {
  return currentBackendPort || DEFAULT_PORT;
});

// 当第二个实例启动时，激活已有窗口
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // 有人尝试运行第二个实例，我们应该聚焦到已有窗口
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  // 如果单实例锁获取失败，显示对话框并退出
  if (!gotTheLock) {
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'WebSSH',
      message: 'WebSSH 应用已在运行中，请勿重复启动。',
      detail: '如果您需要启动新窗口，请在已运行的实例中打开新标签页。'
    });
    app.quit();
    return;
  }
  
  // 额外检查应用是否已在运行
  const alreadyRunning = await isAppAlreadyRunning();
  if (alreadyRunning) {
    // 双重确认，如果检测到应用在运行，仍然退出
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'WebSSH',
      message: '检测到 WebSSH 应用已在运行中，请勿重复启动。',
      detail: '如果您需要启动新窗口，请在已运行的实例中打开新标签页。'
    });
    app.quit();
    return;
  }
  
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
