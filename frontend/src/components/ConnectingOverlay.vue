<template>
  <Transition name="apple-overlay">
    <div v-if="visible" class="connecting-overlay">
      <div class="apple-connecting-wrap">
        <!-- 细线弧形 Spinner -->
        <div class="apple-spinner">
          <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <circle class="apple-arc" cx="22" cy="22" r="18" fill="none" stroke-width="2" />
          </svg>
        </div>

        <!-- 主文案 -->
        <p class="apple-connecting-title">{{ title }}</p>

        <!-- 副文案（可选） -->
        <p v-if="subtitle" class="apple-connecting-sub">{{ subtitle }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  /** 是否显示遮罩 */
  visible: {
    type: Boolean,
    default: false
  },
  /** 主标题，默认"正在连接服务器" */
  title: {
    type: String,
    default: '正在连接服务器'
  },
  /** 副文本，如 user@host:port，留空则不显示 */
  subtitle: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
/* ── 遮罩层 ── */
.connecting-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

/* ── 内容区 ── */
.apple-connecting-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

/* ── Spinner ── */
.apple-spinner {
  width: 40px;
  height: 40px;
  animation: appleSpin 0.9s linear infinite;
}

.apple-spinner svg {
  width: 100%;
  height: 100%;
}

.apple-arc {
  stroke: rgba(255, 255, 255, 0.92);
  stroke-linecap: round;
  stroke-dasharray: 56 113; /* 约半圈可见 */
  stroke-dashoffset: 0;
}

@keyframes appleSpin {
  to { transform: rotate(360deg); }
}

/* ── 文字 ── */
.apple-connecting-title {
  font-family: -apple-system, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.2px;
  margin: 0;
}

.apple-connecting-sub {
  font-family: -apple-system, 'SF Pro Text', 'PingFang SC', 'Helvetica Neue', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.3px;
  margin: 0;
}

/* ── Vue Transition ── */
.apple-overlay-enter-active {
  animation: appleOverlayIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.apple-overlay-leave-active {
  animation: appleOverlayIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) both reverse;
}

@keyframes appleOverlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* 内容弹入 */
.apple-overlay-enter-active .apple-connecting-wrap {
  animation: appleCardIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes appleCardIn {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
</style>
