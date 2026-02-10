const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const SftpHandler = require('../utils/sftpHandler');
const { authenticateToken } = require('../middleware/auth');
const { getServerById } = require('../utils/database');
const encryptionService = require('../utils/encryption');

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB限制
  }
});

// 存储活跃的SFTP连接
const sftpConnections = new Map();

// 获取SFTP连接
async function getSftpConnection(userId, serverId) {
  const key = `${userId}-${serverId}`;
  
  if (sftpConnections.has(key)) {
    const connection = sftpConnections.get(key);
    if (connection.isConnected) {
      return connection;
    }
    sftpConnections.delete(key);
  }

  // 获取服务器配置
  const server = await getServerById(serverId);
  if (!server || server.user_id !== userId) {
    throw new Error('服务器不存在或无权访问');
  }

  // 解密敏感信息
  const serverConfig = {
    host: server.host,
    port: server.port,
    username: server.username,
  };

  if (server.password_encrypted) {
    serverConfig.password = encryptionService.decryptPassword(
      server.password_encrypted,
      userId
    );
  }
  if (server.private_key_encrypted) {
    serverConfig.privateKey = encryptionService.decryptPrivateKey(
      server.private_key_encrypted,
      userId
    );
  };

  const sftpHandler = new SftpHandler(serverConfig);
  await sftpHandler.connect();
  
  sftpConnections.set(key, sftpHandler);
  
  // 设置定时器自动断开连接（10分钟无活动）
  setTimeout(() => {
    if (sftpConnections.has(key)) {
      sftpConnections.get(key).disconnect();
      sftpConnections.delete(key);
    }
  }, 10 * 60 * 1000);

  return sftpHandler;
}

// 连接SFTP
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.body;
    const userId = req.user.userId;

    console.log('SFTP连接请求 - 用户ID:', userId, '服务器ID:', serverId);

    const sftpHandler = await getSftpConnection(userId, serverId);
    
    // 获取根目录列表
    const files = await sftpHandler.listDirectory('.');
    
    res.json({
      success: true,
      message: 'SFTP连接成功',
      currentPath: '/',
      files: files
    });
  } catch (error) {
    console.error('SFTP连接错误:', error);
    res.status(500).json({
      success: false,
      message: 'SFTP连接失败: ' + error.message
    });
  }
});

// 断开SFTP连接
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.body;
    const userId = req.user.userId;
    const key = `${userId}-${serverId}`;

    if (sftpConnections.has(key)) {
      await sftpConnections.get(key).disconnect();
      sftpConnections.delete(key);
    }

    res.json({
      success: true,
      message: 'SFTP连接已断开'
    });
  } catch (error) {
    console.error('断开SFTP连接错误:', error);
    res.status(500).json({
      success: false,
      message: '断开连接失败: ' + error.message
    });
  }
});

// 列出目录内容
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { serverId, path = '.' } = req.query;
    const userId = req.user.userId;

    const sftpHandler = await getSftpConnection(userId, serverId);
    const files = await sftpHandler.listDirectory(path);
    
    res.json({
      success: true,
      currentPath: path,
      files: files
    });
  } catch (error) {
    console.error('列出目录错误:', error);
    res.status(500).json({
      success: false,
      message: '列出目录失败: ' + error.message
    });
  }
});

// 读取文件内容
router.get('/file', authenticateToken, async (req, res) => {
  try {
    const { serverId, path } = req.query;
    const userId = req.user.userId;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: '文件路径不能为空'
      });
    }

    const sftpHandler = await getSftpConnection(userId, serverId);
    const content = await sftpHandler.getFileContent(path);
    
    res.json({
      success: true,
      content: content,
      path: path
    });
  } catch (error) {
    console.error('读取文件错误:', error);
    res.status(500).json({
      success: false,
      message: '读取文件失败: ' + error.message
    });
  }
});

