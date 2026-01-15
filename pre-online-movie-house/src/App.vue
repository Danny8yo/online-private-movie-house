<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* 全局样式重置 */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #121212; /* 深色背景 */
  color: #e0e0e0;
}

#app {
  width: 100%;
  height: 100%;
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* 简单的滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a; 
}

::-webkit-scrollbar-thumb {
  background: #444; 
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555; 
}
</style>
