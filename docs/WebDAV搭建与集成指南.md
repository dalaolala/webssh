# WebDAV 搭建与集成指南

## 一、WebDAV 简介

### 1.1 什么是 WebDAV

WebDAV（Web-based Distributed Authoring and Versioning）是一种基于 HTTP 协议的扩展，允许用户通过网络对服务器上的文件进行创建、修改、移动和删除等操作。简单来说，WebDAV 让 Web 服务器变成一个网络文件服务器。

### 1.2 WebDAV 的特点

- **基于 HTTP 协议**：使用标准的 HTTP 方法（GET、PUT、DELETE、COPY、MOVE 等）
- **跨平台支持**：Windows、macOS、Linux 都原生支持 WebDAV 协议
- **支持认证**：支持 Basic 认证、Digest 认证等安全机制
- **支持 SSL/TLS 加密**：可通过 HTTPS 保护传输数据
- **支持锁定**：防止多人同时编辑同一文件造成冲突

### 1.3 WebDAV 的应用场景

- **文件共享与同步**：替代 FTP，实现更安全的文件传输
- **协作编辑**：多人协作编辑文档
- **网盘服务**：搭建私有云存储
- **备份存储**：远程备份重要文件
- **应用集成**：作为应用的文件存储后端

---

## 二、使用 Docker 搭建 WebDAV

### 2.1 环境要求

- 已安装 Docker
- 服务器开放对应端口

### 2.2 快速部署

使用以下命令快速启动 WebDAV 服务：

```bash
docker run -d \
  --name webdav \
  -p 18089:80 \
  -v /root/webdav:/var/lib/dav \
  -e USERNAME=admin \
  -e PASSWORD=password \
  --restart always \
  bytemark/webdav
```

### 2.3 参数说明

| 参数 | 说明 |
|------|------|
| `--name webdav` | 容器名称，方便管理 |
| `-p 18089:80` | 端口映射，将容器 80 端口映射到主机 18089 端口 |
| `-v /root/webdav:/var/lib/dav` | 数据卷挂载，将 WebDAV 数据持久化到主机 |
| `-e USERNAME=admin` | 设置登录用户名 |
| `-e PASSWORD=password` | 设置登录密码 |
| `--restart always` | 容器自动重启策略 |
| `bytemark/webdav` | 使用的镜像名称 |

### 2.4 验证服务

启动后，可通过以下方式验证：

1. **浏览器访问**：打开 `http://your-server-ip:18089`，输入用户名密码
2. **命令行测试**：
   ```bash
   curl -u admin:password http://localhost:18089/
   ```

### 2.5 常用管理命令

```bash
# 查看容器状态
docker ps | grep webdav

# 查看日志
docker logs webdav

# 停止服务
docker stop webdav

# 启动服务
docker start webdav

# 重启服务
docker restart webdav

# 删除容器
docker rm -f webdav
```

### 2.6 高级配置

#### 使用 Docker Compose

创建 `docker-compose.yml` 文件：

```yaml
version: '3'
services:
  webdav:
    image: bytemark/webdav
    container_name: webdav
    ports:
      - "18089:80"
    volumes:
      - /root/webdav:/var/lib/dav
    environment:
      - USERNAME=admin
      - PASSWORD=password
    restart: always
```

启动命令：

```bash
docker-compose up -d
```

#### 配置 HTTPS（推荐）

使用 Nginx 反向代理实现 HTTPS：

```nginx
server {
    listen 443 ssl;
    server_name webdav.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:18089;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 三、客户端连接方式

### 3.1 Windows

1. 打开「此电脑」
2. 点击「映射网络驱动器」
3. 输入地址：`http://your-server-ip:18089`
4. 输入用户名和密码

### 3.2 macOS

1. 打开 Finder
2. 菜单栏选择「前往」→「连接服务器」
3. 输入地址：`http://your-server-ip:18089`
4. 输入用户名和密码

### 3.3 Linux

使用 `davfs2` 挂载：

