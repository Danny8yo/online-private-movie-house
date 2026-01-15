/**
 * @file 全局错误处理中间件
 * @description 统一处理应用中的所有错误，将业务异常和系统异常转换为标准响应格式
 * @module middlewares/errorHandler
 */

const ResponseHelper = require('../utils/ResponseHelper');
const { BusinessException } = require('../exceptions/BusinessException');

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误，并转换为统一的错误响应格式
 * 
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一步中间件
 */
const errorHandler = (err, req, res, next) => {
  // 如果响应已发送，直接传递给默认错误处理
  if (res.headersSent) {
    return next(err);
  }

  // 打印错误日志（生产环境应使用专业日志库）
  console.error(`[ERROR] ${new Date().toISOString()}`);
  console.error(`[PATH] ${req.method} ${req.path}`);
  console.error(`[MESSAGE] ${err.message}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[STACK] ${err.stack}`);
  }

  // 处理业务异常
  if (err instanceof BusinessException) {
    return ResponseHelper.error(
      res,
      err.statusCode,
      err.message,
      err.errorCode,
      err.details || null
    );
  }

  // 处理Express参数验证错误
  if (err.type === 'entity.parse.failed') {
    return ResponseHelper.badRequest(res, 'JSON解析失败，请检查请求体格式');
  }

  // 处理其他已知错误类型
  if (err.name === 'SyntaxError' && err.status === 400) {
    return ResponseHelper.badRequest(res, '请求格式错误');
  }

  if (err.name === 'ValidationError') {
    return ResponseHelper.badRequest(res, err.message);
  }

  // 处理未知错误（服务器内部错误）
  return ResponseHelper.serverError(
    res,
    process.env.NODE_ENV === 'production' 
      ? '服务器内部错误，请稍后重试' 
      : err.message
  );
};

/**
 * 404错误处理中间件
 * 处理所有未匹配的路由
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const notFoundHandler = (req, res) => {
  ResponseHelper.notFound(res, `接口 ${req.method} ${req.path} 不存在`);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
