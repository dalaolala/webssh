# CI/CD 自动构建与发布指南

本项目使用 GitHub Actions 自动构建 Docker 镜像并推送到 Docker Hub。

## 一次性配置 GitHub Secrets

进入仓库 **Settings → Secrets and variables → Actions**，添加以下两个 Secret：

| Secret 名称 | 值 |
|---|---|
| `DOCKERHUB_USERNAME` | 你的 Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub 的 **Access Token**（不是密码）|

**获取 Access Token**：登录 [hub.docker.com](https://hub.docker.com) → Account Settings → Security → **New Access Token**

---

## 自动 Tag 规则

| 触发方式 | 生成的镜像 Tag |
|---|---|
| 推送到 `main` 分支 | `yourname/webssh:main` + `yourname/webssh:latest` |
| 推送 `v1.2.3` tag | `yourname/webssh:1.2.3` + `yourname/webssh:1.2` + `yourname/webssh:latest` |

---

## 发版流程

```bash
# 日常开发 → 自动打 :latest
git push origin main

# 正式发版 → 打版本号 tag
git tag v1.0.0
git push origin v1.0.0
```

---

## 镜像说明

构建出的镜像**不包含数据库**，数据库通过环境变量在运行时注入。

### 方式一：docker run

```bash
docker run -d \
  --name webssh-app \
  -p 3000:3000 \
  -e DB_HOST=your-mysql-host \
  -e DB_PORT=3306 \
  -e DB_USER=webssh_user \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=webssh \
  -e JWT_SECRET=your-jwt-secret \
  -e ENCRYPTION_KEY=your-32-byte-encryption-key \
  dalaolala/webssh:latest
```

### 方式二：docker-compose（推荐）

```bash
# 初始化数据库（只需一次）
mysql -u root -p < install.sql

# 启动应用
docker-compose -f docker-compose.external-db.yml up -d
```

> [!IMPORTANT]
> `ENCRYPTION_KEY` 一旦设置后**不能更改**，否则已保存的服务器密码将无法解密。
>
> 生成随机 Key：`node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`

---

## 优化说明

| 特性 | 说明 |
|---|---|
| **构建缓存** `cache-from/to: type=gha` | 利用 GitHub Actions 缓存 Docker layer，二次构建大幅提速（npm install 层不重复执行）|
| **多架构** `linux/amd64,linux/arm64` | 同时支持 x86 服务器和 ARM（树莓派、Apple Silicon）|
| **Access Token** | 比密码更安全，可随时在 Docker Hub 吊销 | 
