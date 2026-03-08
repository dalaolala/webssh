<template>
  <div class="quick-connect-layout">
    <!-- 固定顶部栏 -->
    <div class="layout-header" :class="{ dark: (activeTab && activeTab.type === 'terminal') || isDark }">

      <!-- 动态 Tab 列表 -->
      <div class="tabs-list">
        <div 
          v-for="tab in tabs" 
          :key="tab.id"
          class="terminal-tab"
          :class="{ active: activeTabId === tab.id }"
          @click="activeTabId = tab.id"
        >
          <span class="tab-dot" v-if="tab.type === 'terminal'"></span>
          <el-icon class="tab-icon-sftp" v-if="tab.type === 'sftp'"><Folder /></el-icon>
          <span class="tab-label">{{ getTabLabel(tab) }}</span>
          <el-icon class="tab-close" @click.stop="closeTab(tab.id)" v-if="tabs.length > 1"><Close /></el-icon>
        </div>
        
        <el-tooltip content="新建会话" placement="bottom">
          <el-button 
            class="new-tab-btn"
            text 
            circle 
            size="small" 
            @click="createNewTab"
          >
            <el-icon><Plus /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <!-- 主题切换按钮 -->
      <div class="header-actions">
        <ThemeToggle />
      </div>
    </div>

    <!-- 子页面内容 -->
    <div class="layout-content" :class="{ 'dark-theme': isDark }">
      <div v-for="tab in tabs" :key="tab.id" v-show="activeTabId === tab.id" class="tab-content-wrapper">
        <QuickConnect 
          v-if="tab.type === 'form'" 
          @connect="handleConnect(tab.id, $event)" 
        />
        <QuickConnectTerminal 
          v-else-if="tab.type === 'terminal'" 
          :tab-id="tab.id"
          :connection-info="tab.connectionInfo"
          @close="closeTab(tab.id)"
        />
        <QuickConnectSftp 
          v-else-if="tab.type === 'sftp'" 
          :tab-id="tab.id"
          :connection-info="tab.connectionInfo"
          @close="closeTab(tab.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Close, Folder } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'
import QuickConnect from './QuickConnect.vue'
import QuickConnectTerminal from './QuickConnectTerminal.vue'
import QuickConnectSftp from './QuickConnectSftp.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const generateId = () => 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

const tabs = ref([
  { id: generateId(), type: 'form', connectionInfo: null }
])
const activeTabId = ref(tabs.value[0].id)

const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value))

const getTabLabel = (tab) => {
  if (tab.type === 'form') return '快速连接'
  const conn = tab.connectionInfo
  if (!conn) return '会话'
  const name = conn.name || conn.host || '未命名'
  return tab.type === 'sftp' ? `[SFTP] ${name}` : name
}

const createNewTab = () => {
  const newTab = { id: generateId(), type: 'form', connectionInfo: null }
  tabs.value.push(newTab)
  activeTabId.value = newTab.id
}

const closeTab = (id) => {
  const index = tabs.value.findIndex(t => t.id === id)
  if (index !== -1) {
    tabs.value.splice(index, 1)
    if (activeTabId.value === id) {
      const newActive = tabs.value[index - 1] || tabs.value[index]
      if (newActive) activeTabId.value = newActive.id
    }
  }
}

const handleConnect = (tabId, connectionInfo) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab) {
    tab.type = connectionInfo.mode || 'terminal'
    tab.connectionInfo = connectionInfo
  }
}
</script>

<style scoped>
.quick-connect-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 36px;
  flex-shrink: 0;
  z-index: 100;
  gap: 8px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.layout-header.dark {
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-divider {
  width: 1px;
  height: 14px;
  background: #dcdfe6;
  margin-right: 8px;
}

.layout-header.dark .header-divider {
  background: #555;
}

/* Tabs List */
.tabs-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
}
.tabs-list::-webkit-scrollbar {
  display: none;
}

/* Terminal Tab */
.terminal-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: transparent;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.terminal-tab.active {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
}

.layout-header:not(.dark) .terminal-tab.active {
  background: #fff;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #52c41a;
  box-shadow: 0 0 4px rgba(82, 196, 26, 0.4);
  flex-shrink: 0;
}

.tab-icon-sftp {
  color: #409eff;
  font-size: 14px;
}

.tab-label {
  font-size: 12px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.layout-header:not(.dark) .tab-label {
  color: #606266;
}

.tab-close {
  font-size: 14px;
  color: #999;
  border-radius: 50%;
  padding: 2px;
  margin-left: 4px;
}

.tab-close:hover {
  background-color: rgba(255,255,255,0.2);
  color: #fff;
}
.layout-header:not(.dark) .tab-close:hover {
  background-color: rgba(0,0,0,0.1);
  color: #333;
}

.new-tab-btn {
  color: #86868b;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.new-tab-btn:hover {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.08);
}

.layout-header:not(.dark) .new-tab-btn {
  color: #86868b;
}

.layout-header:not(.dark) .new-tab-btn:hover {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.08);
}

.layout-header.dark .new-tab-btn {
  color: #86868b;
}

.layout-header.dark .new-tab-btn:hover {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.15);
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background-color: #f5f5f7;
  transition: background-color 0.3s ease;
}

.layout-content.dark-theme {
  background-color: #000000;
}

.tab-content-wrapper {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
