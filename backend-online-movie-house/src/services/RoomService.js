/**
 * @file 房间服务层
 * @description 实现房间管理的核心业务逻辑，包括创建、加入、退出、解散等功能
 *              采用单例模式，协调Repository和Model完成业务操作
 * @module services/RoomService
 */

const RoomRepository = require('../repositories/RoomRepository');
const IdGenerator = require('../utils/IdGenerator');
const config = require('../config');
const {
  RoomNotFoundException,
  RoomFullException,
  InvalidPasswordException,
  PermissionDeniedException,
  ValidationException,
  RoomClosedException
} = require('../exceptions/BusinessException');

/**
 * 房间服务类
 * 封装房间管理的所有业务逻辑，是Controller和Repository之间的桥梁
 * 负责业务规则验证、事务协调和异常处理
 * 
 * @class RoomService
 * @singleton
 */
class RoomService {
  /**
   * 单例实例
   * @private
   * @static
   * @type {RoomService|null}
   */
  static instance = null;

  /**
   * 创建房间服务实例
   * @constructor
   * @private
   */
  constructor() {
    this.roomRepository = RoomRepository.getInstance();
  }

  /**
   * 获取单例实例
   * 
   * @static
   * @returns {RoomService} 服务实例
   */
  static getInstance() {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  /**
   * 验证房间创建参数
   * 
   * @private
   * @param {Object} data - 创建参数
   * @throws {ValidationException} 当参数不合法时抛出
   */
  validateCreateParams(data) {
    const errors = [];

    // 验证房间名称
    if (!data.name || typeof data.name !== 'string') {
      errors.push({ field: 'name', message: '房间名称不能为空' });
    } else {
      const nameLength = data.name.trim().length;
      if (nameLength < config.room.nameMinLength) {
        errors.push({ field: 'name', message: `房间名称长度不能小于${config.room.nameMinLength}个字符` });
      }
      if (nameLength > config.room.nameMaxLength) {
        errors.push({ field: 'name', message: `房间名称长度不能超过${config.room.nameMaxLength}个字符` });
      }
    }

    // 验证人数上限
    if (data.capacity !== undefined) {
      const capacity = parseInt(data.capacity);
      if (isNaN(capacity) || capacity < config.room.minCapacity || capacity > config.room.maxCapacity) {
        errors.push({ 
          field: 'capacity', 
          message: `人数上限必须在${config.room.minCapacity}-${config.room.maxCapacity}之间` 
        });
      }
    }

    // 验证密码（如果提供）
    if (data.password && data.password.length > config.room.passwordMaxLength) {
      errors.push({ 
        field: 'password', 
        message: `密码长度不能超过${config.room.passwordMaxLength}个字符` 
      });
    }

    // 验证公告（如果提供）
    if (data.announcement && data.announcement.length > config.room.announcementMaxLength) {
      errors.push({ 
        field: 'announcement', 
        message: `公告长度不能超过${config.room.announcementMaxLength}个字符` 
      });
    }

    // 验证创建者昵称
    if (!data.creatorNickname || typeof data.creatorNickname !== 'string' || !data.creatorNickname.trim()) {
      errors.push({ field: 'creatorNickname', message: '创建者昵称不能为空' });
    }

    if (errors.length > 0) {
      throw new ValidationException('参数验证失败', errors);
    }
  }

  /**
   * 创建房间
   * 
   * @async
   * @param {Object} createData - 创建数据
   * @param {string} createData.name - 房间名称
   * @param {number} [createData.capacity] - 人数上限
   * @param {string} [createData.password] - 房间密码
   * @param {string} [createData.announcement] - 房间公告
   * @param {string} createData.creatorNickname - 创建者昵称
   * @returns {Promise<Object>} 创建结果，包含房间信息和创建者信息
   * @throws {ValidationException} 当参数不合法时抛出
   * 
   * @example
   * const result = await roomService.createRoom({
   *   name: '周末观影',
   *   capacity: 20,
   *   creatorNickname: '房主'
   * });
   */
  async createRoom(createData) {
    // 参数验证
    this.validateCreateParams(createData);

    // 生成创建者ID
    const creatorId = IdGenerator.generateUUID();

    // 创建房间
    const room = this.roomRepository.create({
      name: createData.name.trim(),
      capacity: createData.capacity || config.room.defaultCapacity,
      password: createData.password || null,
      announcement: createData.announcement || '',
      creatorId: creatorId,
      creatorNickname: createData.creatorNickname.trim()
    });

    // 返回创建结果
    return {
      room: room.toDetailJSON(),
      creator: {
        id: creatorId,
        nickname: createData.creatorNickname.trim(),
        role: 'creator'
      }
    };
  }

  /**
   * 获取房间列表
   * 
   * @async
   * @param {Object} [options={}] - 查询选项
   * @param {string} [options.keyword] - 搜索关键词
   * @param {string} [options.status] - 房间状态过滤
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.pageSize=20] - 每页数量
   * @returns {Promise<Object>} 分页结果
   */
  async getRoomList(options = {}) {
    const { keyword, status, page = 1, pageSize = 20 } = options;

    // 搜索房间
    let rooms = this.roomRepository.search({ keyword, status });

    // 按创建时间倒序排列
    rooms.sort((a, b) => b.createTime - a.createTime);

    // 分页处理
    const total = rooms.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedRooms = rooms.slice(startIndex, endIndex);

    return {
      list: pagedRooms.map(room => room.toListJSON()),
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages
      }
    };
  }

