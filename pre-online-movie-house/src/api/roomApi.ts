/**
 * API 服务层
 * 统一管理所有与后端的通信
 */

import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { getApiUrl } from '@/config/api'

interface RoomCreatePayload {
  name: string
  capacity?: number
  password?: string
  announcement?: string
  creatorNickname: string
}

interface JoinRoomPayload {
  nickname: string
  password?: string
}

interface RoomListParams {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

interface LeaveRoomPayload {
  participantId: string
}

interface DissolveRoomPayload {
  operatorId: string
}

interface UpdateRoomPayload {
  operatorId: string
  name?: string
  capacity?: number
  password?: string
  announcement?: string
}

interface VerifyPasswordPayload {
  password: string
}

let apiClient: AxiosInstance | null = null

// 创建或获取 axios 实例
const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    const baseURL = getApiUrl()
    apiClient = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    // 响应拦截器 - 统一错误处理
    apiClient.interceptors.response.use(
      response => response,
      error => {
        const errorData = error.response?.data
        console.error('API Error:', {
          message: errorData?.message || error.message,
          code: errorData?.code,
          errorCode: errorData?.errorCode,
          details: errorData?.details
        })
        return Promise.reject(error)
      }
    )
  }

  return apiClient
}

// 重新初始化 API 客户端（当 API 地址改变时）
export const reinitializeApiClient = (): void => {
  apiClient = null
}

export const roomApi = {
  /**
   * 获取房间列表
   */
  getList: async (params?: RoomListParams) => {
    const client = getApiClient()
    return client.get('/rooms', { params })
  },

  /**
   * 获取房间详情
   */
  getDetail: async (roomId: string) => {
    const client = getApiClient()
    return client.get(`/rooms/${roomId}`)
  },

  /**
   * 创建房间
   */
  create: async (data: RoomCreatePayload) => {
    const client = getApiClient()
    return client.post('/rooms', data)
  },

  /**
   * 加入房间
   */
  join: async (roomId: string, data: JoinRoomPayload) => {
    const client = getApiClient()
    return client.post(`/rooms/${roomId}/join`, data)
  },

  /**
   * 退出房间
   */
  leave: async (roomId: string, participantId: string) => {
    const client = getApiClient()
    return client.post(`/rooms/${roomId}/leave`, { participantId })
  },

  /**
   * 解散房间（仅创建者可操作）
   */
  dissolve: async (roomId: string, operatorId: string) => {
    const client = getApiClient()
    return client.delete(`/rooms/${roomId}`, { data: { operatorId } })
  },

  /**
   * 更新房间配置（仅创建者可操作）
   */
  update: async (roomId: string, data: UpdateRoomPayload) => {
    const client = getApiClient()
    return client.patch(`/rooms/${roomId}`, data)
  },

  /**
   * 验证房间密码
   */
  verifyPassword: async (roomId: string, password: string) => {
    const client = getApiClient()
    return client.post(`/rooms/${roomId}/verify-password`, { password })
  },

  /**
   * 获取统计信息
   */
  getStats: async () => {
    const client = getApiClient()
    return client.get('/rooms/stats')
  }
}

export default roomApi
