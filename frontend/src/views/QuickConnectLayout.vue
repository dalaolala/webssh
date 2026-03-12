<template>
  <div class="quick-connect-layout">
    <!-- 固定顶部栏 -->
    <div class="layout-header" :class="{ dark: (activeTab && activeTab.type === 'terminal') || isDark }">

      <!-- 更多标签按钮（左侧） -->
      <el-tooltip content="查看所有标签" placement="bottom" v-if="showMoreTabsBtn">
        <el-button
          class="more-tabs-btn"
          text
          size="small"
          @click="showTabsPanel = !showTabsPanel"
        >
          <el-icon class="more-tabs-icon"><Menu /></el-icon>
          <el-icon class="more-tabs-arrow"><ArrowDown /></el-icon>
        </el-button>
      </el-tooltip>

      <!-- 动态 Tab 列表（包含加号） -->
      <div class="tabs-list" ref="tabsListRef">
        <div 
          v-for="tab in visibleTabs" 
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
        
        <!-- 新建标签按钮（跟在tab后面） -->
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

    <!-- 标签列表面板 -->
    <Teleport to="body">
      <div 
        v-if="showTabsPanel" 
        class="tabs-panel-overlay"
        @click="showTabsPanel = false"
      >
        <div 
          class="tabs-panel" 
          :class="{ dark: (activeTab && activeTab.type === 'terminal') || isDark }"
          @click.stop
        >
          <!-- 搜索框 -->
          <div class="tabs-panel-search">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="tabSearchKeyword"
              type="text"
              class="search-input"
              placeholder="搜索标签"
              ref="searchInputRef"
            />
            <span class="tabs-count">{{ filteredTabs.length }}</span>
          </div>
          <!-- 标签列表 -->
          <div class="tabs-panel-content">
            <div 
              v-for="tab in filteredTabs" 
              :key="tab.id"
              class="tabs-panel-item"
              :class="{ active: activeTabId === tab.id }"
              @click="switchToTab(tab.id)"
            >
              <span class="tab-dot" v-if="tab.type === 'terminal'"></span>
              <el-icon class="tab-icon-sftp" v-if="tab.type === 'sftp'"><Folder /></el-icon>
              <el-icon class="tab-icon-form" v-if="tab.type === 'form'"><Connection /></el-icon>
              <span class="tab-label">{{ getTabLabel(tab) }}</span>
              <el-icon class="tab-close" @click.stop="closeTab(tab.id)" v-if="tabs.length > 1"><Close /></el-icon>
            </div>
            <div v-if="filteredTabs.length === 0" class="tabs-panel-empty">
              没有找到匹配的标签
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 子页面内容 -->
    <div class="layout-content" :class="{ 'dark-theme': isDark }">
      <div 
        v-for="tab in tabs" 
        :key="tab.id" 
        v-show="activeTabId === tab.id" 
        class="tab-content-wrapper"
      >
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Close, Folder, Menu, ArrowDown, Connection, Search } from '@element-plus/icons-vue'
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

// 标签面板相关状态
const showTabsPanel = ref(false)
const tabSearchKeyword = ref('')
const tabsListRef = ref(null)
const showMoreTabsBtn = ref(false)
const searchInputRef = ref(null)
const visibleTabCount = ref(999) // 可见的标签数量

// 计算属性
const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value))

// 过滤后的标签列表
const filteredTabs = computed(() => {
  if (!tabSearchKeyword.value) return tabs.value
  const keyword = tabSearchKeyword.value.toLowerCase()
  return tabs.value.filter(tab => {
    const label = getTabLabel(tab).toLowerCase()
    return label.includes(keyword)
  })
})

// 可见的标签列表（根据宽度计算）
const visibleTabs = computed(() => {
  // 如果所有标签都能放下，显示所有
  if (tabs.value.length <= visibleTabCount.value) {
    return tabs.value
  }
  // 否则只显示能放下的数量，但确保当前激活的标签可见
  const activeIndex = tabs.value.findIndex(t => t.id === activeTabId.value)
  const result = tabs.value.slice(0, visibleTabCount.value)
  
  // 如果当前激活的标签不在可见列表中，替换最后一个
  if (activeIndex >= visibleTabCount.value) {
    result.pop()
    result.push(tabs.value[activeIndex])
  }
  return result
})

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

const switchToTab = (id) => {
  activeTabId.value = id
  showTabsPanel.value = false
  tabSearchKeyword.value = ''
}

