<template>
  <div class="welcome-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-icon">⚡</span>
          <span class="logo-text">WebSSH</span>
        </div>
        <div class="nav-links">
          <a href="#features" class="nav-link">功能特性</a>
          <a href="#about" class="nav-link">关于项目</a>
          <button @click="goToLogin" class="login-btn">登录</button>
        </div>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">
            基于Web的SSH终端
            <span class="gradient-text">随时随地管理服务器</span>
          </h1>
          <p class="hero-description">
            WebSSH 是一个功能强大的在线SSH终端工具，让您可以在任何设备上通过浏览器安全地连接到远程服务器。
            无需安装任何客户端软件，开箱即用。
          </p>
          <div class="hero-actions">
            <button @click="goToLogin" class="primary-btn">立即开始</button>
            <a href="https://github.com/dalaolala/webssh" target="_blank" class="secondary-btn">
              <span class="github-icon">📂</span>
              查看源码
            </a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="terminal-preview">
            <div class="terminal-header">
              <div class="terminal-buttons">
                <span class="terminal-btn red"></span>
                <span class="terminal-btn yellow"></span>
                <span class="terminal-btn green"></span>
              </div>
              <span class="terminal-title">ssh user@server.com</span>
            </div>
            <div class="terminal-content">
              <div class="terminal-line">$ cd /var/www</div>
              <div class="terminal-line">$ ls -la</div>
              <div class="terminal-line">drwxr-xr-x  12 user  staff   384B Dec 15 10:30 .</div>
              <div class="terminal-line">$ <span class="cursor">█</span></div>
            </div>
          </div>
        </div>
      </section>

      <!-- 功能特性 -->
      <section id="features" class="features-section">
        <div class="section-header">
          <h2>核心功能特性</h2>
          <p>WebSSH 提供完整的SSH客户端体验</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🔐</div>
            <h3>安全认证</h3>
            <p>支持密码和私钥两种认证方式，所有敏感数据均经过AES-256加密存储</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🌐</div>
            <h3>Web终端</h3>
            <p>基于xterm.js的现代化Web终端，支持所有常见终端操作和快捷键</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>服务器管理</h3>
            <p>便捷的服务器分组管理，支持快速连接和历史记录追踪</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔗</div>
            <h3>快速连接</h3>
            <p>无需保存服务器信息，直接输入连接参数即可快速建立连接</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3>多设备支持</h3>
            <p>响应式设计，支持在桌面、平板和手机等不同设备上使用</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3>高性能</h3>
            <p>优化的WebSocket连接，确保终端操作的实时性和流畅性</p>
          </div>
        </div>
      </section>

      <!-- 技术栈 -->
      <section class="tech-section">
        <div class="section-header">
          <h2>技术栈</h2>
          <p>基于现代化技术栈构建</p>
        </div>
        <div class="tech-stack">
          <div class="tech-item">
            <span class="tech-name">Vue 3</span>
            <span class="tech-desc">前端框架</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">Node.js</span>
            <span class="tech-desc">后端服务</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">xterm.js</span>
            <span class="tech-desc">Web终端</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">MySQL</span>
            <span class="tech-desc">数据库</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">Docker</span>
            <span class="tech-desc">容器化</span>
          </div>
        </div>
      </section>

      <!-- 开源项目 -->
      <section id="about" class="opensource-section">
        <div class="section-header">
          <h2>开源项目</h2>
          <p>WebSSH 是一个完全开源的项目</p>
        </div>
        <div class="opensource-content">
          <div class="github-card">
            <div class="github-header">
              <span class="github-icon">🐙</span>
              <h3>GitHub 仓库</h3>
            </div>
            <p>项目源码托管在 GitHub，欢迎 Star 和贡献代码！</p>
            <div class="github-actions">
              <a href="https://github.com/dalaolala/webssh" target="_blank" class="github-btn">
                <span class="star-icon">⭐</span>
                前往 GitHub
              </a>
              <div class="github-stats">
                <span class="stat">开源免费</span>
                <span class="stat">MIT 许可证</span>
                <span class="stat">持续更新</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2>立即开始使用 WebSSH</h2>
          <p>注册账号，开始您的云端服务器管理之旅</p>
          <div class="cta-actions">
            <button @click="goToLogin" class="primary-btn large">开始使用</button>
            <a href="https://github.com/dalaolala/webssh" target="_blank" class="secondary-btn">查看文档</a>
          </div>
        </div>
      </section>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>&copy; {{ currentYear }} WebSSH. 基于 MIT 许可证开源发布</p>
        <p>项目地址：<a href="https://github.com/dalaolala/webssh" target="_blank" style="color: white;">https://github.com/dalaolala/webssh</a></p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const router = useRouter()
