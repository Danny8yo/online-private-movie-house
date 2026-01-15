/**
 * @file 同步控制服务层
 * @description 实现视频同步控制的核心业务逻辑，包括播放、暂停、跳转、倍速等操作
 *              采用单例模式，协调RoomService和VideoState完成同步控制
 * @module services/SyncService
 */

const RoomService = require('./RoomService');
const { SyncEvent, SyncEventType } = require('../models/SyncEvent');
const { PlayStatus } = require('../models/VideoState');
const TimeSyncUtil = require('../utils/TimeSyncUtil');
const {
  RoomNotFoundException,
  RoomClosedException,
  PermissionDeniedException,
  ValidationException
} = require('../exceptions/BusinessException');

/**
 * 同步控制服务类
 * 封装视频同步控制的所有业务逻辑，负责权限校验、状态更新和事件生成
 * 
 * @class SyncService
 * @singleton
 */
class SyncService {
  /**
   * 单例实例
   * @private
   * @static
   * @type {SyncService|null}
   */
  static instance = null;

  /**
   * 创建同步服务实例
   * @constructor
   * @private
   */
  constructor() {
    this.roomService = RoomService.getInstance();
  }

  /**
   * 获取单例实例
   * 
   * @static
   * @returns {SyncService} 服务实例
   */
  static getInstance() {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * 验证操作者权限
   * 只有房间创建者可以执行同步控制操作
   * 
   * @private
   * @param {Object} room - 房间实例
   * @param {string} operatorId - 操作者ID
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   */
  assertOperatorIsCreator(room, operatorId) {
    if (!room.isCreator(operatorId)) {
      throw new PermissionDeniedException('同步控制操作');
    }
  }

  /**
   * 验证房间状态
   * 
   * @private
   * @param {Object} room - 房间实例
   * @throws {RoomClosedException} 当房间已关闭时抛出
   */
  assertRoomNotClosed(room) {
    if (room.status === 'closed') {
      throw new RoomClosedException(room.id);
    }
  }

  /**
   * 获取房间实例
   * 
   * @private
   * @param {string} roomId - 房间ID
   * @returns {Object} 房间实例
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   */
  getRoom(roomId) {
    const RoomRepository = require('../repositories/RoomRepository');
    const room = RoomRepository.getInstance().findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }
    
    return room;
  }

  /**
   * 更换视频源
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @param {string|null} sourceUrl - 新的视频源URL，null表示清空
   * @returns {Promise<Object>} 包含房间信息和同步事件
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   */
  async changeSource(roomId, operatorId, sourceUrl) {
    const room = this.getRoom(roomId);
    this.assertRoomNotClosed(room);
    this.assertOperatorIsCreator(room, operatorId);

    // 更新视频状态
    room.videoState.setSource(sourceUrl);

    // 创建同步事件
    const event = new SyncEvent({
      type: SyncEventType.CHANGE_SOURCE,
      roomId: room.id,
      operatorId: operatorId,
      serverTime: TimeSyncUtil.nowMs(),
      payload: {
        source: sourceUrl,
        progress: room.videoState.progress,
        playbackRate: room.videoState.playbackRate,
        subtitle: room.videoState.subtitle,
        status: room.videoState.status
      }
    });

    return {
      room: room.toDetailJSON(),
      event: event.toJSON()
    };
  }

  /**
   * 播放
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 包含房间信息和同步事件
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   */
  async play(roomId, operatorId) {
    const room = this.getRoom(roomId);
    this.assertRoomNotClosed(room);
    this.assertOperatorIsCreator(room, operatorId);

    // 更新视频状态
    room.videoState.setStatus(PlayStatus.PLAYING);
    room.setStatus('playing');

    // 创建同步事件
    const event = new SyncEvent({
      type: SyncEventType.PLAY,
      roomId: room.id,
      operatorId: operatorId,
      serverTime: TimeSyncUtil.nowMs(),
      payload: {
        progress: room.videoState.getCurrentProgress(),
        playbackRate: room.videoState.playbackRate,
        subtitle: room.videoState.subtitle,
        source: room.videoState.source
      }
    });

    return {
      room: room.toDetailJSON(),
      event: event.toJSON()
    };
  }

