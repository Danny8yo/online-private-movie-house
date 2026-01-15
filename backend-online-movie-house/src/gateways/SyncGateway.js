/**
 * @file 同步控制Socket网关
 * @description 处理视频同步控制的Socket.IO事件，负责接收客户端同步控制请求并广播同步事件
 *              同时处理成员加入/离开事件的广播，实现房间成员列表的实时更新
 * @module gateways/SyncGateway
 */

const SyncService = require('../services/SyncService');
const RoomService = require('../services/RoomService');
const {
  RoomNotFoundException,
  RoomClosedException,
  PermissionDeniedException,
  ValidationException
} = require('../exceptions/BusinessException');

/**
 * 同步控制Socket网关类
 * 负责处理所有与视频同步相关的Socket.IO事件
 * 
 * @class SyncGateway
 */
class SyncGateway {
  /**
   * 创建同步网关实例
   * 
   * @constructor
   * @param {Object} io - Socket.IO服务器实例
   */
  constructor(io) {
    this.io = io;
    this.syncService = SyncService.getInstance();
    this.roomService = RoomService.getInstance();
    this.namespace = io.of('/sync');
    
    // 存储 socket.id 与 { roomId, participantId, nickname } 的映射关系
    // 用于在断开连接时广播成员离开事件
    this.socketParticipantMap = new Map();
  }

