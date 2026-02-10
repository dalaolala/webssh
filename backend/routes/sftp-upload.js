const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SftpHandler = require('../utils/sftpHandler');
const { authenticateToken } = require('../middleware/auth');
const { getServerById } = require('../utils/database');
const { decrypt } = require('../utils/encryption');

const router = express.Router();

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

// 文件上传
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { serverId, path: remotePath } = req.body;
    const userId = req.user.id;

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

    // 获取服务器配置
    const server = await getServerById(serverId);
    if (!server || server.user_id !== userId) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: '服务器不存在或无权访问'
      });
    }

    // 解密敏感信息
    const serverConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password ? decrypt(server.password, userId) : null,
      privateKey: server.private_key ? decrypt(server.private_key, userId) : null
    };

    // 连接SFTP并上传文件
    const sftpHandler = new SftpHandler(serverConfig);
    await sftpHandler.connect();
    await sftpHandler.uploadFile(req.file.path, remotePath);
    await sftpHandler.disconnect();

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
    const userId = req.user.id;

    if (!serverId || !remotePath) {
      return res.status(400).json({
        success: false,
        message: '服务器ID和路径不能为空'
      });
    }

    // 获取服务器配置
    const server = await getServerById(serverId);
    if (!server || server.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '服务器不存在或无权访问'
      });
    }

    // 解密敏感信息
    const serverConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password ? decrypt(server.password, userId) : null,
      privateKey: server.private_key ? decrypt(server.private_key, userId) : null
    };

    // 创建临时目录
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `download_${Date.now()}_${path.basename(remotePath)}`);

    // 连接SFTP并下载文件
    const sftpHandler = new SftpHandler(serverConfig);
    await sftpHandler.connect();
    await sftpHandler.downloadFile(remotePath, tempFilePath);
    await sftpHandler.disconnect();

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