  /**
   * 暂停
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<Object>} 包含房间信息和同步事件
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   */
  async pause(roomId, operatorId) {
    const room = this.getRoom(roomId);
    this.assertRoomNotClosed(room);
    this.assertOperatorIsCreator(room, operatorId);

    // 更新视频状态（暂停时更新进度为当前计算进度）
    const currentProgress = room.videoState.getCurrentProgress();
    room.videoState.setProgress(currentProgress);
    room.videoState.setStatus(PlayStatus.PAUSED);

    // 创建同步事件
    const event = new SyncEvent({
      type: SyncEventType.PAUSE,
      roomId: room.id,
      operatorId: operatorId,
      serverTime: TimeSyncUtil.nowMs(),
      payload: {
        progress: currentProgress,
        playbackRate: room.videoState.playbackRate,
        subtitle: room.videoState.subtitle,
        source: room.videoState.source
      }
    });

    return {
      room: room.toDetailJSON(),
      event: event.toJSON()
    };
  }

  /**
   * 跳转进度
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @param {number} progress - 目标进度（秒）
   * @returns {Promise<Object>} 包含房间信息和同步事件
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   * @throws {ValidationException} 当进度值不合法时抛出
   */
  async seek(roomId, operatorId, progress) {
    const room = this.getRoom(roomId);
    this.assertRoomNotClosed(room);
    this.assertOperatorIsCreator(room, operatorId);

    // 验证进度值
    if (typeof progress !== 'number' || progress < 0 || isNaN(progress)) {
      throw new ValidationException('播放进度必须是非负数');
    }

    // 更新视频状态
    room.videoState.setProgress(progress);

    // 创建同步事件
    const event = new SyncEvent({
      type: SyncEventType.SEEK,
      roomId: room.id,
      operatorId: operatorId,
      serverTime: TimeSyncUtil.nowMs(),
      payload: {
        progress: progress,
        playbackRate: room.videoState.playbackRate,
        subtitle: room.videoState.subtitle,
        source: room.videoState.source,
        status: room.videoState.status
      }
    });

    return {
      room: room.toDetailJSON(),
      event: event.toJSON()
    };
  }

  /**
   * 改变播放倍速
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @param {number} rate - 新的播放倍速（0.25-4.0）
   * @returns {Promise<Object>} 包含房间信息和同步事件
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   * @throws {ValidationException} 当倍速值不合法时抛出
   */
  async changeRate(roomId, operatorId, rate) {
    const room = this.getRoom(roomId);
    this.assertRoomNotClosed(room);
    this.assertOperatorIsCreator(room, operatorId);

    // 验证倍速值
    if (typeof rate !== 'number' || rate <= 0 || rate > 4 || isNaN(rate)) {
      throw new ValidationException('播放倍速必须在0.25-4.0之间');
    }

    // 更新视频状态
    room.videoState.setPlaybackRate(rate);

    // 创建同步事件
    const event = new SyncEvent({
      type: SyncEventType.CHANGE_RATE,
      roomId: room.id,
      operatorId: operatorId,
      serverTime: TimeSyncUtil.nowMs(),
      payload: {
        playbackRate: rate,
        progress: room.videoState.getCurrentProgress(),
        subtitle: room.videoState.subtitle,
        source: room.videoState.source,
        status: room.videoState.status
      }
    });

    return {
      room: room.toDetailJSON(),
      event: event.toJSON()
    };
  }

  /**
   * 改变字幕
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @param {string|null} subtitle - 字幕设置，null表示关闭字幕
   * @returns {Promise<Object>} 包含房间信息和同步事件
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   */
  async changeSubtitle(roomId, operatorId, subtitle) {
    const room = this.getRoom(roomId);
    this.assertRoomNotClosed(room);
    this.assertOperatorIsCreator(room, operatorId);

    // 更新视频状态
    room.videoState.subtitle = subtitle;
    room.videoState.lastUpdateTime = TimeSyncUtil.nowMs();

    // 创建同步事件
    const event = new SyncEvent({
      type: SyncEventType.CHANGE_SUBTITLE,
      roomId: room.id,
      operatorId: operatorId,
      serverTime: TimeSyncUtil.nowMs(),
      payload: {
        subtitle: subtitle,
        progress: room.videoState.getCurrentProgress(),
        playbackRate: room.videoState.playbackRate,
        source: room.videoState.source,
        status: room.videoState.status
      }
    });

    return {
      room: room.toDetailJSON(),
      event: event.toJSON()
    };
  }

  /**
   * 获取初始化状态
   * 给新加入房间的成员下发当前的视频状态
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @returns {Promise<Object>} 包含视频状态和服务端时间戳
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   */
  async getInitState(roomId) {
    const room = this.getRoom(roomId);
    
    return {
      videoState: room.videoState.toJSON(),
      serverTime: TimeSyncUtil.nowMs()
    };
  }
}

module.exports = SyncService;
