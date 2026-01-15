<template>
  <div class="room-layout">
    <!-- 模态框：设置片源 -->
    <div v-if="showVideoSettings" class="modal-overlay">
      <div class="modal-content">
        <h2>更换片源</h2>
        <p>输入新的视频播放地址</p>
        <div class="input-column">
          <input 
            v-model="newVideoUrl" 
            placeholder="例如: https://example.com/movie.mp4" 
            @keyup.enter="updateVideoSource"
            ref="videoInput" 
            autofocus
            class="full-width-input"
          />
          <div class="modal-actions">
            <button class="btn-text" @click="showVideoSettings = false">取消</button>
            <button class="btn-primary" @click="updateVideoSource">确认更换</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 模态框：输入昵称 -->
    <div v-if="!username" class="modal-overlay">
      <div class="modal-content">
        <h2>欢迎加入放映室</h2>
        <p>请给自己起个名字吧</p>
        <div class="input-row">
          <input 
            v-model="tempUsername" 
            placeholder="你的昵称" 
            @keyup.enter="confirmUsername"
            ref="nameInput" 
            autofocus
          />
          <button class="btn-primary" @click="confirmUsername">进入</button>
        </div>
      </div>
    </div>

    <!-- 左侧：播放区域 -->
    <div class="main-area" :class="{ blurred: !username }">
      <header class="room-header">
        <div class="room-info">
          <h1>{{ roomInfo.name || '未命名房间' }}</h1>
          <span class="room-id">ID: {{ roomId }}</span>
        </div>
        <div class="header-actions">
          <!-- <button class="btn-secondary" @click="goBack">返回大厅</button> -->
          <button v-if="isOwner" class="btn-secondary" @click="showVideoSettings = true">设置片源</button>
          <button v-if="isOwner" class="btn-danger" @click="endSession">结束活动并解散</button>
          <button v-else class="btn-danger" @click="goBack">退出房间</button>
        </div>
      </header>

      <div class="player-container">
        <ArtPlayer
          ref="playerRef"
          :src="roomInfo.videoUrl"
          :sync-mode="!isOwner"
          class="video-player"
          airplay
          aspect-ratio
          auto-size
          auto-orientation
          auto-playback
          fast-forward
          flip
          fullscreen-web
          lock
          loop
          muted
          mini-progress-bar
          pip
          screenshot
          subtitle-offset
          @play="handlePlayerPlay"
          @pause="handlePlayerPause"
          @seek="handlePlayerSeek"
          @ratechange="handlePlayerRateChange"
          @sourcechange="handlePlayerSourceChange"
        />
      </div>

      <div class="control-bar">
        <!-- 模拟同步控制 -->
        <div class="playback-info">
          <span class="status-dot" :class="syncConnected ? 'online' : 'offline'"></span>
          <span>{{ connectedUsers }} 人在线 - {{ syncConnected ? '同步正常' : '同步断开' }}</span>
        </div>
        <button class="btn-sync" @click="forceSync">全员强制同步</button>
      </div>
    </div>

    <!-- 右侧：互动区域 -->
    <aside class="sidebar">
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: currentTab === 'chat' }"
          @click="currentTab = 'chat'"
        >
          讨论区
        </div>
        <div 
          class="tab"
          :class="{ active: currentTab === 'members' }"
          @click="currentTab = 'members'"
        >
          成员 ({{ members.length }})
        </div>
      </div>

      <!-- 聊天列表 -->
      <div 
        v-show="currentTab === 'chat'" 
        class="chat-messages" 
        ref="chatBox"
      >
        <div 
          v-for="(msg, index) in messages" 
          :key="index" 
          class="message-item"
          :class="{ 'system-msg': msg.type === 'system', 'self-msg': msg.isSelf }"
        >
          <span v-if="msg.type !== 'system'" class="sender">{{ msg.sender }}:</span>
          <span class="text">{{ msg.content }}</span>
        </div>
      </div>

      <!-- 成员列表 (新增) -->
      <div v-show="currentTab === 'members'" class="member-list">
        <div v-for="m in members" :key="m.id" class="member-item-row">
          <div class="avatar-placeholder">{{ m.avatar }}</div>
          <div class="member-info">
            <span class="name">{{ m.name }}</span>
            <span v-if="m.role === 'owner'" class="badge-owner">房主</span>
          </div>
        </div>
      </div>

      <div class="chat-input-area" v-show="currentTab === 'chat'">
        <input 
          v-model="newMessage" 
          @keyup.enter="sendMessage"
          type="text" 
          placeholder="参与讨论..." 
        />
        <button @click="sendMessage">发送</button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArtPlayer from '../components/ArtPlayer.vue'
