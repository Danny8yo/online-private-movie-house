/**
 * @file 参与者实体类
 * @description 定义房间参与者的数据结构，管理参与者信息和权限
 * @module models/Participant
 */

/**
 * 参与者角色枚举
 * @readonly
 * @enum {string}
 */
const ParticipantRole = {
  /** 房间创建者/管理员 - 拥有最高权限 */
  CREATOR: 'creator',
  /** 普通观众 */
  VIEWER: 'viewer'
};

/**
 * 参与者状态枚举
 * @readonly
 * @enum {string}
 */
const ParticipantStatus = {
  /** 在线 */
  ONLINE: 'online',
  /** 离线 */
  OFFLINE: 'offline'
};

/**
 * 参与者类
 * 管理房间内每个参与者的信息，包括身份、权限、状态等
 * 
 * @class Participant
 * @property {string} id - 参与者唯一标识
 * @property {string} nickname - 昵称
 * @property {string} role - 角色
 * @property {string} status - 在线状态
 * @property {Date} joinTime - 加入时间
 * @property {string|null} socketId - WebSocket连接ID
 */
class Participant {
  /**
   * 创建参与者实例
   * 
   * @constructor
   * @param {Object} options - 初始化选项
   * @param {string} options.id - 参与者ID
   * @param {string} options.nickname - 昵称
   * @param {string} [options.role='viewer'] - 角色
   * @param {string} [options.socketId=null] - Socket连接ID
   */
  constructor(options) {
    this.id = options.id;
    this.nickname = options.nickname;
    this.role = options.role || ParticipantRole.VIEWER;
    this.status = ParticipantStatus.ONLINE;
    this.joinTime = new Date();
    this.socketId = options.socketId || null;
  }

  /**
   * 检查是否为房间创建者
   * 
   * @returns {boolean} 是否为创建者
   */
  isCreator() {
    return this.role === ParticipantRole.CREATOR;
  }

  /**
   * 设置在线状态
   * 
   * @param {string} status - 新状态
   */
  setStatus(status) {
    if (Object.values(ParticipantStatus).includes(status)) {
      this.status = status;
    }
  }

  /**
   * 更新Socket连接ID
   * 
   * @param {string} socketId - 新的Socket ID
   */
  setSocketId(socketId) {
    this.socketId = socketId;
    this.status = socketId ? ParticipantStatus.ONLINE : ParticipantStatus.OFFLINE;
  }

  /**
   * 转换为JSON格式（安全版本，不包含敏感信息）
   * 
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      nickname: this.nickname,
      role: this.role,
      status: this.status,
      joinTime: this.joinTime.toISOString()
    };
  }
}

module.exports = { Participant, ParticipantRole, ParticipantStatus };
