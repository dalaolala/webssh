<template>
  <div class="aside-footer">
    <el-tooltip placement="right-end" :show-arrow="false" trigger="click" popper-class="github-popper" :teleported="false">
      <template #default>
        <button class="icon-btn github-icon-btn" aria-label="关于 / GitHub">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="width:14px;height:14px;">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
              -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
              .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
              -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
              .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
              .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
              0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </button>
      </template>
      <template #content>
        <div class="github-card">
          <!-- 头部：app 图标 + 名称 + 副标题 -->
          <div class="github-card-header">
            <div class="github-card-app-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="5" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>
                <path d="M6 5V4a2 2 0 014 0v1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>
                <circle cx="10" cy="11" r="1.5" fill="currentColor"/>
                <path d="M10 12.5v1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="github-card-header-text">
              <div class="github-card-app-name">WebSSH</div>
              <div class="github-card-app-sub">SSH / SFTP 客户端</div>
            </div>
          </div>

          <div class="github-card-divider"></div>

          <!-- 链接列表 -->
          <a href="https://github.com/dalaolala/webssh" target="_blank" rel="noopener noreferrer" class="github-card-link">
            <span class="github-card-link-icon github-card-link-icon--green">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                  0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                  -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                  .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                  -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
                  .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
                  .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
                  0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </span>
            <span class="github-card-link-label">开源地址</span>
            <svg class="github-card-link-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor">
              <path d="M2 6h8M7 3l3 3-3 3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>

          <a href="https://github.com/dalaolala/webssh/tags" target="_blank" rel="noopener noreferrer" class="github-card-link">
            <span class="github-card-link-icon github-card-link-icon--blue">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 7.775V2.75C1 2.06 1.56 1.5 2.25 1.5h5.025a.75.75 0 01.53.22l6.25 6.25a.75.75 0 010 1.06l-5.025 5.025a.75.75 0 01-1.06 0L1.72 8.305A.75.75 0 011 7.775zm1.5-.31l5.345 5.345 4.965-4.965L7.465 3H2.5v4.465zM4.5 5.5a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
            </span>
            <span class="github-card-link-label">版本下载</span>
            <svg class="github-card-link-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor">
              <path d="M2 6h8M7 3l3 3-3 3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </template>
    </el-tooltip>
  </div>
</template>

<script setup>
// 无需额外逻辑，链接由 electron/main.js 的 setWindowOpenHandler 拦截后用系统浏览器打开
</script>

<style scoped>
/* 底部区域 */
.aside-footer {
  flex-shrink: 0;
  padding: 8px 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.dark-theme .aside-footer {
  border-top-color: rgba(255, 255, 255, 0.07);
}

/* 按钮基础样式 */
.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 7px;
  color: #636366;
  font-size: 14px;
  cursor: pointer;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.07);
  color: #1c1c1e;
}

.dark-theme .icon-btn {
  color: #8e8e93;
}

.dark-theme .icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f5f5f7;
}

/* GitHub 图标按钮颜色覆盖 */
.github-icon-btn {
  color: #c0c0c5;
}

.dark-theme .github-icon-btn {
  color: #48484e;
}

/* Popper 卡片内部样式 */
.github-card {
  min-width: 192px;
  padding: 2px 0;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
}

/* 卡片 header */
.github-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 10px;
}

.github-card-app-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5ac8fa;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.18);
}

.github-card-app-icon svg {
  width: 16px;
  height: 16px;
}

.github-card-header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.github-card-app-name {
  font-size: 13px;
  font-weight: 600;
  color: #1c1c1e;
  letter-spacing: -0.1px;
  line-height: 1.2;
}

.github-card-app-sub {
  font-size: 11px;
  color: #aeaeb2;
  line-height: 1.3;
}

/* 分隔线 */
.github-card-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.07);
  margin: 0 4px 4px;
}

/* 链接行 */
.github-card-link {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: 6px;
  text-decoration: none;
  color: #1c1c1e;
  font-size: 13px;
  font-weight: 400;
  transition: background 0.12s;
  margin: 0 4px;
}

.github-card-link:hover {
  background: rgba(0, 122, 255, 0.08);
}

/* 彩色图标色块 */
.github-card-link-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.github-card-link-icon svg {
  width: 13px;
  height: 13px;
}

.github-card-link-icon--green {
  background: linear-gradient(145deg, #28a745, #34d058);
  color: #fff;
}

.github-card-link-icon--blue {
  background: linear-gradient(145deg, #0a84ff, #409eff);
  color: #fff;
}

.github-card-link-label {
  flex: 1;
  color: inherit;
}

.github-card-link:hover .github-card-link-label {
  color: #007AFF;
}

.github-card-link-arrow {
  width: 11px;
  height: 11px;
  opacity: 0.25;
  flex-shrink: 0;
  transition: opacity 0.12s, transform 0.12s;
}

.github-card-link:hover .github-card-link-arrow {
  opacity: 0.6;
  transform: translateX(2px);
}
</style>
