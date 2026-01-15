<template>
  <div class="home-container">
    <div class="content">
      <h1 class="logo">MovieHouse</h1>
      <p class="subtitle">与朋友共此时,天涯共比邻</p>
      <div class="actions">
        <button class="btn-primary" @click="goToCreate">创建观影室</button>
        <button class="btn-secondary" @click="goToJoin">加入房间</button>
      </div>
      <div class="settings-link">
        <button class="btn-text" @click="goToSettings">⚙️ API设置</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToCreate = () => {
  router.push('/create')
}

const goToJoin = () => {
  router.push('/join')
}

const goToSettings = () => {
  router.push('/settings')
}
</script>

<style scoped>
.home-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #121212;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
}

.content {
  text-align: center;
  animation: fadeIn 0.8s ease-out;
}

.logo {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -2px;
}

.subtitle {
  font-size: 1.25rem;
  color: #a0a0a0;
  margin-bottom: 3rem;
  font-weight: 300;
}

.actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

button {
  padding: 0.8rem 2rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: transparent;
  border: 1px solid #444;
  color: #ccc;
}

.btn-secondary:hover {
  border-color: #666;
  color: #fff;
}

.settings-link {
  margin-top: 2rem;
}

.btn-text {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  transition: color 0.2s;
}

.btn-text:hover {
  color: #fff;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