import roomApi from '@/api/roomApi'
import syncService, { type SyncEvent, type VideoState, type MemberEvent } from '@/services/syncService'

const route = useRoute()
const router = useRouter()
const roomId = route.params.id as string

// 从 localStorage 获取用户信息
const userId = ref(localStorage.getItem('userId') || '')
const userNickname = ref(localStorage.getItem('userNickname') || '')

// 房间信息状态
const roomInfo = reactive({
  name: '',
  announcement: '',
  creatorId: '',
  currentCount: 0,
  capacity: 10,
  videoUrl: '',
  status: 'waiting'
})

// 参与者列表
const participants = ref<Array<{id: string; nickname: string; role: string; status: string}>>([])

const isOwner = computed(() => roomInfo.creatorId === userId.value)

// 用户名逻辑
const username = ref(userNickname.value)
const tempUsername = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

// 片源设置逻辑
const showVideoSettings = ref(false)
const newVideoUrl = ref('')
const videoInput = ref<HTMLInputElement | null>(null)
const isUpdatingVideo = ref(false)

const confirmUsername = () => {
  if (!tempUsername.value.trim()) return
  username.value = tempUsername.value
  userNickname.value = tempUsername.value
  localStorage.setItem('userNickname', username.value)
}

const updateVideoSource = async () => {
  if (!newVideoUrl.value.trim()) {
    alert('请输入有效的视频地址')
    return
  }

  if (!isOwner.value) {
    alert('只有房主可以更换视频源')
    return
  }

  isUpdatingVideo.value = true

  try {
    // 使用同步服务更换视频源
    await syncService.changeSource(userId.value, newVideoUrl.value.trim())

    roomInfo.videoUrl = newVideoUrl.value.trim()
    messages.push({
      type: 'system',
      content: '已更换视频源'
    })
    showVideoSettings.value = false
    newVideoUrl.value = ''
  } catch (error: any) {
    alert('更新片源失败：' + (error.message || '未知错误'))
  } finally {
    isUpdatingVideo.value = false
  }
}

// 状态模拟
const currentTab = ref<'chat' | 'members'>('chat')
const connectedUsers = ref(1)
const isConnected = ref(false)
const isLoading = ref(true)
const errorMessage = ref('')
const messages = reactive<Array<{type: string; sender?: string; content: string; isSelf?: boolean}>>([])
const newMessage = ref('')

// 成员列表（映射到 participants）
const members = computed(() => {
  return participants.value.map(p => ({
    id: p.id,
    name: p.nickname,
    role: p.role === 'creator' ? 'owner' : 'guest',
    avatar: p.nickname.charAt(0)
  }))
})

const goBack = () => {
  leaveRoomAPI()
}

const chatBox = ref<HTMLElement | null>(null)

// 播放器引用
const playerRef = ref<InstanceType<typeof ArtPlayer> | null>(null)

// 同步控制相关
const syncConnected = ref(false)
// 参与者ID：创建房间时是 creator.id，加入房间时是 participant.id
// 优先从 participantId 获取，否则使用 userId
const participantId = computed(() => {
  return localStorage.getItem('participantId') || userId.value
})

// ==========================================
// 初始化与连接
// ==========================================
const loadRoomDetail = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await roomApi.getDetail(roomId)

    if (response.data.success) {
      const room = response.data.data
      roomInfo.name = room.name
      roomInfo.announcement = room.announcement
      roomInfo.creatorId = room.creatorId
      roomInfo.currentCount = room.currentCount
      roomInfo.capacity = room.capacity
      roomInfo.status = room.status
      participants.value = room.participants || []

      // 设置初始视频源
      roomInfo.videoUrl = room.videoState?.source || ''

      // 添加系统消息
      messages.push({
        type: 'system',
        content: `欢迎加入房间 #${roomId}`
      })
      messages.push({
        type: 'system',
        content: `房间成员：${room.currentCount} 人`
      })

      // 初始化同步服务
      await initSyncService(room.videoState)
    }
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || '加载房间详情失败'
    console.error('加载房间失败:', error)
  } finally {
    isLoading.value = false
  }
}

