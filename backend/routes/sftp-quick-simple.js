const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();
const SftpHandler = require('../utils/sftpHandler');
const { decryptPayload } = require('../utils/crypto');

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
// Key: sessionId -> Value: { handler: SftpHandler, lastHeartbeat: timestamp }
const sftpConnections = new Map();

// 心跳超时时间（毫秒）- 超过此时间没有心跳则清理连接
const HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5分钟
// 心跳检查间隔
const HEARTBEAT_CHECK_INTERVAL = 60 * 1000; // 1分钟检查一次

// 定期检查并清理超时的连接
const heartbeatChecker = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, entry] of sftpConnections.entries()) {
        if (now - entry.lastHeartbeat > HEARTBEAT_TIMEOUT) {
            console.log(`SFTP 会话 ${sessionId} 心跳超时，自动清理`);
            try {
                if (entry.handler && entry.handler.isConnected) {
                    entry.handler.disconnect();
                }
            } catch (e) {
                console.error(`断开 SFTP 会话 ${sessionId} 时出错:`, e);
            }
            sftpConnections.delete(sessionId);
        }
    }
}, HEARTBEAT_CHECK_INTERVAL);

// 清理所有连接 - 在进程退出时调用
const cleanupAllConnections = () => {
    clearInterval(heartbeatChecker);
    for (const [sessionId, entry] of sftpConnections.entries()) {
        try {
            if (entry.handler && entry.handler.isConnected) {
                entry.handler.disconnect();
            }
        } catch (error) {
            console.error(`清理 SFTP 会话 ${sessionId} 时出错:`, error);
        }
    }
    sftpConnections.clear();
};

// 注册进程退出清理
process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，清理 SFTP 连接...');
    cleanupAllConnections();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，清理 SFTP 连接...');
    cleanupAllConnections();
    process.exit(0);
});

process.on('beforeExit', () => {
    console.log('进程即将退出，清理 SFTP 连接...');
    cleanupAllConnections();
});

// 连接SFTP - 快速连接专属（无认证版本）
router.post('/connect', async (req, res) => {
    try {
        let connectionInfo = req.body;

        // 如果请求体包含 key 和 data，说明是加密传输
        if (connectionInfo.key && connectionInfo.data) {
            try {
                connectionInfo = decryptPayload(connectionInfo.key, connectionInfo.data);
            } catch (err) {
                console.error('解密载荷失败:', err);
                return res.status(400).json({
                    success: false,
                    message: '无效的加密数据结构'
                });
            }
        }

        const { host, port, username, password, privateKey } = connectionInfo;

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
        sftpConnections.set(sessionId, {
            handler: sftpHandler,
            lastHeartbeat: Date.now()
        });

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

// 获取已存在的连接（同时更新心跳时间）
function getQuickSftpConnection(sessionId) {
    if (!sessionId) {
        throw new Error('未提供 sessionId');
    }

    if (!sftpConnections.has(sessionId)) {
        throw new Error('SFTP会话已过期或不存在，请重新连接');
    }

    const entry = sftpConnections.get(sessionId);
    const connection = entry.handler;
    if (!connection || !connection.isConnected) {
        sftpConnections.delete(sessionId);
        throw new Error('SFTP连接已断开，请重新连接');
    }

    // 更新心跳时间
    entry.lastHeartbeat = Date.now();

    return connection;
}

// 断开SFTP连接
router.post('/disconnect', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (sessionId && sftpConnections.has(sessionId)) {
            const entry = sftpConnections.get(sessionId);
            await entry.handler.disconnect();
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

// 心跳接口 - 前端定期调用以保持连接活跃
router.post('/heartbeat', (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId || !sftpConnections.has(sessionId)) {
        return res.json({
            success: false,
            message: '会话不存在'
        });
    }

    const entry = sftpConnections.get(sessionId);
    entry.lastHeartbeat = Date.now();

    res.json({
        success: true,
        message: '心跳更新成功'
    });
});

// 列出目录内容
router.get('/list', async (req, res) => {
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
router.get('/file', async (req, res) => {
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
router.post('/file', async (req, res) => {
    let tempPath = null;
    
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

        tempPath = pathModule.join(os.tmpdir(), `sftp_quick_edit_${Date.now()}.tmp`);
        fs.writeFileSync(tempPath, content, 'utf8');

        await sftpHandler.uploadFile(tempPath, path);

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
    } finally {
        // 确保临时文件被清理
        if (tempPath && fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
        }
    }
});

// 创建目录
router.post('/mkdir', async (req, res) => {
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
router.delete('/delete', async (req, res) => {
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
router.post('/rename', async (req, res) => {
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
router.post('/upload', upload.single('file'), async (req, res) => {
    const tempFilePath = req.file ? req.file.path : null;
    
    try {
        const { sessionId, path: remotePath } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有选择文件'
            });
        }

        if (!sessionId || !remotePath) {
            return res.status(400).json({
                success: false,
                message: '会话ID和路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        await sftpHandler.uploadFile(req.file.path, remotePath);

        res.json({
            success: true,
            message: '文件上传成功',
            filename: req.file.originalname,
            size: req.file.size
        });

    } catch (error) {
        console.error('快速文件上传错误:', error);

        res.status(500).json({
            success: false,
            message: '文件上传失败: ' + error.message
        });
    } finally {
        // 确保临时文件被清理
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
        }
    }
});

// 文件下载
router.get('/download', async (req, res) => {
    let tempFilePath = null;
    
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

        tempFilePath = path.join(tempDir, `download_${Date.now()}_${path.basename(remotePath)}`);

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
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (cleanupError) {
                    console.error('清理临时文件失败:', cleanupError);
                }
            }
        });

        fileStream.on('error', (error) => {
            console.error('文件流错误:', error);
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (cleanupError) {
                    console.error('清理临时文件失败:', cleanupError);
                }
            }
        });

    } catch (error) {
        console.error('快速文件下载错误:', error);
        
        // 清理临时文件
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: '文件下载失败: ' + error.message
        });
    }
});

module.exports = router;