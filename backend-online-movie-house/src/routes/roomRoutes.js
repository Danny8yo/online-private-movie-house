/**
 * @file 房间路由定义
 * @description 定义房间管理相关的所有RESTful API路由
 *              遵循RESTful设计规范，使用合适的HTTP方法和URL结构
 * @module routes/roomRoutes
 */

const express = require('express');
const RoomController = require('../controllers/RoomController');

/**
 * 创建房间路由器
 * 
 * @returns {express.Router} Express路由器实例
 */
const createRoomRouter = () => {
  const router = express.Router();
  const roomController = RoomController.getInstance();

  /**
   * @api {get} /api/rooms/stats 获取房间统计信息
   * @apiName GetRoomStats
   * @apiGroup Room
   * @apiDescription 获取当前系统的房间统计数据
   * 
   * 注意：此路由必须放在 /:roomId 之前，否则 'stats' 会被当作 roomId
   */
  router.get('/stats', roomController.getRoomStats);

  /**
   * @api {get} /api/rooms 获取房间列表
   * @apiName GetRoomList
   * @apiGroup Room
   * @apiDescription 获取所有可用房间的列表，支持分页和搜索
   * 
   * @apiQuery {String} [keyword] 搜索关键词（匹配房间名称或房间号）
   * @apiQuery {String} [status] 房间状态过滤（waiting/playing）
   * @apiQuery {Number} [page=1] 页码
   * @apiQuery {Number} [pageSize=20] 每页数量
   */
  router.get('/', roomController.getRoomList);

  /**
   * @api {post} /api/rooms 创建房间
   * @apiName CreateRoom
   * @apiGroup Room
   * @apiDescription 创建一个新的线上观影室
   * 
   * @apiBody {String} name 房间名称（1-50字符）
   * @apiBody {Number} [capacity=10] 人数上限（2-100）
   * @apiBody {String} [password] 房间密码（可选，最长20字符）
   * @apiBody {String} [announcement] 房间公告（可选，最长500字符）
   * @apiBody {String} creatorNickname 创建者昵称
   */
  router.post('/', roomController.createRoom);

  /**
   * @api {get} /api/rooms/:roomId 获取房间详情
   * @apiName GetRoomDetail
   * @apiGroup Room
   * @apiDescription 获取指定房间的详细信息
   * 
   * @apiParam {String} roomId 房间ID（6位数字）
   */
  router.get('/:roomId', roomController.getRoomDetail);

  /**
   * @api {patch} /api/rooms/:roomId 更新房间配置
   * @apiName UpdateRoom
   * @apiGroup Room
   * @apiDescription 更新房间配置（仅房间创建者可操作）
   * 
   * @apiParam {String} roomId 房间ID
   * @apiBody {String} operatorId 操作者ID（必须是房间创建者）
   * @apiBody {String} [name] 新的房间名称
   * @apiBody {Number} [capacity] 新的人数上限
   * @apiBody {String} [password] 新的密码
   * @apiBody {String} [announcement] 新的公告
   */
  router.patch('/:roomId', roomController.updateRoom);

  /**
   * @api {delete} /api/rooms/:roomId 解散房间
   * @apiName DissolveRoom
   * @apiGroup Room
   * @apiDescription 解散房间（仅房间创建者可操作）
   * 
   * @apiParam {String} roomId 房间ID
   * @apiBody {String} operatorId 操作者ID（必须是房间创建者）
   */
  router.delete('/:roomId', roomController.dissolveRoom);

  /**
   * @api {post} /api/rooms/:roomId/verify-password 验证房间密码
   * @apiName VerifyPassword
   * @apiGroup Room
   * @apiDescription 验证房间密码是否正确
   * 
   * @apiParam {String} roomId 房间ID
   * @apiBody {String} password 待验证的密码
   */
  router.post('/:roomId/verify-password', roomController.verifyPassword);

  /**
   * @api {post} /api/rooms/:roomId/join 加入房间
   * @apiName JoinRoom
   * @apiGroup Room
   * @apiDescription 加入指定房间
   * 
   * @apiParam {String} roomId 房间ID
   * @apiBody {String} nickname 用户昵称
   * @apiBody {String} [password] 房间密码（如果房间设置了密码）
   */
  router.post('/:roomId/join', roomController.joinRoom);

  /**
   * @api {post} /api/rooms/:roomId/leave 退出房间
   * @apiName LeaveRoom
   * @apiGroup Room
   * @apiDescription 退出当前所在房间
   * 
   * @apiParam {String} roomId 房间ID
   * @apiBody {String} participantId 参与者ID
   */
  router.post('/:roomId/leave', roomController.leaveRoom);

  return router;
};

module.exports = createRoomRouter;