// ==========================================
// 同步控制服务初始化
// ==========================================
const initSyncService = async (initialVideoState?: VideoState) => {
  try {
    // 连接同步服务
    syncService.connect()

    // 注册错误监听
    syncService.onError((error) => {
      console.error('[SyncService] 错误:', error)
      messages.push({
        type: 'system',
        content: `同步错误: ${error.message}`
      })
    })

    // 注册同步事件监听
    syncService.onSyncEvent((event: SyncEvent) => {
      handleSyncEvent(event)
    })

    // 注册成员加入事件监听
    syncService.onMemberJoined((event: MemberEvent) => {
      handleMemberJoined(event)
    })

    // 注册成员离开事件监听
    syncService.onMemberLeft((event: MemberEvent) => {
      handleMemberLeft(event)
    })

    // 等待连接建立
    await new Promise<void>((resolve) => {
      const checkConnection = setInterval(() => {
        if (syncService.getConnected()) {
          clearInterval(checkConnection)
          resolve()
        }
      }, 100)

      // 超时处理
      setTimeout(() => {
        clearInterval(checkConnection)
        resolve()
      }, 5000)
    })

    // 加入同步频道（传入昵称以便广播）
    if (participantId.value) {
      const result = await syncService.joinSyncChannel(roomId, participantId.value, userNickname.value)
      syncConnected.value = true

      // 更新成员列表
      if (result.participants && result.participants.length > 0) {
        participants.value = result.participants
        connectedUsers.value = result.participants.length
      }

      // 初始化播放器状态
      if (result.videoState && playerRef.value) {
        applyVideoState(result.videoState, result.serverTime)
      }

      messages.push({
        type: 'system',
        content: '已连接到同步服务'
      })
    } else {
      console.warn('participantId 未设置，无法加入同步频道')
    }
  } catch (error: any) {
    console.error('初始化同步服务失败:', error)
    messages.push({
      type: 'system',
      content: `同步服务连接失败: ${error.message}`
    })
  }
}

// 处理成员加入事件
const handleMemberJoined = (event: MemberEvent) => {
  console.log('[RoomView] 成员加入:', event)
  
  // 更新成员列表
  if (event.participants && event.participants.length > 0) {
    participants.value = event.participants
  } else {
    // 如果没有完整列表，手动添加新成员
    const exists = participants.value.some(p => p.id === event.participant.id)
    if (!exists) {
      participants.value.push({
        id: event.participant.id,
        nickname: event.participant.nickname,
        role: 'viewer',
        status: 'online'
      })
    }
  }
  
  connectedUsers.value = participants.value.length
  
  // 显示系统消息
  messages.push({
    type: 'system',
    content: `${event.participant.nickname} 加入了房间`
  })
  
  scrollToBottom()
}

// 处理成员离开事件
const handleMemberLeft = (event: MemberEvent) => {
  console.log('[RoomView] 成员离开:', event)
  
  // 更新成员列表
  if (event.participants && event.participants.length > 0) {
    participants.value = event.participants
  } else {
    // 如果没有完整列表，手动移除成员
    participants.value = participants.value.filter(p => p.id !== event.participant.id)
  }
  
  connectedUsers.value = participants.value.length
  
  // 显示系统消息
  messages.push({
    type: 'system',
    content: `${event.participant.nickname} 离开了房间`
  })
  
  scrollToBottom()
}

// 应用视频状态到播放器
const applyVideoState = (videoState: VideoState, serverTime: number) => {
  if (!playerRef.value) return

  const player = playerRef.value

  // 更换视频源
  if (videoState.source && videoState.source !== roomInfo.videoUrl) {
    roomInfo.videoUrl = videoState.source
    player.switchUrl(videoState.source)
  }

  // 设置播放倍速
  if (videoState.playbackRate) {
    player.setPlaybackRate(videoState.playbackRate)
  }

  // 设置播放状态
  if (videoState.status === 'playing') {
    // 计算当前应该的进度（考虑服务器时间差）
    const now = Date.now()
    const timeDiff = now - serverTime
    const expectedProgress = videoState.progress + (timeDiff / 1000) * videoState.playbackRate

    player.seek(expectedProgress)
    player.play()
  } else if (videoState.status === 'paused') {
    player.seek(videoState.progress)
    player.pause()
  }
}