const currentYear = ref(new Date().getFullYear())

const goToLogin = () => {
  router.push('/login')
}

onMounted(() => {
  // 确保年份始终是最新的
  currentYear.value = new Date().getFullYear()
})
</script>

<style scoped>
.welcome-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 导航栏样式 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  z-index: 1000;
  padding: 1rem 0;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: bold;
}

.logo-icon {
  font-size: 2rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  transition: opacity 0.3s;
}

.nav-link:hover {
  opacity: 0.8;
}

.login-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s;
}

.login-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 主内容区 */
.main-content {
  padding-top: 80px;
}

/* Hero Section */
.hero-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  min-height: 80vh;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.gradient-text {
  background: linear-gradient(45deg, #ffd89b, #19547b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.2rem;
  opacity: 0.9;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.primary-btn, .secondary-btn {
  padding: 0.75rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.primary-btn {
  background: #4f46e5;
  color: white;
}

.primary-btn:hover {
  background: #4338ca;
  transform: translateY(-2px);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.primary-btn.large {
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
}

/* 终端预览 */
.terminal-preview {
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.terminal-header {
  background: #2d2d2d;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.terminal-buttons {
  display: flex;
  gap: 0.5rem;
}

.terminal-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-btn.red { background: #ff5f56; }
.terminal-btn.yellow { background: #ffbd2e; }
.terminal-btn.green { background: #27ca3f; }

.terminal-title {
  color: #ccc;
  font-size: 0.9rem;
}

.terminal-content {
  padding: 1.5rem;
  font-family: 'Courier New', monospace;
  line-height: 1.5;
}

.terminal-line {
  color: #00ff00;
  margin-bottom: 0.5rem;
}

.cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 通用区块样式 */
.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-header h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.section-header p {
  font-size: 1.2rem;
  opacity: 0.8;
}

/* 功能特性区块 */
.features-section {
  background: white;
  color: #333;
  padding: 4rem 2rem;
}

.features-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: #f8fafc;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1a202c;
}

.feature-card p {
  color: #4a5568;
  line-height: 1.6;
}

/* 技术栈区块 */
.tech-section {
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.05);
}

.tech-stack {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.tech-item {
  text-align: center;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.tech-name {
  display: block;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.tech-desc {
  opacity: 0.8;
  font-size: 0.9rem;
}

/* 开源项目区块 */
.opensource-section {
  padding: 4rem 2rem;
  background: white;
  color: #333;
}

.github-card {
  max-width: 500px;
  margin: 0 auto;
  background: #f8fafc;
  padding: 3rem;
  border-radius: 12px;
  text-align: center;
}

.github-header {
  margin-bottom: 1.5rem;
}

.github-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.github-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #333;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  text-decoration: none;
  margin-bottom: 1.5rem;
  transition: background 0.3s;
}

.github-btn:hover {
  background: #555;
}

.github-stats {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.9rem;
}

/* CTA区块 */
.cta-section {
  padding: 4rem 2rem;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.2rem;
  opacity: 0.8;
  margin-bottom: 2rem;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* 页脚 */
.footer {
  background: rgba(0, 0, 0, 0.2);
  padding: 2rem;
  text-align: center;
}

.footer-content p {
  margin-bottom: 0.5rem;
  opacity: 0.8;
}

.footer a {
  color: #4f46e5;
  text-decoration: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-section {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 2rem;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .nav-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .tech-stack {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>