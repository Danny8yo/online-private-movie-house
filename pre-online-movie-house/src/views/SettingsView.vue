<template>
  <div class="settings-container">
    <div class="settings-panel">
      <h2>API 设置</h2>
      <p class="description">配置后端API地址用于测试</p>

      <div class="settings-group">
        <label>后端 API 地址</label>
        <input 
          v-model="apiUrl" 
          type="url" 
          placeholder="例如: http://localhost:3000/api"
          @keyup.enter="saveSettings"
        />
        <small class="help-text">不包含 /api 路径，系统会自动添加</small>
      </div>

      <div class="settings-group">
        <label>默认创建者昵称</label>
        <input 
          v-model="defaultNickname" 
          type="text" 
          placeholder="输入默认昵称"
          maxlength="20"
        />
      </div>

      <div class="button-group">
        <button class="btn-primary" @click="saveSettings">保存设置</button>
        <button class="btn-secondary" @click="resetSettings">恢复默认</button>
      </div>

      <!-- 状态消息 -->
      <div v-if="message" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <!-- API 测试区域 -->
      <div class="divider"></div>

      <h3>API 测试</h3>
      
      <div class="test-section">
        <h4>获取房间统计</h4>
        <button class="btn-test" @click="testGetStats" :disabled="isTesting">
          {{ isTesting ? '测试中...' : '点击测试' }}
        </button>
        <pre v-if="testResult" class="test-result">{{ testResult }}</pre>
      </div>

      <div class="test-section">
        <h4>获取房间列表</h4>
        <button class="btn-test" @click="testGetRoomList" :disabled="isTesting">
          {{ isTesting ? '测试中...' : '点击测试' }}
        </button>
        <pre v-if="testResult" class="test-result">{{ testResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DEFAULT_API_URL, getApiUrl, setApiUrl } from '@/config/api'
import { reinitializeApiClient, roomApi } from '@/api/roomApi'

const apiUrl = ref(getApiUrl())
const defaultNickname = ref(localStorage.getItem('userNickname') || '房主')
const isTesting = ref(false)
const testResult = ref('')
const message = ref<{type: string; text: string} | null>(null)

const saveSettings = () => {
  if (!apiUrl.value.trim()) {
    message.value = { type: 'error', text: '请输入有效的API地址' }
    return
  }

  setApiUrl(apiUrl.value)
  reinitializeApiClient()
  localStorage.setItem('userNickname', defaultNickname.value)
  
  message.value = { type: 'success', text: '设置已保存，API客户端已重新初始化' }
  
  setTimeout(() => {
    message.value = null
  }, 3000)
}

const resetSettings = () => {
  apiUrl.value = DEFAULT_API_URL
  defaultNickname.value = '房主'
  saveSettings()
}

const testGetStats = async () => {
  isTesting.value = true
  testResult.value = ''

  try {
    const response = await roomApi.getStats()
    testResult.value = JSON.stringify(response.data, null, 2)
  } catch (error: any) {
    testResult.value = JSON.stringify(
      {
        error: true,
        message: error.message,
        response: error.response?.data
      },
      null,
      2
    )
  } finally {
    isTesting.value = false
  }
}

const testGetRoomList = async () => {
  isTesting.value = true
  testResult.value = ''

  try {
    const response = await roomApi.getList({ page: 1, pageSize: 5 })
    testResult.value = JSON.stringify(response.data, null, 2)
  } catch (error: any) {
    testResult.value = JSON.stringify(
      {
        error: true,
        message: error.message,
        response: error.response?.data
      },
      null,
      2
    )
  } finally {
    isTesting.value = false
  }
}
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  background-color: #121212;
  color: #fff;
  display: flex;
  justify-content: center;
  padding: 2rem;
  font-family: 'Inter', system-ui, sans-serif;
}

.settings-panel {
  width: 100%;
  max-width: 600px;
  background-color: #1e1e1e;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid #333;
}

h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  color: #fff;
}

h3 {
  margin: 1.5rem 0 1rem 0;
  font-size: 1.2rem;
  color: #fff;
}

h4 {
  margin: 1rem 0 0.8rem 0;
  font-size: 1rem;
  color: #ddd;
}

.description {
  color: #888;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.settings-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
}

label {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #bbb;
  font-weight: 500;
}

input {
  background-color: #2c2c2c;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.8rem;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

.help-text {
  color: #666;
  font-size: 0.8rem;
  margin-top: 0.4rem;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-primary {
  flex: 1;
  background: #667eea;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  background: #5a6fd1;
}

.btn-primary:active {
  transform: translateY(1px);
}

.btn-secondary {
  flex: 1;
  background: transparent;
  color: #aaa;
  border: 1px solid #444;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: #666;
  color: #fff;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.message.success {
  background-color: #253b2a;
  border: 1px solid #4ade80;
  color: #4ade80;
}

.message.error {
  background-color: #3d2425;
  border: 1px solid #8b3a3f;
  color: #ff6b6b;
}

.divider {
  height: 1px;
  background-color: #333;
  margin: 2rem 0;
}

.test-section {
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.btn-test {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-test:hover:not(:disabled) {
  background: #5a6fd1;
}

.btn-test:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-result {
  background: #111;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.8rem;
  color: #0a0;
}
</style>
