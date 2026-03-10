<template>
  <div class="xterm-terminal-container">
    <div 
      ref="terminalRef" 
      class="xterm-inner-container" 
      @click="focus"
      @contextmenu.prevent="showContextMenu"
    ></div>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenu.visible" 
      class="context-menu" 
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @mouseleave="hideContextMenu"
    >
      <div 
        class="menu-item" 
        @click="copyFromContextMenu"
        :class="{ disabled: !localHasSelection }"
      >
        <el-icon><DocumentCopy /></el-icon>
        <span>复制</span>
      </div>
      <div class="menu-divider"></div>
      <div 
        class="menu-item" 
        @click="pasteFromContextMenu"
        :class="{ disabled: !isConnected }"
      >
        <el-icon><DocumentAdd /></el-icon>
        <span>粘贴</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="selectAllFromContextMenu">
        <el-icon><Select /></el-icon>
        <span>全选</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="clearTerminal">
        <el-icon><Delete /></el-icon>
        <span>清屏</span>
      </div>
    </div>

    <!-- 多行粘贴确认对话框 -->
    <div v-if="pasteDialog.visible" class="paste-dialog-overlay" @click.self="cancelPaste">
      <div class="paste-dialog">
        <div class="paste-dialog-header">
          <div class="paste-dialog-title">
            <el-icon class="title-icon"><Warning /></el-icon>
            <span>粘贴多行内容确认</span>
          </div>
          <button class="paste-dialog-close" @click="cancelPaste">✕</button>
        </div>

        <div class="paste-dialog-body">
          <div class="paste-dialog-hint">
            检测到 <strong>{{ pasteDialog.lineCount }}</strong> 行内容，已自动去除行尾多余空格。可编辑后确认发送。
          </div>

          <!-- 编辑区 -->
          <div class="paste-editor-wrap">
            <div class="paste-editor-label">编辑内容</div>
            <textarea
              ref="pasteTextareaRef"
              v-model="pasteDialog.editText"
              class="paste-editor"
              spellcheck="false"
            ></textarea>
          </div>
        </div>

        <div class="paste-dialog-footer">
          <button class="paste-btn-cancel" @click="cancelPaste">取消</button>
          <button class="paste-btn-send" @click="confirmPaste">
            <el-icon><Promotion /></el-icon>
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'
import { DocumentCopy, DocumentAdd, Select, Delete, Warning, Promotion } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  isConnected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['data', 'resize', 'selection-change'])

const terminalRef = ref(null)

let term = null
let fitAddon = null
let isComposing = false
let wheelHandler = null
let viewportWheelHandler = null
let initialScrollTop = 0

// Context Menu State
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0
})

const localHasSelection = ref(false)

// ---- Paste Dialog State ----
const pasteTextareaRef = ref(null)
const pasteDialog = ref({
  visible: false,
  editText: '',
  lineCount: 0
})

/**
 * 去除每行行尾空格，保留换行结构
 */
const trimLineTrailingSpaces = (text) => {
  return text.split('\n').map(line => line.trimEnd()).join('\n')
}

/**
 * 检测是否多行，如果是则弹出对话框，否则直接发送
 */
const handlePasteText = (text) => {
  const trimmed = trimLineTrailingSpaces(text)
  const lines = trimmed.split('\n')
  if (lines.length > 1) {
    pasteDialog.value.editText = trimmed
    pasteDialog.value.lineCount = lines.length
    pasteDialog.value.visible = true
    nextTick(() => {
      pasteTextareaRef.value?.focus()
    })
  } else {
    emit('data', trimmed)
    nextTick(() => focus())
  }
}

const confirmPaste = () => {
  const text = pasteDialog.value.editText
  if (text && props.isConnected) {
    emit('data', text)
  }
  pasteDialog.value.visible = false
  nextTick(() => focus())
}

const cancelPaste = () => {
  pasteDialog.value.visible = false
  nextTick(() => focus())
}
// ---- End Paste Dialog ----