// 处理同步事件
const handleSyncEvent = (event: SyncEvent) => {
  if (!playerRef.value) return

  const player = playerRef.value
  const { type, payload } = event

  console.log('[RoomView] 处理同步事件:', type, payload)

  switch (type) {
    case 'CHANGE_SOURCE':
      if (payload.source !== roomInfo.videoUrl) {
        roomInfo.videoUrl = payload.source || ''
        if (payload.source) {
          player.switchUrl(payload.source)
        }
      }
      messages.push({
        type: 'system',
        content: '房主更换了视频源'
      })
      break

    case 'PLAY':
      player.play()
      messages.push({
        type: 'system',
        content: '房主开始播放'
      })
      break

    case 'PAUSE':
      player.pause()
      messages.push({
        type: 'system',
        content: '房主暂停了播放'
      })
      break

    case 'SEEK':
      player.seek(payload.progress)
      messages.push({
        type: 'system',
        content: `房主跳转到 ${Math.floor(payload.progress)} 秒`
      })
      break

    case 'CHANGE_RATE':
      player.setPlaybackRate(payload.playbackRate)
      messages.push({
        type: 'system',
        content: `房主设置播放倍速为 ${payload.playbackRate}x`
      })
      break

    case 'CHANGE_SUBTITLE':
      // ArtPlayer 字幕设置需要根据实际API调整
      messages.push({
        type: 'system',
        content: payload.subtitle ? '房主开启了字幕' : '房主关闭了字幕'
      })
      break
  }
}

const leaveRoomAPI = async () => {
  try {
    await roomApi.leave(roomId, userId.value)
    localStorage.removeItem('currentRoomId')
    router.push('/join')
  } catch (error: any) {
    console.error('退出房间失败:', error)
    router.push('/join')
  }
}

onMounted(async () => {
  if (!userId.value || !userNickname.value) {
    alert('请先加入房间')
    router.push('/join')
    return
  }

  // participantId 从 userId 获取（已在 computed 中定义）

  await loadRoomDetail()
  isConnected.value = true
  connectedUsers.value = participants.value.length
})

onUnmounted(() => {
  // 断开同步服务连接
  syncService.disconnect()
  leaveRoomAPI()
})

// ==========================================
// 播放控制（房主操作）
// ==========================================
const handlePlayerPlay = () => {
  if (isOwner.value && syncConnected.value) {
    syncService.play(userId.value).catch((error) => {
      console.error('播放同步失败:', error)
    })
  }
}

const handlePlayerPause = () => {
  if (isOwner.value && syncConnected.value) {
    syncService.pause(userId.value).catch((error) => {
      console.error('暂停同步失败:', error)
    })
  }
}

const handlePlayerSeek = (progress: number) => {
  // 房主拖动进度条时触发同步
  if (isOwner.value && syncConnected.value) {
    syncService.seek(userId.value, progress).catch((error) => {
      console.error('跳转同步失败:', error)
    })
  }
}

const handlePlayerRateChange = (rate: number) => {
  if (isOwner.value && syncConnected.value) {
    syncService.changeRate(userId.value, rate).catch((error) => {
      console.error('倍速同步失败:', error)
    })
  }
}

const handlePlayerSourceChange = (url: string | null) => {
  // 视频源变更由 updateVideoSource 处理
}

const forceSync = async () => {
  if (!isOwner.value) {
    alert('只有房主可以执行强制同步')
    return
  }

  try {
    // 获取当前播放器状态并同步
    if (playerRef.value) {
      const currentTime = playerRef.value.getCurrentTime()
      await syncService.seek(userId.value, currentTime)
      messages.push({
        type: 'system',
        content: '已执行全员强制同步'
      })
    }
  } catch (error: any) {
    alert('强制同步失败：' + (error.message || '未知错误'))
  }
}

// ==========================================
// 互动
// ==========================================
const sendMessage = () => {
  if (!newMessage.value.trim()) return

  messages.push({
    type: 'chat',
    sender: userNickname.value,
    content: newMessage.value,
    isSelf: true
  })

  newMessage.value = ''
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBox.value) {
      chatBox.value.scrollTop = chatBox.value.scrollHeight
    }
  })
}

// ==========================================
// 结束活动
// ==========================================
const endSession = async () => {
  if (!confirm('确定要解散房间吗？所有成员将被移出。')) return

  try {
    const response = await roomApi.dissolve(roomId, userId.value)

    if (response.data.success) {
      alert('房间已解散')
      localStorage.removeItem('currentRoomId')
      router.push('/')
    }
  } catch (error: any) {
    const errorCode = error.response?.data?.errorCode

    if (errorCode === 'PERMISSION_DENIED') {
      alert('只有房间创建者才能解散房间')
    } else {
      alert('解散房间失败：' + (error.response?.data?.message || error.message))
    }
  }
}
</script>

