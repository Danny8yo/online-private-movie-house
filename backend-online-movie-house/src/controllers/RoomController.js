/**
 * @file 房间控制器
 * @description 处理房间相关的HTTP请求，负责参数提取、调用服务层并格式化响应
 *              遵循MVC模式，Controller只负责请求处理和响应，不包含业务逻辑
 * @module controllers/RoomController
 */

const RoomService = require('../services/RoomService');
const ResponseHelper = require('../utils/ResponseHelper');

/**
 * 房间控制器类
 * 处理所有与房间管理相关的HTTP请求
 * 采用单例模式，确保服务层实例的复用
 * 
 * @class RoomController
 */
class RoomController {
  /**
   * 单例实例
   * @private
   * @static
   * @type {RoomController|null}
   */
  static instance = null;

  /**
   * 创建控制器实例
   * @constructor
   * @private
   */
  constructor() {
    this.roomService = RoomService.getInstance();
    
    // 绑定方法的this上下文，确保在路由中调用时this指向正确
    this.createRoom = this.createRoom.bind(this);
    this.getRoomList = this.getRoomList.bind(this);
    this.getRoomDetail = this.getRoomDetail.bind(this);
    this.joinRoom = this.joinRoom.bind(this);
    this.leaveRoom = this.leaveRoom.bind(this);
    this.dissolveRoom = this.dissolveRoom.bind(this);
    this.updateRoom = this.updateRoom.bind(this);
    this.verifyPassword = this.verifyPassword.bind(this);
    this.getRoomStats = this.getRoomStats.bind(this);
  }

  /**
   * 获取单例实例
   * 
   * @static
   * @returns {RoomController} 控制器实例
   */
  static getInstance() {
    if (!RoomController.instance) {
      RoomController.instance = new RoomController();
    }
    return RoomController.instance;
  }

  /**
   * 创建房间
   * POST /api/rooms
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.body - 请求体
   * @param {string} req.body.name - 房间名称
   * @param {number} [req.body.capacity] - 人数上限
   * @param {string} [req.body.password] - 房间密码
   * @param {string} [req.body.announcement] - 房间公告
   * @param {string} req.body.creatorNickname - 创建者昵称
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async createRoom(req, res, next) {
    try {
      const { name, capacity, password, announcement, creatorNickname } = req.body;

      const result = await this.roomService.createRoom({
        name,
        capacity,
        password,
        announcement,
        creatorNickname
      });

      ResponseHelper.created(res, result, '房间创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取房间列表
   * GET /api/rooms
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.query - 查询参数
   * @param {string} [req.query.keyword] - 搜索关键词
   * @param {string} [req.query.status] - 房间状态过滤
   * @param {number} [req.query.page=1] - 页码
   * @param {number} [req.query.pageSize=20] - 每页数量
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async getRoomList(req, res, next) {
    try {
      const { keyword, status, page, pageSize } = req.query;

      const result = await this.roomService.getRoomList({
        keyword,
        status,
        page: page || 1,
        pageSize: pageSize || 20
      });

      ResponseHelper.success(res, result, '获取房间列表成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取房间详情
   * GET /api/rooms/:roomId
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.params - 路径参数
   * @param {string} req.params.roomId - 房间ID
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async getRoomDetail(req, res, next) {
    try {
      const { roomId } = req.params;

      const result = await this.roomService.getRoomDetail(roomId);

      ResponseHelper.success(res, result, '获取房间详情成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 验证房间密码
   * POST /api/rooms/:roomId/verify-password
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.params - 路径参数
   * @param {string} req.params.roomId - 房间ID
   * @param {Object} req.body - 请求体
   * @param {string} req.body.password - 待验证的密码
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async verifyPassword(req, res, next) {
    try {
      const { roomId } = req.params;
      const { password } = req.body;

      await this.roomService.verifyRoomPassword(roomId, password);

      ResponseHelper.success(res, { valid: true }, '密码验证成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 加入房间
   * POST /api/rooms/:roomId/join
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.params - 路径参数
   * @param {string} req.params.roomId - 房间ID
   * @param {Object} req.body - 请求体
   * @param {string} req.body.nickname - 用户昵称
   * @param {string} [req.body.password] - 房间密码
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async joinRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const { nickname, password } = req.body;

      const result = await this.roomService.joinRoom(roomId, {
        nickname,
        password
      });

      ResponseHelper.success(res, result, '加入房间成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 退出房间
   * POST /api/rooms/:roomId/leave
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.params - 路径参数
   * @param {string} req.params.roomId - 房间ID
   * @param {Object} req.body - 请求体
   * @param {string} req.body.participantId - 参与者ID
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async leaveRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const { participantId } = req.body;

      await this.roomService.leaveRoom(roomId, participantId);

      ResponseHelper.success(res, null, '退出房间成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 解散房间
   * DELETE /api/rooms/:roomId
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.params - 路径参数
   * @param {string} req.params.roomId - 房间ID
   * @param {Object} req.body - 请求体
   * @param {string} req.body.operatorId - 操作者ID（必须是房间创建者）
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async dissolveRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const { operatorId } = req.body;

      await this.roomService.dissolveRoom(roomId, operatorId);

      ResponseHelper.success(res, null, '房间已解散');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新房间配置
   * PATCH /api/rooms/:roomId
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} req.params - 路径参数
   * @param {string} req.params.roomId - 房间ID
   * @param {Object} req.body - 请求体
   * @param {string} req.body.operatorId - 操作者ID（必须是房间创建者）
   * @param {string} [req.body.name] - 新的房间名称
   * @param {number} [req.body.capacity] - 新的人数上限
   * @param {string} [req.body.password] - 新的密码
   * @param {string} [req.body.announcement] - 新的公告
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async updateRoom(req, res, next) {
    try {
      const { roomId } = req.params;
      const { operatorId, ...updateData } = req.body;

      const result = await this.roomService.updateRoom(roomId, operatorId, updateData);

      ResponseHelper.success(res, result, '房间配置更新成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取房间统计信息
   * GET /api/rooms/stats
   * 
   * @async
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @param {Function} next - Express下一步中间件
   */
  async getRoomStats(req, res, next) {
    try {
      const result = await this.roomService.getRoomStats();

      ResponseHelper.success(res, result, '获取统计信息成功');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoomController;
