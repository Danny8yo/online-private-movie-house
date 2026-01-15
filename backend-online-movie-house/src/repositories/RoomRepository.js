/**
 * @file 房间数据访问层（Repository）
 * @description 管理房间数据的内存存储，提供CRUD操作接口
 *              采用单例模式确保全局数据一致性
 *              为未来迁移到持久化存储提供兼容接口
 * @module repositories/RoomRepository
 */

const { Room } = require('../models/Room');
const IdGenerator = require('../utils/IdGenerator');
const config = require('../config');

/**
 * 房间仓库类
 * 负责房间数据的存储和检索，当前使用内存存储实现
 * 采用单例模式，确保整个应用共享同一个数据存储实例
 * 
 * @class RoomRepository
 * @singleton
 */
class RoomRepository {
  /**
   * 单例实例
   * @private
   * @static
   * @type {RoomRepository|null}
   */
  static instance = null;

  /**
   * 创建房间仓库实例
   * 私有构造函数，通过getInstance()获取实例
   * 
   * @constructor
   * @private
   */
  constructor() {
    /**
     * 房间存储映射表
     * key: 房间ID
     * value: Room实例
     * @private
     * @type {Map<string, Room>}
     */
    this.rooms = new Map();
  }

  /**
   * 获取单例实例
   * 
   * @static
   * @returns {RoomRepository} 仓库实例
   */
  static getInstance() {
    if (!RoomRepository.instance) {
      RoomRepository.instance = new RoomRepository();
    }
    return RoomRepository.instance;
  }

  /**
   * 生成唯一的房间ID
   * 确保生成的ID在当前存储中不存在重复
   * 
   * @private
   * @returns {string} 唯一的房间ID
   */
  generateUniqueRoomId() {
    let roomId;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      roomId = IdGenerator.generateRoomId();
      attempts++;
      
      if (attempts >= maxAttempts) {
        // 如果多次尝试都有冲突，使用更长的ID
        roomId = IdGenerator.generateRoomId(config.room.roomIdLength + 2);
      }
    } while (this.rooms.has(roomId));

    return roomId;
  }

  /**
   * 创建新房间
   * 
   * @param {Object} roomData - 房间创建数据
   * @param {string} roomData.name - 房间名称
   * @param {number} [roomData.capacity] - 人数上限
   * @param {string} [roomData.password] - 房间密码
   * @param {string} [roomData.announcement] - 房间公告
   * @param {string} roomData.creatorId - 创建者ID
   * @param {string} roomData.creatorNickname - 创建者昵称
   * @returns {Room} 创建的房间实例
   */
  create(roomData) {
    const roomId = this.generateUniqueRoomId();
    
    const room = new Room({
      id: roomId,
      name: roomData.name,
      capacity: roomData.capacity,
      password: roomData.password,
      announcement: roomData.announcement,
      creatorId: roomData.creatorId,
      creatorNickname: roomData.creatorNickname
    });

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * 根据ID查找房间
   * 
   * @param {string} roomId - 房间ID
   * @returns {Room|null} 房间实例，不存在则返回null
   */
  findById(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 获取所有房间
   * 
   * @param {Object} [options={}] - 查询选项
   * @param {boolean} [options.excludeClosed=true] - 是否排除已关闭的房间
   * @returns {Room[]} 房间列表
   */
  findAll(options = {}) {
    const { excludeClosed = true } = options;
    const rooms = Array.from(this.rooms.values());
    
    if (excludeClosed) {
      return rooms.filter(room => room.status !== 'closed');
    }
    
    return rooms;
  }

  /**
   * 更新房间
   * 
   * @param {string} roomId - 房间ID
   * @param {Object} updateData - 更新数据
   * @returns {Room|null} 更新后的房间实例，不存在则返回null
   */
  update(roomId, updateData) {
    const room = this.findById(roomId);
    if (!room) {
      return null;
    }

    room.updateConfig(updateData);
    return room;
  }

  /**
   * 删除房间
   * 
   * @param {string} roomId - 房间ID
   * @returns {boolean} 是否删除成功
   */
  delete(roomId) {
    return this.rooms.delete(roomId);
  }

  /**
   * 检查房间是否存在
   * 
   * @param {string} roomId - 房间ID
   * @returns {boolean} 房间是否存在
   */
  exists(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * 获取房间总数
   * 
   * @param {boolean} [excludeClosed=true] - 是否排除已关闭的房间
   * @returns {number} 房间数量
   */
  count(excludeClosed = true) {
    if (excludeClosed) {
      return this.findAll({ excludeClosed: true }).length;
    }
    return this.rooms.size;
  }

  /**
   * 搜索房间
   * 根据条件搜索房间
   * 
   * @param {Object} criteria - 搜索条件
   * @param {string} [criteria.keyword] - 关键词（匹配房间名称）
   * @param {string} [criteria.status] - 房间状态
   * @param {boolean} [criteria.hasPassword] - 是否有密码
   * @returns {Room[]} 匹配的房间列表
   */
  search(criteria = {}) {
    let rooms = this.findAll({ excludeClosed: true });

    // 关键词搜索
    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      rooms = rooms.filter(room => 
        room.name.toLowerCase().includes(keyword) ||
        room.id.includes(keyword)
      );
    }

    // 状态过滤
    if (criteria.status) {
      rooms = rooms.filter(room => room.status === criteria.status);
    }

    // 密码过滤
    if (criteria.hasPassword !== undefined) {
      rooms = rooms.filter(room => room.hasPassword() === criteria.hasPassword);
    }

    return rooms;
  }

  /**
   * 清空所有房间（仅用于测试）
   */
  clear() {
    this.rooms.clear();
  }
}

module.exports = RoomRepository;
