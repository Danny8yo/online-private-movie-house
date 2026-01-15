<template>
  <div class="create-page">
    <div class="form-card">
      <h2>创建新的放映室</h2>
      <p class="description">配置房间基本信息</p>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleCreate">
        <!-- 创建者昵称 -->
        <div class="form-group">
          <label>你的昵称</label>
          <input 
            v-model="creatorNickname" 
            type="text" 
            placeholder="输入你的昵称" 
            required 
          />
        </div>

        <!-- 房间基本信息 -->
        <div class="form-group">
          <label>房间名称 *</label>
          <input 
            v-model="form.name" 
            type="text" 
            placeholder="给房间起个独特的名字" 
            maxlength="50"
            required 
          />
          <small>{{ form.name.length }}/50 字符</small>
        </div>

        <div class="form-group">
          <label>房间公告</label>
          <textarea 
            v-model="form.announcement" 
            placeholder="输入房间公告（选填）"
            rows="3"
            maxlength="500"
          ></textarea>
          <small>{{ form.announcement.length }}/500 字符</small>
        </div>

        <div class="row">
          <div class="form-group col">
            <label>人数上限 *</label>
            <input 
              v-model.number="form.capacity" 
              type="number" 
              min="2" 
              max="100"
              required
            />
            <small>2-100人</small>
          </div>
          <div class="form-group col">
            <label>房间密码 (可选)</label>
            <input 
              v-model="form.password" 
              type="password" 
              placeholder="留空则公开" 
              maxlength="20"
            />
            <small v-if="form.password">{{ form.password.length }}/20</small>
          </div>
        </div>
 
        <div class="divider"></div>

        <div class="actions">
          <button type="button" class="btn-text" @click="$router.back()">取消</button>
          <button type="submit" class="btn-primary" :disabled="isLoading">
            {{ isLoading ? '创建中...' : '立即创建' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import roomApi from '@/api/roomApi'

const router = useRouter()
const isLoading = ref(false)
const errorMessage = ref('')

// 从 localStorage 获取用户昵称（如果没有则使用默认值）
const creatorNickname = ref(localStorage.getItem('userNickname') || '房主')

const form = reactive({
  name: '',
  announcement: '',
  capacity: 10,
  password: ''
})

const handleCreate = async () => {
  // 验证必填字段
  if (!form.name.trim()) {
    errorMessage.value = '房间名称不能为空'
    return
  }

  if (form.name.length > 50) {
    errorMessage.value = '房间名称最多50个字符'
    return
  }

  if (form.capacity < 2 || form.capacity > 100) {
    errorMessage.value = '人数上限需在2-100之间'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await roomApi.create({
      name: form.name,
      capacity: form.capacity,
      password: form.password || undefined,
      announcement: form.announcement || undefined,
      creatorNickname: creatorNickname.value
    })

    if (response.data.success) {
      const { room, creator } = response.data.data
      
      // 保存用户信息到本地存储，后续操作需要用到
      localStorage.setItem('userId', creator.id)
      localStorage.setItem('userNickname', creator.nickname)
      localStorage.setItem('currentRoomId', room.id)
      
      console.log('房间创建成功，房间号:', room.id)
      
      // 跳转到房间页
      router.push({
        name: 'room',
        params: { id: room.id }
      })
    }
  } catch (error: any) {
    const errorCode = error.response?.data?.errorCode
    const message = error.response?.data?.message || '创建房间失败，请重试'
    
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        errorMessage.value = '参数验证失败：' + message
        break
      case 'BAD_REQUEST':
        errorMessage.value = '请求参数错误：' + message
        break
      default:
        errorMessage.value = message
    }
    
    console.error('创建房间失败:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  background-color: #121212;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 5vh;
  color: #e0e0e0;
  font-family: 'Inter', system-ui, sans-serif;
}

.form-card {
  width: 100%;
  max-width: 500px;
  background-color: #1e1e1e;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  border: 1px solid #333;
}

h2 {
  margin: 0;
  font-size: 1.8rem;
  color: #fff;
}

.description {
  color: #888;
  margin-top: 0.5rem;
  margin-bottom: 2rem;
}

.error-message {
  background-color: #3d2425;
  border: 1px solid #8b3a3f;
  color: #ff6b6b;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  gap: 1.5rem;
}

.col {
  flex: 1;
}

label {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #bbb;
  font-weight: 500;
}

input, textarea {
  background-color: #2c2c2c;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.8rem;
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #667eea;
}

small {
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.8rem;
}

.divider {
  height: 1px;
  background-color: #333;
  margin: 1.5rem 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:active {
  transform: translateY(1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-text {
  background: transparent;
  color: #aaa;
  border: none;
  cursor: pointer;
}

.btn-text:hover {
  color: #fff;
}
</style>