// Initialize terminal logic
const initTerminal = () => {
  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
    fontWeight: '400',
    fontWeightBold: '600',
    letterSpacing: 0,
    lineHeight: 1.15,
    theme: {
      background: '#1c1c1e',
      foreground: '#f5f5f5',
      cursor: '#a3a3a6', // Soft cursor
      cursorAccent: '#1c1c1e',
      selectionBackground: 'rgba(255, 255, 255, 0.25)', // Mac style subtle white selection
      black: '#000000',
      red: '#ff3b30',    // Apple Red
      green: '#34c759',  // Apple Green
      yellow: '#ffcc00', // Apple Yellow
      blue: '#0a84ff',   // Apple Blue
      magenta: '#ff375f',// Apple Magenta/Pink
      cyan: '#5ac8fa',   // Apple Cyan
      white: '#ffffff',
      brightBlack: '#686868',
      brightRed: '#ff6961',
      brightGreen: '#30d158',
      brightYellow: '#ffd60a',
      brightBlue: '#409cff',
      brightMagenta: '#ff6482',
      brightCyan: '#64d2ff',
      brightWhite: '#ffffff',
    },
    disableStdin: false,
    scrollback: 10000,
    convertEol: true,
    allowTransparency: false,
    tabStopWidth: 8,
    cursorStyle: 'block',
    bellStyle: 'sound',
    allowProposedApi: true,
    windowsMode: true,
    screenReaderMode: false,
    scrollOnUserInput: true,
    scrollOnOutput: false,
    scrollSensitivity: 3,
    smoothScrollDuration: 0,
    fastScrollSensitivity: 5,
    fastScrollModifier: 'alt',
    macOptionIsMeta: false,
    macOptionClickForcesSelection: false,
    rightClickSelectsWord: false,
    rendererType: 'canvas',
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  
  // 禁用 WebLinksAddon 的默认链接打开行为，避免 Electron 提示"需要使用新应用打开此链接"
  const webLinksAddon = new WebLinksAddon((event, uri) => {
    // 空函数阻止默认行为，链接点击不做任何处理
    event.preventDefault()
    event.stopPropagation()
    return false
  })
  term.loadAddon(webLinksAddon)
  
  if (terminalRef.value) {
    term.open(terminalRef.value)
    fitAddon.fit()
    term.focus()
    
    // IME Fix for composing
    setupHelperTextarea()
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          setupHelperTextarea()
        }
      })
    })
    observer.observe(terminalRef.value, { childList: true, subtree: true })
    
    // Terminal input handler
    term.onData((data) => {
      if (isComposing) return
      emit('data', data)
    })

    term.onSelectionChange(() => {
      localHasSelection.value = hasSelection()
      emit('selection-change', localHasSelection.value)
    })
    
    // Optimize wheel scroll
    enableWheelScroll()
    const wheelObserver = new MutationObserver(() => enableWheelScroll())
    wheelObserver.observe(terminalRef.value, { childList: true, subtree: true })
    
    wheelHandler = (e) => {
      const viewport = terminalRef.value?.querySelector('.xterm-viewport')
      if (viewport) {
        e.preventDefault()
        viewport.scrollTop += e.deltaY
      }
    }
    terminalRef.value.addEventListener('wheel', wheelHandler, { passive: false })
    
    // Custom key handlers
    term.attachCustomKeyEventHandler((event) => {
      // Prevent browser default on Ctrl+ keys except common text manipulation
      if ((event.ctrlKey || event.metaKey) && 
          !['c', 'v', 'a', 'z', 'x', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
      return true
    })
    
    // Space bar behavior
    term.attachCustomKeyEventHandler((event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        if (props.isConnected) {
          emit('data', ' ')
          term.scrollToBottom()
        }
        return false
      }
      return true
    })
    
    // Paste support
    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        navigator.clipboard.readText().then(text => {
          if (props.isConnected) {
            handlePasteText(text)
          }
        }).catch(err => console.warn('Paste failed:', err))
        return false
      }
      return true
    })
    
    // Copy support
    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        const selection = term.getSelection()
        if (selection) navigator.clipboard.writeText(selection)
      }
      return true
    })
  }
}

// Fixed IME for multi-character inputs (e.g. Chinese)
const setupHelperTextarea = () => {
  const textarea = terminalRef.value?.querySelector('.xterm-helper-textarea')
  if (textarea && !textarea._imeFixed) {
    textarea._imeFixed = true

    textarea.style.opacity = '0'
    textarea.style.color = 'transparent'
    textarea.style.position = 'absolute'
    textarea.style.bottom = '4px'
    textarea.style.left = '4px'
    textarea.style.width = '1px'
    textarea.style.height = '1px'
    textarea.style.zIndex = '1'
    textarea.style.caretColor = 'transparent'

    textarea.addEventListener('compositionstart', (e) => {
      isComposing = true
      e.stopImmediatePropagation()
    }, true)

    textarea.addEventListener('compositionupdate', (e) => {
      e.stopImmediatePropagation()
    }, true)

    textarea.addEventListener('compositionend', (e) => {
      e.stopImmediatePropagation()
      isComposing = false
      const text = e.data
      if (text && props.isConnected) {
        emit('data', text)
      }
      Promise.resolve().then(() => { textarea.value = '' })
    }, true)
  }
}

