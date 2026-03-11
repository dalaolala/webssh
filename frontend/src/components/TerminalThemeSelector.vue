<template>
  <div class="terminal-theme-selector" ref="rootRef">
    <!-- 触发按钮 -->
    <button class="appearance-btn" :class="{ active: visible }" @click="toggle" aria-label="终端外观">
      <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
        <path d="M8 1a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 1zm0 9a2 2 0 100-4 2 2 0 000 4zm0-5.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13z" opacity="0"/>
        <path d="M6 1H4a1 1 0 00-1 1v1H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1h-1V2a1 1 0 00-1-1H6zm0 1h4v1H6V2zM2 4h12v8H2V4zm3 2a1 1 0 100 2 1 1 0 000-2zm3 0a1 1 0 100 2 1 1 0 000-2zm3 0a1 1 0 100 2 1 1 0 000-2z" opacity="0"/>
        <!-- 画笔/外观图标 -->
        <path d="M12.146.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-10 10a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 015 12.5V12h-.5a.5.5 0 01-.5-.5V11h-.5a.5.5 0 01-.468-.325z"/>
      </svg>
      <span class="appearance-btn-label">外观</span>
    </button>

    <!-- 浮层面板 -->
    <Transition name="panel-pop">
      <div v-if="visible" class="appearance-panel" @click.stop>
        <!-- 标题栏 -->
        <div class="panel-header">
          <span class="panel-title">终端外观</span>
          <button class="panel-close" @click="visible = false" aria-label="关闭">
            <svg viewBox="0 0 12 12" fill="currentColor" width="10" height="10">
              <circle cx="6" cy="6" r="6" fill="rgba(0,0,0,0.15)"/>
              <path d="M4 4l4 4M8 4l-4 4" stroke="rgba(0,0,0,0.5)" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="panel-body">
          <!-- 字体大小 -->
          <div class="pref-row">
            <span class="pref-label">字体大小</span>
            <div class="stepper">
              <button
                class="stepper-btn"
                :disabled="terminalThemeStore.fontSize <= 10"
                @click="terminalThemeStore.decreaseFontSize()"
                aria-label="减小"
              >−</button>
              <span class="stepper-value">{{ terminalThemeStore.fontSize }}</span>
              <button
                class="stepper-btn"
                :disabled="terminalThemeStore.fontSize >= 30"
                @click="terminalThemeStore.increaseFontSize()"
                aria-label="增大"
              >+</button>
            </div>
          </div>

          <div class="panel-separator"></div>

          <!-- 配色方案 -->
          <div class="pref-section-label">配色方案</div>

          <!-- 深色 -->
          <div class="theme-group-label">深色</div>
          <div class="theme-grid">
            <button
              v-for="theme in terminalThemeStore.darkThemes"
              :key="theme.id"
              class="theme-tile"
              :class="{ selected: terminalThemeStore.currentThemeId === theme.id }"
              @click="terminalThemeStore.setTheme(theme.id)"
              :title="theme.name"
            >
              <div class="tile-preview" :style="{ background: theme.theme.background }">
                <span class="tile-line" :style="{ background: theme.theme.green || theme.theme.foreground }"></span>
                <span class="tile-line short" :style="{ background: theme.theme.foreground, opacity: 0.5 }"></span>
                <span class="tile-cursor" :style="{ background: theme.theme.cursor }"></span>
              </div>
              <span class="tile-name">{{ theme.name }}</span>
              <svg v-if="terminalThemeStore.currentThemeId === theme.id" class="tile-check" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="5" fill="#007aff"/>
                <path d="M2.5 5l2 2 3-3" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <!-- 亮色 -->
          <div class="theme-group-label" style="margin-top:14px;">亮色</div>
          <div class="theme-grid">
            <button
              v-for="theme in terminalThemeStore.lightThemes"
              :key="theme.id"
              class="theme-tile"
              :class="{ selected: terminalThemeStore.currentThemeId === theme.id }"
              @click="terminalThemeStore.setTheme(theme.id)"
              :title="theme.name"
            >
              <div class="tile-preview" :style="{ background: theme.theme.background }">
                <span class="tile-line" :style="{ background: theme.theme.green || theme.theme.foreground }"></span>
                <span class="tile-line short" :style="{ background: theme.theme.foreground, opacity: 0.5 }"></span>
                <span class="tile-cursor" :style="{ background: theme.theme.cursor }"></span>
              </div>
              <span class="tile-name">{{ theme.name }}</span>
              <svg v-if="terminalThemeStore.currentThemeId === theme.id" class="tile-check" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="5" fill="#007aff"/>
                <path d="M2.5 5l2 2 3-3" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 底部 -->
        <div class="panel-footer">
          <button class="reset-btn" @click="terminalThemeStore.resetToDefaults()">重置为默认</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useTerminalThemeStore } from '@/stores/terminalTheme'

