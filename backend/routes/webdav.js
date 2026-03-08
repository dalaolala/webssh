const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * 发起 WebDAV 请求的通用函数
 */
function webdavRequest(options, body) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * 构建 Basic Auth 头
 */
function buildAuthHeader(username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * 测试 WebDAV 连接
 * POST /api/webdav/test
 */
router.post('/test', async (req, res) => {
  const { url, username, password } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: '请提供 WebDAV URL' });
  }

  try {
    const parsed = new URL(url);
    const options = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname || '/',
      method: 'OPTIONS',
      headers: {
        'Authorization': buildAuthHeader(username || '', password || ''),
      },
      timeout: 10000,
    };

    const result = await webdavRequest(options, null);

    if (result.statusCode >= 200 && result.statusCode < 400) {
      res.json({ success: true, message: '连接成功' });
    } else if (result.statusCode === 401) {
      res.json({ success: false, message: '认证失败，请检查用户名和密码' });
    } else {
      res.json({ success: false, message: `服务器返回 ${result.statusCode}` });
    }
  } catch (error) {
    res.json({ success: false, message: `连接失败：${error.message}` });
  }
});

/**
 * 上传服务器列表到 WebDAV
 * POST /api/webdav/upload
 */
router.post('/upload', async (req, res) => {
  const { url, username, password, content } = req.body;

  if (!url || content === undefined) {
    return res.status(400).json({ success: false, message: '参数不完整' });
  }

  try {
    const parsed = new URL(url);
    const bodyBuffer = Buffer.from(content, 'utf8');
    const options = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      method: 'PUT',
      headers: {
        'Authorization': buildAuthHeader(username || '', password || ''),
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': bodyBuffer.length,
        'Overwrite': 'T',
      },
      timeout: 15000,
    };

    const result = await webdavRequest(options, bodyBuffer);

    if (result.statusCode >= 200 && result.statusCode < 300) {
      res.json({ success: true, message: '上传成功' });
    } else if (result.statusCode === 401) {
      res.json({ success: false, message: '认证失败，请检查用户名和密码' });
    } else if (result.statusCode === 403) {
      res.json({ success: false, message: '无权限写入，请检查路径或权限' });
    } else if (result.statusCode === 409) {
      res.json({ success: false, message: '目标路径的父目录不存在，请先在 WebDAV 服务器上创建目录' });
    } else {
      res.json({ success: false, message: `上传失败，服务器返回 ${result.statusCode}` });
    }
  } catch (error) {
    res.json({ success: false, message: `上传失败：${error.message}` });
  }
});

/**
 * 从 WebDAV 下载服务器列表
 * POST /api/webdav/download
 */
router.post('/download', async (req, res) => {
  const { url, username, password } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: '请提供 WebDAV URL' });
  }

  try {
    const parsed = new URL(url);
    const options = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      method: 'GET',
      headers: {
        'Authorization': buildAuthHeader(username || '', password || ''),
      },
      timeout: 15000,
    };

    const result = await webdavRequest(options, null);

    if (result.statusCode === 200) {
      res.json({ success: true, content: result.body });
    } else if (result.statusCode === 401) {
      res.json({ success: false, message: '认证失败，请检查用户名和密码' });
    } else if (result.statusCode === 404) {
      res.json({ success: false, message: '远程文件不存在，请先执行上传同步' });
    } else {
      res.json({ success: false, message: `下载失败，服务器返回 ${result.statusCode}` });
    }
  } catch (error) {
    res.json({ success: false, message: `下载失败：${error.message}` });
  }
});

module.exports = router;