// Enhance viewport wheel scrolling
const enableWheelScroll = () => {
  const viewport = terminalRef.value?.querySelector('.xterm-viewport')
  if (viewport) {
    if (viewportWheelHandler) viewport.removeEventListener('wheel', viewportWheelHandler)
    
    viewportWheelHandler = (event) => {
      event.preventDefault()
      const deltaY = event.deltaY
      const deltaMode = event.deltaMode
      
      if (deltaMode === 0) {
        const scrollAmount = Math.sign(deltaY) * Math.ceil(Math.abs(deltaY) / 8)
        viewport.scrollTop += scrollAmount * 20
      } else if (deltaMode === 1) {
        viewport.scrollTop += deltaY * 20
      } else {
        viewport.scrollTop += deltaY * viewport.clientHeight
      }
    }
    
    viewport.addEventListener('wheel', viewportWheelHandler, { passive: false })
    viewport.style.overflowY = 'auto'
    viewport.style.overflowX = 'hidden'
  }
}

const handleResize = () => {
  if (fitAddon && term) {
    fitAddon.fit()
    const dimensions = fitAddon.proposeDimensions()
    if (dimensions) {
      const adjustedRows = Math.max(1, dimensions.rows - 1)
      term.resize(dimensions.cols, adjustedRows)
      emit('resize', {
        rows: adjustedRows,
        cols: dimensions.cols,
        height: dimensions.height,
        width: dimensions.width
      })
    }
  }
}

// Component methods to expose via defineExpose
const write = (data) => {
  if (term) term.write(data)
}

const writeError = (msg) => {
  if (term) term.write(`\r\n\x1b[31m${msg}\x1b[0m\r\n`)
}

const writeWarning = (msg) => {
  if (term) term.write(`\r\n\x1b[33m${msg}\x1b[0m\r\n`)
}

const focus = () => {
  if (term) term.focus()
}

const clear = () => {
  if (term) term.clear()
}

const getSelection = () => {
  return term ? term.getSelection() : ''
}

const selectAll = () => {
  if (term) term.selectAll()
}

const hasSelection = () => {
  return term && term.getSelection() && term.getSelection().length > 0
}

const scrollToTop = () => {
  if (term && typeof term.scrollToTop === 'function') term.scrollToTop()
}

const scrollToBottom = () => {
  if (term && typeof term.scrollToBottom === 'function') term.scrollToBottom()
}

// ------ Context Menu Methods ------
const showContextMenu = (event) => {
  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

const copyFromContextMenu = async () => {
  if (hasSelection()) {
    const selection = getSelection()
    try {
      await navigator.clipboard.writeText(selection)
      ElMessage.success(`已复制 ${selection.length} 个字符`)
      hideContextMenu()
    } catch (error) {
      console.warn('复制失败:', error)
      ElMessage.error('复制失败，请重试')
    }
  }
}

const pasteFromContextMenu = async () => {
  if (props.isConnected) {
    try {
      const text = await navigator.clipboard.readText()
      handlePasteText(text)
      hideContextMenu()
    } catch (error) {
      console.warn('粘贴失败:', error)
      ElMessage.error('粘贴失败，请重试')
    }
  }
}

const selectAllFromContextMenu = () => {
  selectAll()
  hideContextMenu()
}

const clearTerminal = () => {
  if (props.isConnected) {
    // 如果连接状态，发送 clear 命令到后端
    emit('data', 'clear\n')
  } else {
    // 如果未连接状态，本地清屏
    clear()
  }
  hideContextMenu()
}

const onDocumentClick = () => {
  if (contextMenu.value.visible) {
    hideContextMenu()
  }
}
// ------ End Context Menu Methods ------

const reset = () => {
  if (term) {
    term.reset()
    term.focus()
    term.write('\x1b[?25h')
    scrollToTop()
    const viewport = terminalRef.value?.querySelector('.xterm-viewport')
    if (viewport) viewport.scrollTop = initialScrollTop || 0
  }
}

const fit = () => {
  handleResize()
}

defineExpose({
  write,
  writeError,
  writeWarning,
  focus,
  clear,
  getSelection,
  selectAll,
  hasSelection,
  scrollToTop,
  scrollToBottom,
  reset,
  fit
})

onMounted(async () => {
  await nextTick()
  initTerminal()
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  if (term) {
    term.dispose()
    term = null
  }
  if (terminalRef.value && wheelHandler) {
    terminalRef.value.removeEventListener('wheel', wheelHandler)
    wheelHandler = null
  }
  const viewportEl = terminalRef.value?.querySelector('.xterm-viewport')
  if (viewportEl && viewportWheelHandler) {
    viewportEl.removeEventListener('wheel', viewportWheelHandler)
    viewportWheelHandler = null
  }
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', onDocumentClick)
})

</script>

<style scoped>
.xterm-terminal-container {
  flex: 1;
  width: 100%;
  padding: 8px 12px; /* Apple-style internal padding for the terminal component */
  padding-bottom: 12px;
  cursor: text;
  overflow: hidden;
  position: relative;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #1c1c1e; /* Apple Dark Mode Background */
}

.xterm-inner-container {
  flex: 1;
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.xterm-inner-container:hover {
  outline: 1px solid rgba(255, 255, 255, 0.1); /* Subtle hover outline */
}

/* 右键菜单样式 - Apple MacOS 风格 */
.context-menu {
  position: fixed;
  background: rgba(30, 30, 30, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  min-width: 140px;
  padding: 6px 0;
  animation: fadeIn 0.15s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95) translateY(-2px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  margin: 2px 6px;
  cursor: pointer;
  color: #f5f5f5;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  border-radius: 6px;
  transition: all 0.1s ease;
  gap: 10px;
}

.menu-item:hover {
  background-color: #0a84ff; /* Apple Blue */
  color: #ffffff;
}

.menu-item.disabled {
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background-color: transparent;
}

.menu-divider {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 6px 0;
}

.menu-item .el-icon {
  font-size: 14px;
  width: 16px;
  opacity: 0.9;
}

/* XTerm.js CSS overrides */
:deep(.xterm) {
  padding: 0 !important;
  overflow: hidden !important;
  height: 100% !important;
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.xterm-viewport) {
  background-color: transparent !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
  position: relative !important;
  direction: ltr !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: auto !important;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 12px;
}
:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  margin: 2px;
}
:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: content-box;
  transition: background 0.2s ease;
}
:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.5);
}
:deep(.xterm-viewport::-webkit-scrollbar-thumb:active) {
  background: rgba(255, 255, 255, 0.7);
}