const terminalThemeStore = useTerminalThemeStore()
const visible = ref(false)
const rootRef = ref(null)

const toggle = () => { visible.value = !visible.value }

const onClickOutside = (e) => {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    visible.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<style scoped>
.terminal-theme-selector {
  position: relative;
  display: inline-flex;
}

/* 触发按钮 */
.appearance-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(255,255,255,0.55);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  letter-spacing: 0.1px;
}

.appearance-btn:hover {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.85);
}

.appearance-btn.active {
  background: rgba(255,255,255,0.14);
  color: #fff;
}

/* 面板 */
.appearance-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: rgba(248, 248, 250, 0.97);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
  z-index: 9999;
  overflow: hidden;
  transform-origin: bottom right;
}

/* 标题栏 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px 10px;
  border-bottom: 1px solid rgba(0,0,0,0.07);
  background: rgba(0,0,0,0.02);
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: -0.2px;
}

.panel-close {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  padding: 0;
  transition: opacity 0.1s;
}

.panel-close:hover { opacity: 0.7; }

/* 内容区 */
.panel-body {
  padding: 12px 14px;
  max-height: 440px;
  overflow-y: auto;
}

.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }

/* 偏好行 */
.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;
}

.pref-label {
  font-size: 13px;
  color: #1d1d1f;
  font-weight: 400;
}

/* 步进器 */
.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 7px;
  overflow: hidden;
  background: #fff;
}

.stepper-btn {
  width: 26px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 16px;
  line-height: 1;
  color: #1d1d1f;
  cursor: pointer;
  transition: background 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper-btn:first-child {
  border-right: 1px solid rgba(0,0,0,0.1);
}

.stepper-btn:last-child {
  border-left: 1px solid rgba(0,0,0,0.1);
}

.stepper-btn:hover:not(:disabled) {
  background: rgba(0,0,0,0.06);
}

.stepper-btn:disabled {
  color: rgba(0,0,0,0.2);
  cursor: not-allowed;
}

.stepper-value {
  min-width: 32px;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #1d1d1f;
  font-variant-numeric: tabular-nums;
}

/* 分隔线 */
.panel-separator {
  height: 1px;
  background: rgba(0,0,0,0.07);
  margin: 10px 0;
}

/* section label */
.pref-section-label {
  font-size: 11px;
  font-weight: 600;
  color: #86868b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

/* 分组标签 */
.theme-group-label {
  font-size: 11px;
  color: #86868b;
  font-weight: 500;
  margin-bottom: 8px;
}

/* 主题网格 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

/* 主题卡片 */
.theme-tile {
  position: relative;
  border: 1.5px solid rgba(0,0,0,0.1);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: transparent;
  padding: 0;
  transition: border-color 0.15s, transform 0.1s, box-shadow 0.15s;
  text-align: left;
}

.theme-tile:hover {
  border-color: rgba(0,0,0,0.25);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
}

.theme-tile.selected {
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0,122,255,0.2);
}

/* 预览区 */
.tile-preview {
  height: 44px;
  padding: 8px 7px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.tile-line {
  height: 2px;
  border-radius: 1px;
  width: 100%;
  display: block;
}

.tile-line.short {
  width: 55%;
}

.tile-cursor {
  position: absolute;
  bottom: 6px;
  left: 7px;
  width: 4px;
  height: 10px;
  border-radius: 1px;
  display: block;
  animation: cur-blink 1.4s infinite;
}

@keyframes cur-blink {
  0%, 49% { opacity: 0.9; }
  50%, 100% { opacity: 0.1; }
}

/* 主题名 */
.tile-name {
  display: block;
  padding: 4px 5px;
  font-size: 10px;
  font-weight: 500;
  color: #1d1d1f;
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.theme-tile.selected .tile-name {
  color: #007aff;
}

/* 选中对勾 */
.tile-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
}

/* 底部 */
.panel-footer {
  padding: 10px 14px;
  border-top: 1px solid rgba(0,0,0,0.07);
  background: rgba(0,0,0,0.02);
}

.reset-btn {
  width: 100%;
  height: 28px;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 6px;
  background: #fff;
  color: #1d1d1f;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s;
}

.reset-btn:hover {
  background: #f0f0f0;
}

/* 动画 */
.panel-pop-enter-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.panel-pop-enter-from,
.panel-pop-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(6px);
}
</style>
