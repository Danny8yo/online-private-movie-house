<template>
  <div class="join-container">
    <div class="content-wrapper">
      <header class="header">
        <button class="btn-back" @click="goHome">← 返回</button>
        <h2>加入房间</h2>
      </header>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
        <button class="btn-close" @click="errorMessage = ''">✕</button>
      </div>

      <!-- 密码输入框 -->
      <div v-if="showPasswordPrompt" class="modal-overlay">
        <div class="modal-content">
          <h3>房间需要密码</h3>
          <input 
            v-model="passwordInput" 
            type="password" 
            placeholder="请输入房间密码"
            @keyup.enter="confirmPassword"
            autofocus
          />
          <div class="modal-actions">
            <button class="btn-text" @click="showPasswordPrompt = false">取消</button>
            <button class="btn-primary" @click="confirmPassword" :disabled="!passwordInput">
              确认
            </button>
          </div>
        </div>
      </div>

      <div class="join-methods">
        <!-- 用户昵称输入 -->
        <div class="nickname-section">
          <h3>你的昵称</h3>
          <input 
            v-model="userNickname"
            type="text"
            placeholder="请输入你的昵称"
            maxlength="20"
          />
        </div>

        <!-- Method 1: Input Code -->
        <div class="method-section">
          <h3>通过房间号加入</h3>
          <div class="input-group">
            <input 
              v-model="inputRoomId" 
              type="text" 
              placeholder="请输入房间 ID"
              @keyup.enter="joinRoom(inputRoomId)"
            />
            <button class="btn-join" :disabled="!inputRoomId || isLoading" @click="joinRoom(inputRoomId)">
              {{ isLoading ? '加入中...' : '加入' }}
            </button>
          </div>
        </div>

        <div class="divider">
          <span>或者选择房间</span>
        </div>

        <!-- Method 2: Room List -->
        <div class="method-section">
          <h3>热门房间 {{ roomList.length > 0 ? `(${roomList.length})` : '' }}</h3>
          
          <!-- 加载状态 -->
          <div v-if="isLoading && roomList.length === 0" class="loading">
            加载中...
          </div>
          
          <!-- 房间列表 -->
          <div v-else-if="roomList.length > 0" class="room-list">
            <div 
              v-for="room in roomList" 
              :key="room.id" 
              class="room-card"
              @click="joinRoom(room.id, room.hasPassword)"
            >
              <div class="room-main">
                <div class="room-header">
                  <span class="room-title">{{ room.name }}</span>
                  <span v-if="room.hasPassword" class="lock-icon" title="需要密码">🔒</span>
                </div>
                <div class="room-notice" v-if="room.announcement">{{ room.announcement }}</div>
                <div class="room-creator" v-if="room.creatorNickname">
                  <span class="creator-icon">👤</span> {{ room.creatorNickname }}
                </div>
              </div>
              
              <div class="room-meta">
                <span class="room-id">ID: {{ room.id }}</span>
                <span class="user-count" :class="{ 'full': room.currentCount >= room.capacity }">
                  👥 {{ room.currentCount }} / {{ room.capacity }}
                </span>
                <span class="status-badge" :class="room.status">
                  {{ room.status === 'waiting' ? '等待中' : room.status === 'playing' ? '播放中' : room.status }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 无房间提示 -->
          <div v-else class="no-rooms">
            暂无可用房间，邀请朋友创建一个吧！
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import roomApi from '@/api/roomApi'

interface RoomInfo {
  id: string
  name: string
  announcement?: string
  currentCount: number
  capacity: number
  hasPassword: boolean
  status: string
  creatorNickname?: string
}

const router = useRouter()
const inputRoomId = ref('')
const userNickname = ref(localStorage.getItem('userNickname') || '')
const roomList = ref<RoomInfo[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const showPasswordPrompt = ref(false)
const passwordInput = ref('')
const pendingRoomId = ref('')

// 加载房间列表
const loadRoomList = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await roomApi.getList({
      page: 1,
      pageSize: 20
    })

    if (response.data.success) {
      roomList.value = response.data.data.list
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || '加载房间列表失败，请重试'
    console.error('加载房间列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

const goHome = () => {
  router.push('/')
}

// 处理加入房间
const handleJoinRoom = async (roomId: string, password?: string) => {
  if (!userNickname.value.trim()) {
    alert('请输入昵称')
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await roomApi.join(roomId, {
      nickname: userNickname.value,
      password: password || undefined
    })

    if (response.data.success) {
      const { room, participant } = response.data.data
      
      // 保存用户信息（participant.id 就是参与者ID，用于同步控制）
      localStorage.setItem('userId', participant.id)
      localStorage.setItem('participantId', participant.id) // 明确保存 participantId
      localStorage.setItem('userNickname', userNickname.value)
      localStorage.setItem('currentRoomId', room.id)
      
      console.log('加入房间成功')
      
      // 跳转到房间页
      router.push({
        name: 'room',
        params: { id: room.id }
      })
    }
  } catch (error: any) {
    const errorCode = error.response?.data?.errorCode
    const message = error.response?.data?.message || '加入房间失败，请重试'

    switch (errorCode) {
      case 'ROOM_NOT_FOUND':
        errorMessage.value = '房间不存在'
        break
      case 'ROOM_FULL':
        errorMessage.value = '房间已满，无法加入'
        break
      case 'INVALID_PASSWORD':
        errorMessage.value = '密码错误，请重试'
        showPasswordPrompt.value = true
        pendingRoomId.value = roomId
        return
      case 'ROOM_CLOSED':
        errorMessage.value = '房间已关闭'
        break
      default:
        errorMessage.value = message
    }

    console.error('加入房间失败:', error)
  } finally {
    isLoading.value = false
  }
}

const joinRoom = (roomId: string, hasPassword: boolean = false) => {
  if (!roomId) return
  
  if (hasPassword) {
    pendingRoomId.value = roomId
    showPasswordPrompt.value = true
  } else {
    handleJoinRoom(roomId)
  }
}

const confirmPassword = () => {
  if (!passwordInput.value.trim()) {
    alert('请输入密码')
    return
  }

  handleJoinRoom(pendingRoomId.value, passwordInput.value)
  showPasswordPrompt.value = false
  passwordInput.value = ''
  pendingRoomId.value = ''
}

onMounted(() => {
  loadRoomList()
})

</script>

<style scoped>
.join-container {
  min-height: 100vh;
  background-color: #121212;
  color: #fff;
  display: flex;
  justify-content: center;
  padding: 4rem 1rem;
  font-family: 'Inter', system-ui, sans-serif;
}

.content-wrapper {
  width: 100%;
  max-width: 600px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 3rem;
  gap: 1rem;
}

.btn-back {
  background: none;
  border: none;
  color: #a0a0a0;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: color 0.2s;
}

.btn-back:hover {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.1);
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.error-message {
  background-color: #3d2425;
  border: 1px solid #8b3a3f;
  color: #ff6b6b;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-close {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: #1e1e1e;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 2rem;
  min-width: 300px;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #fff;
}

.modal-content input {
  width: 100%;
  background: #2c2c2c;
  border: 1px solid #444;
  color: #fff;
  padding: 0.8rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.modal-content input:focus {
  outline: none;
  border-color: #667eea;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.join-methods {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.nickname-section {
  background: #1e1e1e;
  border: 1px solid #333;
  padding: 1rem;
  border-radius: 8px;
}

.nickname-section h3 {
  color: #a0a0a0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 0.5rem 0;
}

.nickname-section input {
  width: 100%;
  background: #2c2c2c;
  border: 1px solid #444;
  color: #fff;
  padding: 0.8rem;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

.nickname-section input:focus {
  outline: none;
  border-color: #667eea;
}

.method-section h3 {
  color: #a0a0a0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1rem;
}

.input-group {
  display: flex;
  gap: 1rem;
}

input {
  flex: 1;
  background: #1e1e1e;
  border: 1px solid #333;
  color: #fff;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #667eea;
}

.btn-join {
  background: #667eea;
  color: white;
  border: none;
  padding: 0 2rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-join:hover:not(:disabled) {
  background: #5a6fd1;
}

.btn-join:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #444;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #2a2a2a;
}

.divider span {
  padding: 0 1rem;
  font-size: 0.85rem;
}

.loading {
  text-align: center;
  color: #888;
  padding: 2rem;
}

.no-rooms {
  text-align: center;
  color: #888;
  padding: 2rem;
  background: #1e1e1e;
  border-radius: 8px;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.room-card {
  background: #1e1e1e;
  border: 1px solid #333;
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.room-card:hover {
  border-color: #667eea;
  background: #262626;
}

.room-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-right: 1rem;
}

.room-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: #fff;
}

.lock-icon {
  font-size: 0.9rem;
}

.room-notice {
  font-size: 0.85rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-creator {
  font-size: 0.85rem;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.2rem;
}

.creator-icon {
  font-size: 0.9rem;
}

.room-id {
  font-size: 0.75rem;
  color: #555;
  background: #111;
  padding: 2px 6px;
  border-radius: 4px;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  min-width: 100px;
}

.user-count {
  font-size: 0.9rem;
  color: #ccc;
  font-weight: 500;
}

.user-count.full {
  color: #ef4444;
}

.status-badge {
  font-size: 0.75rem;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.status-badge.playing {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.btn-join {
  background: #667eea;
  color: white;
  border: none;
  padding: 0 2rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-join:hover:not(:disabled) {
  background: #5a6fd1;
}

.btn-join:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #444;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #2a2a2a;
}

.divider span {
  padding: 0 1rem;
  font-size: 0.85rem;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.room-card {
  background: #1e1e1e;
  border: 1px solid #333;
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.room-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-right: 1rem;
}

.room-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.room-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: #fff;
}

.lock-icon {
  font-size: 0.9rem;
}

.room-notice {
  font-size: 0.85rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-playing {
  font-size: 0.85rem;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.2rem;
}

.playing-icon {
  font-size: 0.9rem;
}

.room-id {
  font-size: 0.75rem;
  color: #555;
  background: #111;
  padding: 2px 6px;
  border-radius: 4px;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  min-width: 80px;
}

.user-count {
  font-size: 0.9rem;
  color: #ccc;
  font-weight: 500;
}

.user-count.full {
  color: #ef4444;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.user-count {
  font-size: 0.9rem;
  color: #ccc;
}

.status-badge {
  font-size: 0.75rem;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}
</style>