// 保存文件内容
router.post('/file', authenticateToken, async (req, res) => {
  try {
    const { serverId, path, content } = req.body;
    const userId = req.user.userId;

    if (!path || content === undefined) {
      return res.status(400).json({
        success: false,
        message: '文件路径和内容不能为空'
      });
    }

    const sftpHandler = await getSftpConnection(userId, serverId);
    
    // 创建临时文件保存内容，然后上传
    const fs = require('fs');
    const os = require('os');
    const pathModule = require('path');
    
    const tempPath = pathModule.join(os.tmpdir(), `sftp_edit_${Date.now()}.tmp`);
    fs.writeFileSync(tempPath, content, 'utf8');
    
    await sftpHandler.uploadFile(tempPath, path);
    fs.unlinkSync(tempPath);
    
    res.json({
      success: true,
      message: '文件保存成功'
    });
  } catch (error) {
    console.error('保存文件错误:', error);
    res.status(500).json({
      success: false,
      message: '保存文件失败: ' + error.message
    });
  }
});

// 创建目录
router.post('/mkdir', authenticateToken, async (req, res) => {
  try {
    const { serverId, path } = req.body;
    const userId = req.user.userId;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: '目录路径不能为空'
      });
    }

    const sftpHandler = await getSftpConnection(userId, serverId);
    await sftpHandler.createDirectory(path);
    
    res.json({
      success: true,
      message: '目录创建成功'
    });
  } catch (error) {
    console.error('创建目录错误:', error);
    res.status(500).json({
      success: false,
      message: '创建目录失败: ' + error.message
    });
  }
});

// 删除文件或目录
router.delete('/delete', authenticateToken, async (req, res) => {
  try {
    const { serverId, path, type } = req.body;
    const userId = req.user.userId;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: '路径不能为空'
      });
    }

    const sftpHandler = await getSftpConnection(userId, serverId);
    
    if (type === 'directory') {
      await sftpHandler.deleteDirectory(path);
    } else {
      await sftpHandler.deleteFile(path);
    }
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除错误:', error);
    res.status(500).json({
      success: false,
      message: '删除失败: ' + error.message
    });
  }
});

// 重命名文件或目录
router.post('/rename', authenticateToken, async (req, res) => {
  try {
    const { serverId, oldPath, newPath } = req.body;
    const userId = req.user.userId;

    if (!oldPath || !newPath) {
      return res.status(400).json({
        success: false,
        message: '原路径和新路径不能为空'
      });
    }

    const sftpHandler = await getSftpConnection(userId, serverId);
    await sftpHandler.renameFile(oldPath, newPath);
    
    res.json({
      success: true,
      message: '重命名成功'
    });
  } catch (error) {
    console.error('重命名错误:', error);
    res.status(500).json({
      success: false,
      message: '重命名失败: ' + error.message
    });
  }
});

// 文件上传
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { serverId, path: remotePath } = req.body;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有选择文件'
      });
    }

    if (!serverId || !remotePath) {
      // 清理临时文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: '服务器ID和路径不能为空'
      });
    }

    const sftpHandler = await getSftpConnection(userId, serverId);
    await sftpHandler.uploadFile(req.file.path, remotePath);

    // 清理临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: '文件上传成功',
      filename: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('文件上传错误:', error);
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: '文件上传失败: ' + error.message
    });
  }
});

// 文件下载
router.get('/download', authenticateToken, async (req, res) => {
  try {
    const { serverId, path: remotePath } = req.query;
    const userId = req.user.userId;

    if (!serverId || !remotePath) {
      return res.status(400).json({
        success: false,
        message: '服务器ID和路径不能为空'
      });
    }

    // 创建临时目录
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `download_${Date.now()}_${path.basename(remotePath)}`);

    const sftpHandler = await getSftpConnection(userId, serverId);
    await sftpHandler.downloadFile(remotePath, tempFilePath);

    // 设置响应头
    const filename = path.basename(remotePath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 发送文件
    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);

    // 文件传输完成后清理临时文件
    fileStream.on('end', () => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

    fileStream.on('error', () => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

  } catch (error) {
    console.error('文件下载错误:', error);
    res.status(500).json({
      success: false,
      message: '文件下载失败: ' + error.message
    });
  }
});

module.exports = router;
