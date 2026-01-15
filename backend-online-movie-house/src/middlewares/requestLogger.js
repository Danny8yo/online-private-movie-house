/**
 * @file 请求日志中间件
 * @description 记录所有HTTP请求的基本信息，便于调试和监控
 * @module middlewares/requestLogger
 */

/**
 * 请求日志中间件
 * 记录每个请求的方法、路径、响应时间等信息
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一步中间件
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求信息
  const requestInfo = {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  };

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
    
    console.log(
      `[${logLevel}] ${requestInfo.timestamp} | ${requestInfo.method} ${requestInfo.path} | ${res.statusCode} | ${duration}ms | ${requestInfo.ip}`
    );
  });

  next();
};

module.exports = requestLogger;