```bash
# 安装 davfs2
sudo apt install davfs2

# 创建挂载点
sudo mkdir -p /mnt/webdav

# 挂载
sudo mount -t davfs http://your-server-ip:18089 /mnt/webdav
```

---

## 四、集成到 WebSSH 项目

### 4.1 集成思路

WebSSH 项目可以集成 WebDAV 作为文件传输的替代方案，提供以下功能：

1. **SFTP 替代方案**：当 SSH/SFTP 不可用时，使用 WebDAV 进行文件传输
2. **文件共享**：通过 WebDAV 实现跨平台文件共享
3. **备份存储**：将重要配置文件备份到 WebDAV 服务器

### 4.2 后端集成

#### 安装依赖

```bash
npm install webdav
```

#### 创建 WebDAV 客户端模块

在 `backend/routes/` 目录下创建 `webdav.js`：

```javascript
const { createClient } = require('webdav');
const express = require('express');
const router = express.Router();

// WebDAV 连接池
const clients = new Map();

// 创建 WebDAV 客户端
function createWebdavClient(config) {
  const { url, username, password } = config;
  return createClient(url, {
    username,
    password
  });
}

// 连接 WebDAV
router.post('/connect', async (req, res) => {
  try {
    const { id, url, username, password } = req.body;
    const client = createWebdavClient({ url, username, password });
    
    // 测试连接
    await client.getDirectoryContents('/');
    
    clients.set(id, { client, config: { url, username } });
    res.json({ success: true, message: 'WebDAV 连接成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 断开连接
router.post('/disconnect', (req, res) => {
  const { id } = req.body;
  clients.delete(id);
  res.json({ success: true });
});

// 列出目录内容
router.get('/list', async (req, res) => {
  try {
    const { id, path = '/' } = req.query;
    const clientData = clients.get(id);
    
    if (!clientData) {
      return res.status(404).json({ success: false, message: '未找到连接' });
    }
    
    const contents = await clientData.client.getDirectoryContents(path);
    res.json({ success: true, data: contents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 上传文件
router.post('/upload', async (req, res) => {
  try {
    const { id, remotePath } = req.body;
    const clientData = clients.get(id);
    
    if (!clientData) {
      return res.status(404).json({ success: false, message: '未找到连接' });
    }
    
    // 处理文件上传
    const file = req.files?.file;
    if (!file) {
      return res.status(400).json({ success: false, message: '未提供文件' });
    }
    
    await clientData.client.putFileContents(remotePath, file.data);
    res.json({ success: true, message: '上传成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 下载文件
router.get('/download', async (req, res) => {
  try {
    const { id, path } = req.query;
    const clientData = clients.get(id);
    
    if (!clientData) {
      return res.status(404).json({ success: false, message: '未找到连接' });
    }
    
    const content = await clientData.client.getFileContents(path);
    res.send(content);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建目录
router.post('/mkdir', async (req, res) => {
  try {
    const { id, path } = req.body;
    const clientData = clients.get(id);
    
    if (!clientData) {
      return res.status(404).json({ success: false, message: '未找到连接' });
    }
    
    await clientData.client.createDirectory(path);
    res.json({ success: true, message: '目录创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除文件/目录
router.delete('/delete', async (req, res) => {
  try {
    const { id, path } = req.body;
    const clientData = clients.get(id);
    
    if (!clientData) {
      return res.status(404).json({ success: false, message: '未找到连接' });
    }
    
    await clientData.client.deleteFile(path);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

#### 在 server.js 中注册路由

```javascript
const webdavRoutes = require('./routes/webdav');
app.use('/api/webdav', webdavRoutes);
```

### 4.3 前端集成

#### 创建 WebDAV 管理组件

在 `frontend/src/components/` 目录下创建 `WebdavManager.vue`：

```vue
<template>
  <div class="webdav-manager">
    <!-- 连接表单 -->
    <div class="connection-form" v-if="!connected">
      <el-form :model="form" label-width="100px">
        <el-form-item label="服务器地址">
          <el-input v-model="form.url" placeholder="http://your-server:18089" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="connect">连接</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 文件浏览器 -->
    <div class="file-browser" v-else>
      <div class="toolbar">
        <el-button @click="goBack">返回上级</el-button>
        <el-button @click="refresh">刷新</el-button>
        <el-button type="primary" @click="uploadDialogVisible = true">上传</el-button>
      </div>
      
      <el-table :data="fileList" @row-click="handleRowClick">
        <el-table-column prop="basename" label="名称" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="size" label="大小" width="120">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastmod" label="修改时间" width="180" />
      </el-table>
    </div>
    
    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传文件">
      <el-upload
        :auto-upload="false"
        :on-change="handleFileChange"
      >
        <el-button type="primary">选择文件</el-button>
      </el-upload>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="uploadFile">上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const form = ref({
  url: '',
  username: '',
  password: ''
})

