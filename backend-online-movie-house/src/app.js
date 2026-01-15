/**
 * @file 应用入口文件
 * @description Express应用的主入口，负责初始化和配置整个应用
 *              包括中间件配置、路由注册、错误处理等
 * @module app
 */

const express = require('express');
const config = require('./config');
const createRoomRouter = require('./routes/roomRoutes');
const requestLogger = require('./middlewares/requestLogger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

/**
 * 创建并配置Express应用实例
 * 
 * @returns {express.Application} 配置完成的Express应用
 */
const createApp = () => {
  const app = express();

  // ==================== 基础中间件配置 ====================
  
  /**
   * JSON请求体解析中间件
   * 解析Content-Type为application/json的请求体
   */
  app.use(express.json());

  /**
   * URL编码请求体解析中间件
   * 解析Content-Type为application/x-www-form-urlencoded的请求体
   */
  app.use(express.urlencoded({ extended: true }));

  /**
   * CORS跨域配置中间件
   * 允许前端跨域访问API
   */
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.cors.origin);
    res.header('Access-Control-Allow-Methods', config.cors.methods.join(', '));
    res.header('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  /**
   * 请求日志中间件
   * 记录所有请求的基本信息
   */
  app.use(requestLogger);

  // ==================== 路由配置 ====================

  /**
   * 健康检查端点
   * 用于检测服务是否正常运行
   */
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  /**
   * API版本信息端点
   */
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: '在线观影室后端API',
      version: '1.0.0',
      endpoints: {
        rooms: '/api/rooms',
        health: '/health'
      }
    });
  });

  /**
   * 房间管理路由
   * 挂载到 /api/rooms 路径
   */
  app.use('/api/rooms', createRoomRouter());

  // ==================== 错误处理 ====================

  /**
   * 404错误处理
   * 处理所有未匹配的路由
   */
  app.use(notFoundHandler);

  /**
   * 全局错误处理
   * 处理所有未捕获的错误
   */
  app.use(errorHandler);

  return app;
};

/**
 * 启动服务器
 */
const startServer = () => {
  const app = createApp();
  const { port, host } = config.server;

  app.listen(port, () => {
    console.log('================================================');
    console.log('  在线观影室后端服务启动成功');
    console.log('================================================');
    console.log(`  服务地址: http://${host}:${port}`);
    console.log(`  API地址:  http://${host}:${port}/api`);
    console.log(`  房间API:  http://${host}:${port}/api/rooms`);
    console.log(`  健康检查: http://${host}:${port}/health`);
    console.log('================================================');
    console.log(`  启动时间: ${new Date().toISOString()}`);
    console.log('================================================');
  });
};

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}

// 导出用于测试
module.exports = { createApp, startServer };
