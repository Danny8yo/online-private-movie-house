import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CreateRoomView from '../views/CreateRoomView.vue'
import JoinView from '../views/JoinView.vue'
import RoomView from '../views/RoomView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/create',
      name: 'create',
      component: CreateRoomView
    },
    {
      path: '/join',
      name: 'join',
      component: JoinView
    },
    {
      path: '/room/:id',
      name: 'room',
      component: RoomView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ],
})

export default router