const connected = ref(false)
const currentPath = ref('/')
const fileList = ref([])
const uploadDialogVisible = ref(false)
const selectedFile = ref(null)

const connect = async () => {
  try {
    const res = await axios.post('/api/webdav/connect', {
      id: 'default',
      ...form.value
    })
    if (res.data.success) {
      connected.value = true
      await loadFiles()
    }
  } catch (error) {
    console.error('连接失败:', error)
  }
}

const loadFiles = async () => {
  const res = await axios.get('/api/webdav/list', {
    params: { id: 'default', path: currentPath.value }
  })
  if (res.data.success) {
    fileList.value = res.data.data
  }
}

const handleRowClick = (row) => {
  if (row.type === 'directory') {
    currentPath.value = row.filename
    loadFiles()
  }
}

const goBack = () => {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = '/' + parts.join('/')
  loadFiles()
}

const refresh = () => loadFiles()

const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

const uploadFile = async () => {
  if (!selectedFile.value) return
  
  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('id', 'default')
  formData.append('remotePath', currentPath.value + '/' + selectedFile.value.name)
  
  await axios.post('/api/webdav/upload', formData)
  uploadDialogVisible.value = false
  loadFiles()
}

const formatSize = (bytes) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return bytes.toFixed(2) + ' ' + units[i]
}
</script>
```

### 4.4 使用场景

1. **作为 SFTP 的备用方案**：当 SSH 服务不可用时，自动切换到 WebDAV
2. **配置文件备份**：定期将服务器配置备份到 WebDAV
3. **日志文件归档**：将历史日志上传到 WebDAV 存储
4. **跨平台文件同步**：在不同设备间同步配置和脚本

---

## 五、常见问题

### 5.1 连接超时

**原因**：防火墙未开放端口或服务未启动

**解决方案**：
```bash
# 检查端口是否开放
firewall-cmd --list-ports

# 开放端口
firewall-cmd --add-port=18089/tcp --permanent
firewall-cmd --reload
```

### 5.2 权限问题

**原因**：挂载目录权限不足

**解决方案**：
```bash
# 修改目录权限
chmod -R 755 /root/webdav
chown -R www-data:www-data /root/webdav
```

### 5.3 中文文件名乱码

**原因**：编码设置问题

**解决方案**：确保客户端和服务端都使用 UTF-8 编码

---

## 六、安全建议

1. **使用强密码**：设置复杂的用户名和密码
2. **启用 HTTPS**：通过 Nginx 反向代理配置 SSL 证书
3. **限制访问 IP**：在防火墙或 Nginx 中限制访问来源
4. **定期备份**：定期备份 WebDAV 数据目录
5. **监控日志**：定期检查访问日志，发现异常访问

---

## 七、参考资源

- [WebDAV 协议规范 (RFC 4918)](https://tools.ietf.org/html/rfc4918)
- [bytemark/webdav Docker 镜像](https://hub.docker.com/r/bytemark/webdav)
- [webdav npm 包文档](https://github.com/perry-mitchell/webdav-client)