// 检查是否需要显示"更多标签"按钮，并计算能放下的标签数量
const checkOverflow = () => {
  nextTick(() => {
    if (tabsListRef.value) {
      const tabsList = tabsListRef.value
      const containerWidth = tabsList.clientWidth
      
      // 估算每个标签的平均宽度（包含gap）
      const tabElements = tabsList.querySelectorAll('.terminal-tab')
      if (tabElements.length === 0) {
        visibleTabCount.value = 999
        showMoreTabsBtn.value = false
        return
      }
      
      // 计算已有标签的总宽度
      let totalWidth = 0
      tabElements.forEach(el => {
        totalWidth += el.offsetWidth + 8 // 8px gap
      })
      
      // 计算平均标签宽度
      const avgTabWidth = totalWidth / tabElements.length
      
      // 计算能放下的标签数量（保守估计）
      const maxTabs = Math.floor(containerWidth / avgTabWidth)
      
      // 如果标签总数量超过能放下的数量，显示更多按钮
      if (tabs.value.length > maxTabs) {
        visibleTabCount.value = Math.max(1, maxTabs - 1) // 留出余量
        showMoreTabsBtn.value = true
      } else {
        visibleTabCount.value = 999
        showMoreTabsBtn.value = false
      }
    }
  })
}

// 监听标签数量变化
watch(() => tabs.value.length, () => {
  checkOverflow()
})

// 监听面板打开，自动聚焦搜索框
watch(showTabsPanel, (val) => {
  if (val) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    tabSearchKeyword.value = ''
  }
})

// 点击外部关闭面板
const handleClickOutside = (e) => {
  if (showTabsPanel.value && !e.target.closest('.tabs-panel') && !e.target.closest('.more-tabs-btn')) {
    showTabsPanel.value = false
  }
}

onMounted(() => {
  checkOverflow()
  window.addEventListener('resize', checkOverflow)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkOverflow)
  document.removeEventListener('click', handleClickOutside)
})

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

/* 更多标签按钮 */
.more-tabs-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px !important;
  border-radius: 6px;
  color: #86868b;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.more-tabs-icon {
  font-size: 16px;
}

.more-tabs-arrow {
  font-size: 12px;
}

.more-tabs-btn:hover {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.08);
}

.layout-header:not(.dark) .more-tabs-btn {
  color: #606266;
}

.layout-header:not(.dark) .more-tabs-btn:hover {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.08);
}

.layout-header.dark .more-tabs-btn {
  color: #a0a0a0;
}

.layout-header.dark .more-tabs-btn:hover {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.15);
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
  min-width: 0;
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

.tab-icon-form {
  color: #67c23a;
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

<style>
.tabs-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
}

.tabs-panel {
  position: fixed;
  top: 44px;
  left: 14px;
  width: 240px;
  max-height: 320px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: panelSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.tabs-panel.dark {
  background: rgba(45, 45, 45, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
}

@keyframes panelSlide {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 搜索框 - 原生风格 */
.tabs-panel-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.tabs-panel.dark .tabs-panel-search {
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.search-icon {
  font-size: 16px;
  color: #999;
  flex-shrink: 0;
}

.tabs-panel.dark .search-icon {
  color: #777;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.search-input::placeholder {
  color: #aaa;
}

.tabs-panel.dark .search-input {
  color: #eee;
}

.tabs-panel.dark .search-input::placeholder {
  color: #777;
}

.tabs-count {
  font-size: 12px;
  color: #999;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.tabs-panel.dark .tabs-count {
  color: #888;
  background: rgba(255, 255, 255, 0.08);
}

/* 标签列表 */
.tabs-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.tabs-panel-content::-webkit-scrollbar {
  width: 6px;
}

.tabs-panel-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.tabs-panel.dark .tabs-panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

.tabs-panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-radius: 8px;
}

.tabs-panel-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.tabs-panel.dark .tabs-panel-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.tabs-panel-item.active {
  background-color: rgba(0, 122, 255, 0.1);
}

.tabs-panel.dark .tabs-panel-item.active {
  background-color: rgba(0, 122, 255, 0.2);
}

.tabs-panel-item .tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #52c41a;
  box-shadow: 0 0 4px rgba(82, 196, 26, 0.4);
  flex-shrink: 0;
}

.tabs-panel-item .tab-icon-sftp {
  color: #409eff;
  font-size: 14px;
  flex-shrink: 0;
}

.tabs-panel-item .tab-icon-form {
  color: #67c23a;
  font-size: 14px;
  flex-shrink: 0;
}

.tabs-panel-item .tab-label {
  font-size: 13px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tabs-panel.dark .tabs-panel-item .tab-label {
  color: #eee;
}

.tabs-panel-item .tab-close {
  font-size: 14px;
  color: #999;
  border-radius: 50%;
  padding: 2px;
  opacity: 0;
  transition: all 0.15s ease;
}

.tabs-panel-item:hover .tab-close {
  opacity: 1;
}

.tabs-panel-item .tab-close:hover {
  background-color: rgba(0, 0, 0, 0.08);
  color: #f56c6c;
}

.tabs-panel.dark .tabs-panel-item .tab-close:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.tabs-panel-empty {
  padding: 32px 16px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.tabs-panel.dark .tabs-panel-empty {
  color: #777;
}
</style>