  /**
   * 获取房间详情
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @returns {Promise<Object>} 房间详情
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   */
  async getRoomDetail(roomId) {
    const room = this.roomRepository.findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    return room.toDetailJSON();
  }

  /**
   * 验证房间密码
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} password - 待验证的密码
   * @returns {Promise<boolean>} 验证结果
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {InvalidPasswordException} 当密码错误时抛出
   */
  async verifyRoomPassword(roomId, password) {
    const room = this.roomRepository.findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    if (!room.validatePassword(password)) {
      throw new InvalidPasswordException();
    }

    return true;
  }

  /**
   * 加入房间
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {Object} joinData - 加入数据
   * @param {string} joinData.nickname - 用户昵称
   * @param {string} [joinData.password] - 房间密码
   * @returns {Promise<Object>} 加入结果，包含房间信息和用户信息
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {RoomFullException} 当房间已满时抛出
   * @throws {InvalidPasswordException} 当密码错误时抛出
   */
  async joinRoom(roomId, joinData) {
    const room = this.roomRepository.findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    if (room.status === 'closed') {
      throw new RoomClosedException(roomId);
    }

    if (room.isFull()) {
      throw new RoomFullException(roomId);
    }

    // 验证密码
    if (room.hasPassword() && !room.validatePassword(joinData.password)) {
      throw new InvalidPasswordException();
    }

    // 验证昵称
    if (!joinData.nickname || !joinData.nickname.trim()) {
      throw new ValidationException('昵称不能为空');
    }

    // 生成用户ID
    const participantId = IdGenerator.generateUUID();

    // 添加参与者
    const participant = room.addParticipant({
      id: participantId,
      nickname: joinData.nickname.trim(),
      role: 'viewer'
    });

    return {
      room: room.toDetailJSON(),
      participant: participant.toJSON()
    };
  }

  /**
   * 退出房间
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} participantId - 参与者ID
   * @returns {Promise<boolean>} 退出结果
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   */
  async leaveRoom(roomId, participantId) {
    const room = this.roomRepository.findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    return room.removeParticipant(participantId);
  }

  /**
   * 解散房间
   * 只有房间创建者可以解散房间
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @returns {Promise<boolean>} 解散结果
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   */
  async dissolveRoom(roomId, operatorId) {
    const room = this.roomRepository.findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    // 验证权限
    if (!room.isCreator(operatorId)) {
      throw new PermissionDeniedException('解散房间');
    }

    // 关闭房间
    room.close();

    // 从存储中删除
    return this.roomRepository.delete(roomId);
  }

  /**
   * 更新房间配置
   * 只有房间创建者可以更新配置
   * 
   * @async
   * @param {string} roomId - 房间ID
   * @param {string} operatorId - 操作者ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的房间信息
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {PermissionDeniedException} 当操作者不是创建者时抛出
   */
  async updateRoom(roomId, operatorId, updateData) {
    const room = this.roomRepository.findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }

    // 验证权限
    if (!room.isCreator(operatorId)) {
      throw new PermissionDeniedException('更新房间配置');
    }

    // 更新配置
    room.updateConfig(updateData);

    return room.toDetailJSON();
  }

  /**
   * 检查房间是否存在
   * 
   * @param {string} roomId - 房间ID
   * @returns {boolean} 房间是否存在
   */
  roomExists(roomId) {
    return this.roomRepository.exists(roomId);
  }

  /**
   * 获取房间统计信息
   * 
   * @async
   * @returns {Promise<Object>} 统计信息
   */
  async getRoomStats() {
    const rooms = this.roomRepository.findAll({ excludeClosed: true });
    
    let totalParticipants = 0;
    let waitingRooms = 0;
    let playingRooms = 0;

    rooms.forEach(room => {
      totalParticipants += room.participants.size;
      if (room.status === 'waiting') waitingRooms++;
      if (room.status === 'playing') playingRooms++;
    });

    return {
      totalRooms: rooms.length,
      totalParticipants,
      waitingRooms,
      playingRooms
    };
  }
}

module.exports = RoomService;
