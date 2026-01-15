/**
 * @file 应用配置文件
 * @description 集中管理应用的所有配置项，包括服务器配置、房间配置等
 * @module config
 */

const config = {
  /**
   * 服务器配置
   */
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  /**
   * 房间配置
   * 定义房间相关的约束条件
   */
  room: {
    // 房间名称最小长度
    nameMinLength: 1,
    // 房间名称最大长度
    nameMaxLength: 50,
    // 房间人数上限最小值
    minCapacity: 2,
    // 房间人数上限最大值
    maxCapacity: 100,
    // 默认人数上限
    defaultCapacity: 10,
    // 房间密码最大长度
    passwordMaxLength: 20,
    // 公告最大长度
    announcementMaxLength: 500,
    // 房间号长度
    roomIdLength: 6
  },

  /**
   * CORS配置
   * 跨域资源共享配置
   */
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};

module.exports = config;
