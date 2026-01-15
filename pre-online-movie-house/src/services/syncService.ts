/**
 * 视频同步控制服务
 * 基于 Socket.IO 实现房间内视频播放的实时同步
 */

import { io, Socket } from 'socket.io-client'
import { getApiUrl } from '@/config/api'

// Socket 服务地址（从 API URL 中提取基础地址）
const getSocketBaseUrl = (): string => {
  const apiUrl = getApiUrl()
  // 从 http://localhost:3000/api 提取 http://localhost:3000
  const url = new URL(apiUrl)
  return `${url.protocol}//${url.host}`
}

// 同步事件类型
export type SyncEventType = 
  | 'CHANGE_SOURCE'
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'CHANGE_RATE'
  | 'CHANGE_SUBTITLE'

// 成员事件类型
export type MemberEventType = 'joined' | 'left'

// 参与者信息
export interface ParticipantInfo {
  id: string
  nickname: string
  role?: string
  status?: string
}

// 成员事件
export interface MemberEvent {
  roomId: string
  participant: {
    id: string
    nickname: string
  }
  participants: ParticipantInfo[]
  timestamp: number
}

// 视频状态接口
export interface VideoState {
  source: string | null
  status: 'playing' | 'paused' | 'stopped'
  progress: number
  playbackRate: number
  subtitle: string | null
  lastUpdateTime?: number
  currentProgress?: number
}

// 同步事件载荷
export interface SyncEventPayload {
  source: string | null
  status: 'playing' | 'paused' | 'stopped'
  progress: number
  playbackRate: number
  subtitle: string | null
}

// 同步事件
export interface SyncEvent {
  type: SyncEventType
  roomId: string
  operatorId: string
  serverTime: number
  payload: SyncEventPayload
}

// ACK 响应格式
interface AckResponse {
  ok: boolean
  message?: string
  data?: any
  error?: {
    code: string
    message: string
  }
}

// 同步控制回调函数类型
export type SyncEventCallback = (event: SyncEvent) => void
export type ErrorCallback = (error: { code: string; message: string }) => void
export type MemberJoinedCallback = (event: MemberEvent) => void
export type MemberLeftCallback = (event: MemberEvent) => void

class SyncService {
  private socket: Socket | null = null
  private roomId: string = ''
  private participantId: string = ''
  private nickname: string = ''
  private isConnected: boolean = false
  private eventCallbacks: Set<SyncEventCallback> = new Set()
  private errorCallbacks: Set<ErrorCallback> = new Set()
  private memberJoinedCallbacks: Set<MemberJoinedCallback> = new Set()
  private memberLeftCallbacks: Set<MemberLeftCallback> = new Set()

