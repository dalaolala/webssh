<template>
  <footer class="sb" v-if="isConnected">
    <!-- 左区：连接状态 + 主机信息 -->
    <div class="sb-left">
      <div class="sb-badge connected">
        <span class="sb-led"></span>
        <span>已连接</span>
      </div>

      <div class="sb-sep"></div>

      <div
        class="sb-host"
        :class="{ 'sb-host--copied': copied }"
        @dblclick="copyHost"
        title="双击复制 IP 地址"
      >
        <svg class="sb-host-icon" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
          <path d="M4 12h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M7 10v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>

        <!-- 正常态：分段渲染 user @ host : port -->
        <span v-if="!copied" class="sb-host-text">
          <span class="sb-conn-user">{{ connParts.user }}</span>
          <span class="sb-conn-at">@</span>
          <span class="sb-conn-host">{{ connParts.host }}</span>
          <span class="sb-conn-sep">:</span>
          <span class="sb-conn-port">{{ connParts.port }}</span>
        </span>

        <!-- 已复制态 -->
        <span v-else class="sb-host-copied-tip">
          <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
            <path d="M2 6l3 3 5-5" stroke="#30d158" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          已复制
        </span>
      </div>
    </div>

    <!-- 弹性空间 -->
    <div class="sb-spacer"></div>

    <!-- 右区：功能按钮组 -->
    <div class="sb-actions">
      <!-- 外观 / 主题选择器 -->
      <TerminalThemeSelector />

      <div class="sb-divider"></div>

      <!-- 文件管理 -->
      <button
        class="sb-btn"
        :class="{ 'sb-btn--active': showSftp }"
        @click="$emit('toggle-sftp')"
        title="文件管理器"
      >
        <svg class="sb-btn-icon" viewBox="0 0 14 14" fill="none">
          <path d="M1 4.5C1 3.67 1.67 3 2.5 3H5l1.5 1.5H11.5c.83 0 1.5.67 1.5 1.5v4.5c0 .83-.67 1.5-1.5 1.5h-9C1.67 12 1 11.33 1 10.5v-6z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
        <span>文件管理</span>
      </button>

      <!-- 常用命令 -->
      <button
        class="sb-btn"
        @click="$emit('show-commands')"
        title="常用命令库"
      >
        <svg class="sb-btn-icon" viewBox="0 0 14 14" fill="none">
          <path d="M2 3h10M2 7h7M2 11h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <circle cx="11" cy="10.5" r="2" stroke="currentColor" stroke-width="1.1"/>
          <path d="M12.4 11.9l1.1 1.1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
        </svg>
        <span>命令库</span>
      </button>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed } from 'vue'
import TerminalThemeSelector from './TerminalThemeSelector.vue'

const props = defineProps({
  isConnected:       { type: Boolean, default: false },
  connectionDisplay: { type: String,  default: ''    },
  showSftp:          { type: Boolean, default: false }
})

defineEmits(['toggle-sftp', 'show-commands'])

// 解析 user@host:port
const connParts = computed(() => {
  const raw = props.connectionDisplay || ''
  const atIdx   = raw.indexOf('@')
  const colonIdx = raw.lastIndexOf(':')
  return {
    user: atIdx > -1 ? raw.slice(0, atIdx) : '',
    host: atIdx > -1 && colonIdx > atIdx ? raw.slice(atIdx + 1, colonIdx) : raw.slice(atIdx + 1),
    port: colonIdx > atIdx ? raw.slice(colonIdx + 1) : '22'
  }
})

// 双击复制 IP
const copied = ref(false)
let copyTimer = null

const copyHost = async () => {
  const ip = connParts.value.host
  if (!ip) return
  try {
    await navigator.clipboard.writeText(ip)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // 降级：execCommand
    const el = document.createElement('textarea')
    el.value = ip
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1800)
  }
}
</script>

<style scoped>
/* ===== 状态栏主体 ===== */
.sb {
  flex-shrink: 0;
  height: 28px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 0;

  background: rgba(18, 18, 22, 0.82);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
  user-select: none;
  position: relative;
  z-index: 100;
}

/* ===== 左区 ===== */
.sb-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 连接徽章 */
.sb-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 7px 1px 5px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1px;
}

.sb-badge.connected {
  background: rgba(48, 209, 88, 0.12);
  color: #30d158;
  border: 1px solid rgba(48, 209, 88, 0.2);
}

/* LED 呼吸灯 */
.sb-led {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #30d158;
  box-shadow: 0 0 5px rgba(48, 209, 88, 0.7);
  animation: led-pulse 2.4s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes led-pulse {
  0%, 100% { opacity: 1;   box-shadow: 0 0 4px rgba(48, 209, 88, 0.7); }
  50%       { opacity: 0.5; box-shadow: 0 0 2px rgba(48, 209, 88, 0.3); }
}

/* 分隔点 */
.sb-sep {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

/* 主机信息 */
.sb-host {
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(255, 255, 255, 0.42);
  padding: 2px 7px;
  border-radius: 5px;
  cursor: default;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.sb-host:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
}

.sb-host--copied {
  background: rgba(48, 209, 88, 0.1) !important;
  border-color: rgba(48, 209, 88, 0.2) !important;
  color: #30d158 !important;
}

.sb-host-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.7;
}

.sb-host-text {
  font-family: 'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.2px;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 分段着色 */
.sb-conn-user {
  color: rgba(255, 255, 255, 0.35);
}

.sb-conn-at {
  color: rgba(255, 255, 255, 0.2);
  margin: 0 1px;
}

.sb-conn-host {
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.sb-conn-sep {
  color: rgba(255, 255, 255, 0.2);
}

.sb-conn-port {
  color: rgba(100, 180, 255, 0.7);
  font-size: 10.5px;
}

/* 已复制提示 */
.sb-host-copied-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  color: #30d158;
}

/* ===== 弹性空间 ===== */
.sb-spacer { flex: 1; }

/* ===== 右区操作按钮组 ===== */
.sb-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 竖向分隔线 */
.sb-divider {
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
  flex-shrink: 0;
}

/* 通用功能按钮 */
.sb-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.14s, color 0.14s;
  white-space: nowrap;
  height: 22px;
}

.sb-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.88);
}

.sb-btn:active {
  background: rgba(255, 255, 255, 0.06);
}

/* 激活态（文件管理器打开时） */
.sb-btn--active {
  background: rgba(10, 132, 255, 0.18);
  color: #4da3ff;
  border: 1px solid rgba(10, 132, 255, 0.25);
}

.sb-btn--active:hover {
  background: rgba(10, 132, 255, 0.26);
  color: #6db8ff;
}

.sb-btn-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.9;
}
</style>
