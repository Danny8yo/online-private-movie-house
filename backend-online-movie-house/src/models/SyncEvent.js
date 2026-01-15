/**
 * @file 同步事件值对象类
 * @description 定义视频同步控制事件的数据结构，用于在服务端和客户端之间传递同步信息
 * @module models/SyncEvent
 */

/**
 * 同步事件类型枚举
 * @readonly
 * @enum {string}
 */
const SyncEventType = {
  /** 更换视频源 */
  CHANGE_SOURCE: 'CHANGE_SOURCE',
  /** 播放 */
  PLAY: 'PLAY',
  /** 暂停 */
  PAUSE: 'PAUSE',
  /** 跳转进度 */
  SEEK: 'SEEK',
  /** 改变播放倍速 */
  CHANGE_RATE: 'CHANGE_RATE',
  /** 改变字幕 */
  CHANGE_SUBTITLE: 'CHANGE_SUBTITLE'
};

/**
 * 同步事件类
 * 表示一次视频同步控制事件，包含事件类型、操作者信息、服务端时间戳和事件载荷
 * 
 * @class SyncEvent
 * @property {string} type - 事件类型
 * @property {string} roomId - 房间ID
 * @property {string} operatorId - 操作者ID（发起人participantId）
 * @property {number} serverTime - 服务端时间戳（毫秒）
 * @property {Object} payload - 事件载荷（不同事件类型内容不同）
 */
class SyncEvent {
  /**
   * 创建同步事件实例
   * 
   * @constructor
   * @param {Object} options - 事件选项
   * @param {string} options.type - 事件类型
   * @param {string} options.roomId - 房间ID
   * @param {string} options.operatorId - 操作者ID
   * @param {number} [options.serverTime] - 服务端时间戳，默认使用当前时间
   * @param {Object} options.payload - 事件载荷
   */
  constructor(options) {
    if (!Object.values(SyncEventType).includes(options.type)) {
      throw new Error(`无效的事件类型: ${options.type}`);
    }

    this.type = options.type;
    this.roomId = options.roomId;
    this.operatorId = options.operatorId;
    this.serverTime = options.serverTime || Date.now();
    this.payload = options.payload || {};
  }

  /**
   * 转换为JSON格式
   * 用于序列化和网络传输
   * 
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      type: this.type,
      roomId: this.roomId,
      operatorId: this.operatorId,
      serverTime: this.serverTime,
      payload: this.payload
    };
  }
}

module.exports = { SyncEvent, SyncEventType };