  /**
   * 注册Socket事件处理器
   * 在Socket.IO服务器启动后调用此方法注册所有事件监听器
   */
  register() {
    this.namespace.on('connection', (socket) => {
      console.log(`[SyncGateway] 客户端连接: ${socket.id}`);

      // 注册所有事件处理器
      this.handleJoin(socket);
      this.handleLeave(socket);
      this.handlePlay(socket);
      this.handlePause(socket);
      this.handleSeek(socket);
      this.handleChangeRate(socket);
      this.handleChangeSubtitle(socket);
      this.handleChangeSource(socket);
      this.handleInitRequest(socket);

      // 处理断开连接
      socket.on('disconnect', () => {
        console.log(`[SyncGateway] 客户端断开: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * 处理加入同步频道
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleJoin(socket) {
    socket.on('sync:join', async (data, ack) => {
      try {
        const { roomId, participantId, nickname } = data;

        // 参数验证
        if (!roomId || !participantId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId和participantId不能为空'
            }
          });
        }

        // 获取初始化状态
        const initState = await this.syncService.getInitState(roomId);

        // 加入房间频道
        const channel = `room:${roomId}`;
        socket.join(channel);

        // 存储 socket 与参与者的映射关系（用于断开连接时广播离开事件）
        this.socketParticipantMap.set(socket.id, {
          roomId,
          participantId,
          nickname: nickname || '匿名用户'
        });

        // 获取房间详情以获取成员列表
        let participants = [];
        try {
          const roomDetail = await this.roomService.getRoomDetail(roomId);
          participants = roomDetail.participants || [];
        } catch (e) {
          console.warn(`[SyncGateway] 获取房间详情失败: ${e.message}`);
        }

        // 广播成员加入事件给房间内其他成员（排除自己）
        socket.to(channel).emit('member:joined', {
          roomId,
          participant: {
            id: participantId,
            nickname: nickname || '匿名用户'
          },
          participants,
          timestamp: Date.now()
        });

        // 返回成功响应
        ack({
          ok: true,
          data: {
            channel: channel,
            videoState: initState.videoState,
            serverTime: initState.serverTime,
            participants
          }
        });

        console.log(`[SyncGateway] 参与者 ${participantId} (${nickname || '匿名'}) 加入房间 ${roomId} 的同步频道`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 处理离开同步频道
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleLeave(socket) {
    socket.on('sync:leave', async (data, ack) => {
      try {
        const { roomId, participantId } = data;

        if (!roomId || !participantId) {
          if (ack) {
            return ack({
              ok: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'roomId和participantId不能为空'
              }
            });
          }
          return;
        }

        const channel = `room:${roomId}`;
        
        // 从映射表中获取昵称
        const participantInfo = this.socketParticipantMap.get(socket.id);
        const nickname = participantInfo?.nickname || '匿名用户';

        // 离开房间频道
        socket.leave(channel);

        // 清除映射关系
        this.socketParticipantMap.delete(socket.id);

        // 获取更新后的成员列表
        let participants = [];
        try {
          const roomDetail = await this.roomService.getRoomDetail(roomId);
          participants = roomDetail.participants || [];
        } catch (e) {
          console.warn(`[SyncGateway] 获取房间详情失败: ${e.message}`);
        }

        // 广播成员离开事件给房间内其他成员
        this.broadcastToRoom(roomId, 'member:left', {
          roomId,
          participant: {
            id: participantId,
            nickname
          },
          participants,
          timestamp: Date.now()
        });

        if (ack) {
          ack({
            ok: true,
            data: { message: '已离开同步频道' }
          });
        }

        console.log(`[SyncGateway] 参与者 ${participantId} (${nickname}) 离开房间 ${roomId} 的同步频道`);
      } catch (error) {
        if (ack) {
          this.handleError(socket, error, ack);
        }
      }
    });
  }

  /**
   * 处理Socket断开连接
   * 自动广播成员离开事件
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleDisconnect(socket) {
    const participantInfo = this.socketParticipantMap.get(socket.id);
    
    if (participantInfo) {
      const { roomId, participantId, nickname } = participantInfo;

      // 清除映射关系
      this.socketParticipantMap.delete(socket.id);

      // 异步获取更新后的成员列表并广播
      this.roomService.getRoomDetail(roomId)
        .then(roomDetail => {
          const participants = roomDetail.participants || [];
          
          // 广播成员离开事件
          this.broadcastToRoom(roomId, 'member:left', {
            roomId,
            participant: {
              id: participantId,
              nickname
            },
            participants,
            timestamp: Date.now()
          });

          console.log(`[SyncGateway] 参与者 ${participantId} (${nickname}) 断开连接，已广播离开事件`);
        })
        .catch(e => {
          // 房间可能已被解散，广播离开事件但不带成员列表
          this.broadcastToRoom(roomId, 'member:left', {
            roomId,
            participant: {
              id: participantId,
              nickname
            },
            participants: [],
            timestamp: Date.now()
          });

          console.log(`[SyncGateway] 参与者 ${participantId} 断开连接（房间可能已解散）`);
        });
    }
  }

  /**
   * 处理播放事件
   * 
   * @param {Object} socket - Socket连接实例
   */
  handlePlay(socket) {
    socket.on('sync:play', async (data, ack) => {
      try {
        const { roomId, operatorId } = data;

        // 参数验证
        if (!roomId || !operatorId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId和operatorId不能为空'
            }
          });
        }

        // 执行播放操作
        const result = await this.syncService.play(roomId, operatorId);

        // 广播同步事件
        this.broadcastToRoom(roomId, 'sync:event', result.event);

        // 返回成功响应
        ack({
          ok: true,
          data: {
            event: result.event
          }
        });

        console.log(`[SyncGateway] 房间 ${roomId} 播放，操作者: ${operatorId}`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 处理暂停事件
   * 
   * @param {Object} socket - Socket连接实例
   */
  handlePause(socket) {
    socket.on('sync:pause', async (data, ack) => {
      try {
        const { roomId, operatorId } = data;

        // 参数验证
        if (!roomId || !operatorId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId和operatorId不能为空'
            }
          });
        }

        // 执行暂停操作
        const result = await this.syncService.pause(roomId, operatorId);

        // 广播同步事件
        this.broadcastToRoom(roomId, 'sync:event', result.event);

        // 返回成功响应
        ack({
          ok: true,
          data: {
            event: result.event
          }
        });

        console.log(`[SyncGateway] 房间 ${roomId} 暂停，操作者: ${operatorId}`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 处理跳转进度事件
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleSeek(socket) {
    socket.on('sync:seek', async (data, ack) => {
      try {
        const { roomId, operatorId, progress } = data;

        // 参数验证
        if (!roomId || !operatorId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId和operatorId不能为空'
            }
          });
        }

        if (typeof progress !== 'number' || progress < 0) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'progress必须是非负数'
            }
          });
        }

        // 执行跳转操作
        const result = await this.syncService.seek(roomId, operatorId, progress);

        // 广播同步事件
        this.broadcastToRoom(roomId, 'sync:event', result.event);

        // 返回成功响应
        ack({
          ok: true,
          data: {
            event: result.event
          }
        });

        console.log(`[SyncGateway] 房间 ${roomId} 跳转到 ${progress}秒，操作者: ${operatorId}`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 处理改变倍速事件
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleChangeRate(socket) {
    socket.on('sync:changeRate', async (data, ack) => {
      try {
        const { roomId, operatorId, rate } = data;

        // 参数验证
        if (!roomId || !operatorId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId和operatorId不能为空'
            }
          });
        }

        if (typeof rate !== 'number' || rate <= 0 || rate > 4) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'rate必须在0.25-4.0之间'
            }
          });
        }

        // 执行改变倍速操作
        const result = await this.syncService.changeRate(roomId, operatorId, rate);

        // 广播同步事件
        this.broadcastToRoom(roomId, 'sync:event', result.event);

        // 返回成功响应
        ack({
          ok: true,
          data: {
            event: result.event
          }
        });

        console.log(`[SyncGateway] 房间 ${roomId} 改变倍速为 ${rate}，操作者: ${operatorId}`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 处理改变字幕事件
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleChangeSubtitle(socket) {
    socket.on('sync:changeSubtitle', async (data, ack) => {
      try {
        const { roomId, operatorId, subtitle } = data;

        // 参数验证
        if (!roomId || !operatorId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId和operatorId不能为空'
            }
          });
        }

        // 执行改变字幕操作
        const result = await this.syncService.changeSubtitle(roomId, operatorId, subtitle);

        // 广播同步事件
        this.broadcastToRoom(roomId, 'sync:event', result.event);

        // 返回成功响应
        ack({
          ok: true,
          data: {
            event: result.event
          }
        });

        console.log(`[SyncGateway] 房间 ${roomId} 改变字幕，操作者: ${operatorId}`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 处理更换视频源事件
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleChangeSource(socket) {
    socket.on('sync:changeSource', async (data, ack) => {
      try {
        const { roomId, operatorId, sourceUrl } = data;

        // 参数验证
        if (!roomId || !operatorId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId和operatorId不能为空'
            }
          });
        }

        // 执行更换视频源操作
        const result = await this.syncService.changeSource(roomId, operatorId, sourceUrl);

        // 广播同步事件
        this.broadcastToRoom(roomId, 'sync:event', result.event);

        // 返回成功响应
        ack({
          ok: true,
          data: {
            event: result.event
          }
        });

        console.log(`[SyncGateway] 房间 ${roomId} 更换视频源，操作者: ${operatorId}`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 处理初始化请求事件
   * 新加入房间的成员请求获取当前视频状态
   * 
   * @param {Object} socket - Socket连接实例
   */
  handleInitRequest(socket) {
    socket.on('sync:init', async (data, ack) => {
      try {
        const { roomId } = data;

        // 参数验证
        if (!roomId) {
          return ack({
            ok: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'roomId不能为空'
            }
          });
        }

        // 获取初始化状态
        const initState = await this.syncService.getInitState(roomId);

        // 返回成功响应
        ack({
          ok: true,
          data: initState
        });

        console.log(`[SyncGateway] 房间 ${roomId} 初始化状态请求`);
      } catch (error) {
        this.handleError(socket, error, ack);
      }
    });
  }

  /**
   * 向房间广播事件
   * 
   * @private
   * @param {string} roomId - 房间ID
   * @param {string} eventName - 事件名称
   * @param {Object} payload - 事件载荷
   */
  broadcastToRoom(roomId, eventName, payload) {
    const channel = `room:${roomId}`;
    this.namespace.to(channel).emit(eventName, payload);
  }

  /**
   * 统一错误处理
   * 
   * @private
   * @param {Object} socket - Socket连接实例
   * @param {Error} error - 错误对象
   * @param {Function} ack - ACK回调函数
   */
  handleError(socket, error, ack) {
    console.error('[SyncGateway] 错误:', error);

    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = error.message || '服务器内部错误';

    if (error instanceof RoomNotFoundException) {
      errorCode = 'ROOM_NOT_FOUND';
    } else if (error instanceof RoomClosedException) {
      errorCode = 'ROOM_CLOSED';
    } else if (error instanceof PermissionDeniedException) {
      errorCode = 'PERMISSION_DENIED';
    } else if (error instanceof ValidationException) {
      errorCode = 'VALIDATION_ERROR';
    }

    if (ack && typeof ack === 'function') {
      ack({
        ok: false,
        error: {
          code: errorCode,
          message: message
        }
      });
    }
  }
}

module.exports = SyncGateway;