  /**
   * 连接同步控制服务
   */
  connect(): void {
    if (this.socket?.connected) {
      console.warn('同步服务已连接')
      return
    }

    const baseUrl = getSocketBaseUrl()
    this.socket = io(`${baseUrl}/sync`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    // 连接成功
    this.socket.on('connect', () => {
      console.log('[SyncService] 连接成功')
      this.isConnected = true
    })

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('[SyncService] 连接断开:', reason)
      this.isConnected = false
    })

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('[SyncService] 连接错误:', error)
      this.notifyError({
        code: 'CONNECTION_ERROR',
        message: error.message || '连接失败'
      })
    })

    // 监听同步事件
    this.socket.on('sync:event', (event: SyncEvent) => {
      console.log('[SyncService] 收到同步事件:', event)
      this.notifyEvent(event)
    })

    // 监听成员加入事件
    this.socket.on('member:joined', (event: MemberEvent) => {
      console.log('[SyncService] 收到成员加入事件:', event)
      this.notifyMemberJoined(event)
    })

    // 监听成员离开事件
    this.socket.on('member:left', (event: MemberEvent) => {
      console.log('[SyncService] 收到成员离开事件:', event)
      this.notifyMemberLeft(event)
    })
  }

  /**
   * 加入同步频道
   */
  joinSyncChannel(
    roomId: string,
    participantId: string,
    nickname?: string
  ): Promise<{ videoState: VideoState; serverTime: number; participants: ParticipantInfo[] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket 未连接，请先调用 connect()'))
        return
      }

      this.roomId = roomId
      this.participantId = participantId
      this.nickname = nickname || ''

      this.socket.emit(
        'sync:join',
        { roomId, participantId, nickname },
        (ack: AckResponse) => {
          if (!ack?.ok) {
            const error = ack?.error || {
              code: 'UNKNOWN_ERROR',
              message: ack?.message || '加入同步频道失败'
            }
            this.notifyError(error)
            reject(new Error(error.message))
            return
          }

          console.log('[SyncService] 加入同步频道成功:', ack.data)
          resolve({
            videoState: ack.data.videoState,
            serverTime: ack.data.serverTime,
            participants: ack.data.participants || []
          })
        }
      )
    })
  }

  /**
   * 初始化状态请求（不加入频道）
   */
  initState(roomId: string): Promise<{ videoState: VideoState; serverTime: number }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket 未连接，请先调用 connect()'))
        return
      }

      this.socket.emit('sync:init', { roomId }, (ack: AckResponse) => {
        if (!ack?.ok) {
          const error = ack?.error || {
            code: 'UNKNOWN_ERROR',
            message: ack?.message || '获取初始状态失败'
          }
          this.notifyError(error)
          reject(new Error(error.message))
          return
        }

        resolve({
          videoState: ack.data.videoState,
          serverTime: ack.data.serverTime
        })
      })
    })
  }

  /**
   * 播放（仅房主可操作）
   */
  play(operatorId: string): Promise<void> {
    return this.emitSyncCommand('sync:play', { operatorId })
  }

  /**
   * 暂停（仅房主可操作）
   */
  pause(operatorId: string): Promise<void> {
    return this.emitSyncCommand('sync:pause', { operatorId })
  }

  /**
   * 跳转进度（仅房主可操作）
   */
  seek(operatorId: string, progress: number): Promise<void> {
    if (progress < 0) {
      return Promise.reject(new Error('进度值必须 >= 0'))
    }
    return this.emitSyncCommand('sync:seek', { operatorId, progress })
  }

  /**
   * 改变播放倍速（仅房主可操作）
   */
  changeRate(operatorId: string, rate: number): Promise<void> {
    if (rate < 0.25 || rate > 4.0) {
      return Promise.reject(new Error('播放倍速必须在 0.25-4.0 范围内'))
    }
    return this.emitSyncCommand('sync:changeRate', { operatorId, rate })
  }

  /**
   * 改变字幕（仅房主可操作）
   */
  changeSubtitle(operatorId: string, subtitle: string | null): Promise<void> {
    return this.emitSyncCommand('sync:changeSubtitle', { operatorId, subtitle })
  }

  /**
   * 更换视频源（仅房主可操作）
   */
  changeSource(operatorId: string, sourceUrl: string | null): Promise<void> {
    return this.emitSyncCommand('sync:changeSource', { operatorId, sourceUrl })
  }

  /**
   * 发送同步命令的通用方法
   */
  private emitSyncCommand(
    eventName: string,
    payload: Record<string, any>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket 未连接'))
        return
      }

      if (!this.roomId) {
        reject(new Error('未加入房间'))
        return
      }

      this.socket.emit(
        eventName,
        { roomId: this.roomId, ...payload },
        (ack: AckResponse) => {
          if (!ack?.ok) {
            const error = ack?.error || {
              code: 'UNKNOWN_ERROR',
              message: ack?.message || '操作失败'
            }
            this.notifyError(error)
            reject(new Error(error.message))
            return
          }
          resolve()
        }
      )
    })
  }

  /**
   * 注册同步事件监听器
   */
  onSyncEvent(callback: SyncEventCallback): () => void {
    this.eventCallbacks.add(callback)
    // 返回取消监听的函数
    return () => {
      this.eventCallbacks.delete(callback)
    }
  }

  /**
   * 注册错误监听器
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback)
    return () => {
      this.errorCallbacks.delete(callback)
    }
  }

  /**
   * 注册成员加入监听器
   */
  onMemberJoined(callback: MemberJoinedCallback): () => void {
    this.memberJoinedCallbacks.add(callback)
    return () => {
      this.memberJoinedCallbacks.delete(callback)
    }
  }

  /**
   * 注册成员离开监听器
   */
  onMemberLeft(callback: MemberLeftCallback): () => void {
    this.memberLeftCallbacks.add(callback)
    return () => {
      this.memberLeftCallbacks.delete(callback)
    }
  }

  /**
   * 通知所有事件监听器
   */
  private notifyEvent(event: SyncEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('[SyncService] 事件回调执行错误:', error)
      }
    })
  }

  /**
   * 通知所有错误监听器
   */
  private notifyError(error: { code: string; message: string }): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        console.error('[SyncService] 错误回调执行错误:', err)
      }
    })
  }

  /**
   * 通知所有成员加入监听器
   */
  private notifyMemberJoined(event: MemberEvent): void {
    this.memberJoinedCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('[SyncService] 成员加入回调执行错误:', error)
      }
    })
  }

  /**
   * 通知所有成员离开监听器
   */
  private notifyMemberLeft(event: MemberEvent): void {
    this.memberLeftCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('[SyncService] 成员离开回调执行错误:', error)
      }
    })
  }

  /**
   * 离开同步频道
   */
  leave(): void {
    if (this.socket?.connected && this.roomId && this.participantId) {
      this.socket.emit('sync:leave', {
        roomId: this.roomId,
        participantId: this.participantId
      })
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.leave()
    this.eventCallbacks.clear()
    this.errorCallbacks.clear()
    this.memberJoinedCallbacks.clear()
    this.memberLeftCallbacks.clear()
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnected = false
    this.roomId = ''
    this.participantId = ''
    this.nickname = ''
  }

  /**
   * 获取连接状态
   */
  getConnected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }

  /**
   * 获取当前房间ID
   */
  getRoomId(): string {
    return this.roomId
  }
}

// 导出单例
export const syncService = new SyncService()
export default syncService