<style scoped>
.room-layout {
  display: flex;
  height: 100vh;
  background-color: #000;
  color: #fff;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
}

.room-header {
  padding: 1rem 1.5rem;
  background-color: #121212;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.blurred {
  filter: blur(5px);
  pointer-events: none;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: #1e1e1e;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  border: 1px solid #333;
}

.modal-content h2 {
  margin-top: 0;
  color: #fff;
}

.modal-content p {
  color: #aaa;
  margin-bottom: 1.5rem;
}

.input-row {
  display: flex;
  gap: 1rem;
}

.input-row input {
  padding: 0.8rem;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 6px;
  outline: none;
}

.input-row button {
  white-space: nowrap;
}

.room-info h1 {
  font-size: 1.2rem;
  margin: 0;
  color: #eee;
}

.room-id {
  font-size: 0.8rem;
  color: #666;
  margin-top: 2px;
  display: block;
}

.player-container {
  flex: 1;
  background-color: #000;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-player, .iframe-player {
  width: 100%;
  height: 100%;
  max-height: 80vh;
}

.empty-player {
  color: #444;
}

.control-bar {
  height: 60px;
  background-color: #1a1a1a;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  justify-content: space-between;
  border-top: 1px solid #333;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-dot.online {
  background-color: #4cd964;
  box-shadow: 0 0 5px #4cd964;
}

.status-dot.offline {
  background-color: #ff3b30;
  box-shadow: 0 0 5px #ff3b30;
}

.playback-info {
  font-size: 0.9rem;
  color: #aaa;
  display: flex;
  align-items: center;
}

/* Sidebar Chat */
.sidebar {
  width: 350px;
  background-color: #121212;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #333;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 1rem;
  cursor: pointer;
  color: #888;
  font-size: 0.9rem;
}

.tab.active {
  color: #667eea;
  border-bottom: 2px solid #667eea;
  background-color: #1a1a1a;
}

.chat-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.message-item {
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: break-all;
}

.message-item.system-msg {
  text-align: center;
  color: #555;
  font-size: 0.8rem;
  margin: 0.5rem 0;
}

.message-item .sender {
  color: #667eea;
  font-weight: bold;
  margin-right: 6px;
}

.message-item.self-msg {
  text-align: right;
}

.message-item.self-msg .text {
  background-color: #2a2a2a;
  padding: 4px 8px;
  border-radius: 4px;
}

.chat-input-area {
  padding: 1rem;
  background-color: #1a1a1a;
  border-top: 1px solid #333;
  display: flex;
  gap: 0.5rem;
}

input {
  flex: 1;
  background-color: #2c2c2c;
  border: 1px solid #444;
  padding: 0.6rem;
  color: white;
  border-radius: 4px;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 0 1rem;
  font-weight: 500;
  transition: opacity 0.2s;
}

.btn-danger {
  background-color: #e53e3e;
  color: white;
  padding: 0.5rem 1rem;
}

/* Header Buttons */
.btn-secondary {
  background-color: transparent;
  border: 1px solid #444;
  color: #ccc;
  padding: 0.5rem 1rem;
  margin-right: 1rem;
}

.btn-secondary:hover {
  border-color: #666;
  color: #fff;
}

/* Member List Styles */
.member-list {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.member-item-row {
  display: flex;
  align-items: center;
  padding: 0.8rem 0.5rem;
  border-bottom: 1px solid #2a2a2a;
  transition: background-color 0.2s;
}

.member-item-row:hover {
  background-color: #1a1a1a;
}

.avatar-placeholder {
  width: 36px;
  height: 36px;
  background-color: #333;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-right: 12px;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-info .name {
  font-size: 0.95rem;
  color: #e0e0e0;
}

.badge-owner {
  font-size: 0.7rem;
  background-color: #d69e2e; /* Gold/Yellowish */
  color: #000;
  padding: 1px 4px;
  border-radius: 3px;
  margin-top: 2px;
  align-self: flex-start;
  font-weight: bold;
}

.btn-danger:hover {
  background-color: #c53030;
}

.btn-sync {
  background-color: #4a5568;
  color: white;
  padding: 0.5rem 1rem;
}

.btn-sync:hover {
  background-color: #2d3748;
}

.chat-input-area button {
  background-color: #667eea;
  color: white;
}

/* Modal Forms */
.input-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin-top: 1rem;
}

.full-width-input {
  width: 100%;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn-text {
  background: transparent;
  color: #aaa;
  padding: 0.5rem 1rem;
}

.btn-text:hover {
  color: #fff;
}
</style>