:deep(.xterm-screen) {
  background-color: transparent !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: visible !important;
}

/* 强制在 xterm-screen 后方追加一段空白，确保滚动到底部时有足够间距 */
:deep(.xterm-screen::after) {
  content: "";
  display: block;
  height: 32px;
  width: 100%;
}

:deep(.xterm-helper-textarea) {
  opacity: 0 !important;
  color: transparent !important;
  caret-color: transparent !important;
  resize: none !important;
  outline: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.xterm .xterm-selection) {
  background-color: rgba(255, 255, 255, 0.25) !important;
  border-radius: 4px; /* Slightly rounded selection resembling macOS */
  mix-blend-mode: normal;
}

:deep(.xterm-scroll-area) {
  overflow: visible !important;
}

:deep(.xterm-char-measure-element) {
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  visibility: hidden !important;
  width: auto !important;
  height: auto !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

:deep(.xterm-rows), :deep(.xterm-row) {
  color: #f5f5f5 !important;
  background-color: transparent !important;
}

:deep(.xterm-selection-layer) {
  background-color: rgba(255, 255, 255, 0.25) !important;
}

/* ---- 多行粘贴确认对话框 ---- */
.paste-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.paste-dialog {
  background: #1e1e20;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  width: min(680px, 92vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: dialogIn 0.18s ease;
  overflow: hidden;
}

@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.paste-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.paste-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #f5f5f5;
}

.title-icon {
  color: #ffcc00;
  font-size: 16px;
}

.paste-dialog-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.45);
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}
.paste-dialog-close:hover {
  color: #f5f5f5;
  background: rgba(255,255,255,0.1);
}

.paste-dialog-body {
  padding: 16px 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.paste-dialog-hint {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  line-height: 1.5;
}
.paste-dialog-hint strong {
  color: #0a84ff;
}


.paste-editor-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.paste-editor-wrap {
  display: flex;
  flex-direction: column;
}



.paste-editor {
  width: 100%;
  min-height: 120px;
  max-height: 220px;
  resize: vertical;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #f0f0f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 10px 12px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
  tab-size: 4;
}
.paste-editor:focus {
  border-color: #0a84ff;
}


.paste-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.paste-btn-cancel {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 7px;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  padding: 7px 18px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.paste-btn-cancel:hover {
  background: rgba(255,255,255,0.14);
  color: #f5f5f5;
}

.paste-btn-send {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0a84ff;
  border: none;
  border-radius: 7px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 20px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.paste-btn-send:hover {
  background: #2196f3;
}
.paste-btn-send:active {
  transform: scale(0.97);
}
/* ---- End 多行粘贴对话框 ---- */
</style>
