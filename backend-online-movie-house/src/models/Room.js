/**
 * @file 房间实体类
 * @description 定义线上观影室的核心数据结构，是房间管理模块的核心实体
 * @module models/Room
 */

const { VideoState } = require('./VideoState');
const { Participant, ParticipantRole } = require('./Participant');

/**
 * 房间状态枚举
 * @readonly
 * @enum {string}
 */
const RoomStatus = {
  /** 等待中 - 房间已创建，等待开始放映 */
  WAITING: 'waiting',
  /** 放映中 */
  PLAYING: 'playing',
  /** 已关闭 */
  CLOSED: 'closed'
};

/**
 * 房间类
 * 线上观影室的核心实体，管理房间配置、视频状态和参与者
 * 采用聚合根模式，VideoState和Participant作为房间的子实体
 * 
 * @class Room
 * @property {string} id - 房间唯一标识(房间号)
 * @property {string} name - 房间名称
 * @property {number} capacity - 人数上限
 * @property {string|null} password - 房间密码(可选)
 * @property {string} announcement - 房间公告
 * @property {string} status - 房间状态
 * @property {VideoState} videoState - 视频状态
 * @property {Map<string, Participant>} participants - 参与者映射表
 * @property {string} creatorId - 创建者ID
 * @property {Date} createTime - 创建时间
 * @property {Date} updateTime - 最后更新时间
 */
class Room {
  /**
   * 创建房间实例
   * 
   * @constructor
   * @param {Object} options - 初始化选项
   * @param {string} options.id - 房间ID
   * @param {string} options.name - 房间名称
   * @param {number} [options.capacity=10] - 人数上限
   * @param {string|null} [options.password=null] - 房间密码
   * @param {string} [options.announcement=''] - 房间公告
   * @param {string} options.creatorId - 创建者ID
   * @param {string} options.creatorNickname - 创建者昵称
   */
  constructor(options) {
    // 基本信息
    this.id = options.id;
    this.name = options.name;
    this.capacity = options.capacity || 10;
    this.password = options.password || null;
    this.announcement = options.announcement || '';
    
    // 状态信息
    this.status = RoomStatus.WAITING;
    this.videoState = new VideoState();
    
    // 参与者管理
    this.participants = new Map();
    this.creatorId = options.creatorId;
    
    // 时间信息
    this.createTime = new Date();
    this.updateTime = new Date();

    // 添加创建者作为第一个参与者
    if (options.creatorNickname) {
      this.addParticipant({
        id: options.creatorId,
        nickname: options.creatorNickname,
        role: ParticipantRole.CREATOR
      });
    }
  }

  /**
   * 检查房间是否需要密码
   * 
   * @returns {boolean} 是否需要密码
   */
  hasPassword() {
    return this.password !== null && this.password !== '';
  }

  /**
   * 验证房间密码
   * 
   * @param {string} password - 待验证的密码
   * @returns {boolean} 密码是否正确
   */
  validatePassword(password) {
    if (!this.hasPassword()) {
      return true;
    }
    return this.password === password;
  }

  /**
   * 检查房间是否已满
   * 
   * @returns {boolean} 房间是否已满
   */
  isFull() {
    return this.participants.size >= this.capacity;
  }

  /**
   * 获取当前在线人数
   * 
   * @returns {number} 在线人数
   */
  getOnlineCount() {
    let count = 0;
    this.participants.forEach(p => {
      if (p.status === 'online') count++;
    });
    return count;
  }

  /**
   * 添加参与者
   * 
   * @param {Object} participantData - 参与者数据
   * @returns {Participant|null} 添加的参与者，如果房间已满则返回null
   */
  addParticipant(participantData) {
    if (this.isFull() && !this.participants.has(participantData.id)) {
      return null;
    }

    const participant = new Participant(participantData);
    this.participants.set(participant.id, participant);
    this.updateTime = new Date();
    return participant;
  }

  /**
   * 移除参与者
   * 
   * @param {string} participantId - 参与者ID
   * @returns {boolean} 是否移除成功
   */
  removeParticipant(participantId) {
    const result = this.participants.delete(participantId);
    if (result) {
      this.updateTime = new Date();
    }
    return result;
  }

  /**
   * 获取参与者
   * 
   * @param {string} participantId - 参与者ID
   * @returns {Participant|undefined} 参与者实例
   */
  getParticipant(participantId) {
    return this.participants.get(participantId);
  }

  /**
   * 获取创建者
   * 
   * @returns {Participant|undefined} 创建者实例
   */
  getCreator() {
    return this.participants.get(this.creatorId);
  }

  /**
   * 检查用户是否为创建者
   * 
   * @param {string} participantId - 参与者ID
   * @returns {boolean} 是否为创建者
   */
  isCreator(participantId) {
    return this.creatorId === participantId;
  }

  /**
   * 更新房间配置
   * 
   * @param {Object} config - 新配置
   * @param {string} [config.name] - 房间名称
   * @param {number} [config.capacity] - 人数上限
   * @param {string} [config.password] - 房间密码
   * @param {string} [config.announcement] - 房间公告
   */
  updateConfig(config) {
    if (config.name !== undefined) this.name = config.name;
    if (config.capacity !== undefined) this.capacity = config.capacity;
    if (config.password !== undefined) this.password = config.password;
    if (config.announcement !== undefined) this.announcement = config.announcement;
    this.updateTime = new Date();
  }

  /**
   * 设置房间状态
   * 
   * @param {string} status - 新状态
   */
  setStatus(status) {
    if (Object.values(RoomStatus).includes(status)) {
      this.status = status;
      this.updateTime = new Date();
    }
  }

  /**
   * 关闭房间
   */
  close() {
    this.status = RoomStatus.CLOSED;
    this.updateTime = new Date();
  }

  /**
   * 转换为JSON格式（列表视图，简要信息）
   * 用于房间列表展示，不包含敏感信息
   * 
   * @returns {Object} JSON对象
   */
  toListJSON() {
    return {
      id: this.id,
      name: this.name,
      capacity: this.capacity,
      currentCount: this.participants.size,
      hasPassword: this.hasPassword(),
      status: this.status,
      creatorNickname: this.getCreator()?.nickname || '未知',
      createTime: this.createTime.toISOString()
    };
  }

  /**
   * 转换为JSON格式（详细视图）
   * 用于房间详情展示
   * 
   * @returns {Object} JSON对象
   */
  toDetailJSON() {
    return {
      id: this.id,
      name: this.name,
      capacity: this.capacity,
      currentCount: this.participants.size,
      hasPassword: this.hasPassword(),
      announcement: this.announcement,
      status: this.status,
      videoState: this.videoState.toJSON(),
      participants: Array.from(this.participants.values()).map(p => p.toJSON()),
      creatorId: this.creatorId,
      createTime: this.createTime.toISOString(),
      updateTime: this.updateTime.toISOString()
    };
  }
}

module.exports = { Room, RoomStatus };
