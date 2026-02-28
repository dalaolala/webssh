const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();
const SftpHandler = require('../utils/sftpHandler');
const { authenticateToken } = require('../middleware/auth');

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
// Key: sessionId -> Value: SftpHandler 实例
const sftpConnections = new Map();

// 连接SFTP - 快速连接专属
router.post('/connect', authenticateToken, async (req, res) => {
    try {
        const { host, port, username, password, privateKey } = req.body;
        const userId = req.user.userId;

        if (!host || !username) {
            return res.status(400).json({
                success: false,
                message: '主机和用户名不能为空'
            });
        }

        const serverConfig = {
            host: host,
            port: port || 22,
            username: username,
            password: password,
            privateKey: privateKey
        };

        const sftpHandler = new SftpHandler(serverConfig);
        await sftpHandler.connect();

        // 生成隔离的 sessionId
        const sessionId = crypto.randomUUID();
        sftpConnections.set(sessionId, sftpHandler);

        // 设置定时器自动断开连接（10分钟无活动）
        setTimeout(() => {
            if (sftpConnections.has(sessionId)) {
                sftpConnections.get(sessionId).disconnect();
                sftpConnections.delete(sessionId);
            }
        }, 10 * 60 * 1000);

        // 获取根目录列表
        const files = await sftpHandler.listDirectory('.');

        res.json({
            success: true,
            message: 'SFTP连接成功',
            sessionId: sessionId,
            currentPath: '/',
            files: files
        });
    } catch (error) {
        console.error('SFTP快速连接错误:', error);
        res.status(500).json({
            success: false,
            message: 'SFTP连接失败: ' + error.message
        });
    }
});

// 获取已存在的连接
function getQuickSftpConnection(sessionId) {
    if (!sessionId) {
        throw new Error('未提供 sessionId');
    }

    if (!sftpConnections.has(sessionId)) {
        throw new Error('SFTP会话已过期或不存在，请重新连接');
    }

    const connection = sftpConnections.get(sessionId);
    if (!connection || !connection.isConnected) {
        sftpConnections.delete(sessionId);
        throw new Error('SFTP连接已断开，请重新连接');
    }

    // 刷新活跃定时器
    // ...暂时省略复杂的定时器刷新逻辑，依赖10分钟上限...

    return connection;
}

// 断开SFTP连接
router.post('/disconnect', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (sessionId && sftpConnections.has(sessionId)) {
            await sftpConnections.get(sessionId).disconnect();
            sftpConnections.delete(sessionId);
        }

        res.json({
            success: true,
            message: 'SFTP连接已断开'
        });
    } catch (error) {
        console.error('断开快速SFTP连接错误:', error);
        res.status(500).json({
            success: false,
            message: '断开连接失败: ' + error.message
        });
    }
});

// 列出目录内容
router.get('/list', authenticateToken, async (req, res) => {
    try {
        const { sessionId, path = '.' } = req.query;

        const sftpHandler = getQuickSftpConnection(sessionId);
        const files = await sftpHandler.listDirectory(path);

        res.json({
            success: true,
            currentPath: path,
            files: files
        });
    } catch (error) {
        console.error('列出快速目录错误:', error);
        res.status(500).json({
            success: false,
            message: '列出目录失败: ' + error.message
        });
    }
});

// 读取文件内容
router.get('/file', authenticateToken, async (req, res) => {
    try {
        const { sessionId, path } = req.query;

        if (!path) {
            return res.status(400).json({
                success: false,
                message: '文件路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        const content = await sftpHandler.getFileContent(path);

        res.json({
            success: true,
            content: content,
            path: path
        });
    } catch (error) {
        console.error('读取快速文件错误:', error);
        res.status(500).json({
            success: false,
            message: '读取文件失败: ' + error.message
        });
    }
});

// 保存文件内容
router.post('/file', authenticateToken, async (req, res) => {
    try {
        const { sessionId, path, content } = req.body;

        if (!path || content === undefined) {
            return res.status(400).json({
                success: false,
                message: '文件路径和内容不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);

        // 创建临时文件保存内容，然后上传
        const os = require('os');
        const pathModule = require('path');

        const tempPath = pathModule.join(os.tmpdir(), `sftp_quick_edit_${Date.now()}.tmp`);
        fs.writeFileSync(tempPath, content, 'utf8');

        await sftpHandler.uploadFile(tempPath, path);
        fs.unlinkSync(tempPath);

        res.json({
            success: true,
            message: '文件保存成功'
        });
    } catch (error) {
        console.error('保存快速文件错误:', error);
        res.status(500).json({
            success: false,
            message: '保存文件失败: ' + error.message
        });
    }
});

// 创建目录
router.post('/mkdir', authenticateToken, async (req, res) => {
    try {
        const { sessionId, path } = req.body;

        if (!path) {
            return res.status(400).json({
                success: false,
                message: '目录路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        await sftpHandler.createDirectory(path);

        res.json({
            success: true,
            message: '目录创建成功'
        });
    } catch (error) {
        console.error('创建快速目录错误:', error);
        res.status(500).json({
            success: false,
            message: '创建目录失败: ' + error.message
        });
    }
});

// 删除文件或目录
router.delete('/delete', authenticateToken, async (req, res) => {
    try {
        const { sessionId, path, type } = req.body;

        if (!path) {
            return res.status(400).json({
                success: false,
                message: '路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);

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
        console.error('快速删除错误:', error);
        res.status(500).json({
            success: false,
            message: '删除失败: ' + error.message
        });
    }
});

// 重命名文件或目录
router.post('/rename', authenticateToken, async (req, res) => {
    try {
        const { sessionId, oldPath, newPath } = req.body;

        if (!oldPath || !newPath) {
            return res.status(400).json({
                success: false,
                message: '原路径和新路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        await sftpHandler.renameFile(oldPath, newPath);

        res.json({
            success: true,
            message: '重命名成功'
        });
    } catch (error) {
        console.error('快速重命名错误:', error);
        res.status(500).json({
            success: false,
            message: '重命名失败: ' + error.message
        });
    }
});

// 文件上传
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { sessionId, path: remotePath } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有选择文件'
            });
        }

        if (!sessionId || !remotePath) {
            // 清理临时文件
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: '会话ID和路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
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
        console.error('快速文件上传错误:', error);

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
        const { sessionId, path: remotePath } = req.query;

        if (!sessionId || !remotePath) {
            return res.status(400).json({
                success: false,
                message: '会话ID和路径不能为空'
            });
        }

        // 创建临时目录
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `download_${Date.now()}_${path.basename(remotePath)}`);

        const sftpHandler = getQuickSftpConnection(sessionId);
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
        console.error('快速文件下载错误:', error);
        res.status(500).json({
            success: false,
            message: '文件下载失败: ' + error.message
        });
    }
});

module.exports = router;
