/**
 * @file 响应助手工具类
 * @description 统一处理HTTP响应格式，确保API响应的一致性
 * @module utils/ResponseHelper
 */

/**
 * 响应助手类
 * 提供统一的响应格式化方法，遵循RESTful API设计规范
 * 
 * @class ResponseHelper
 * @example
 * // 成功响应
 * ResponseHelper.success(res, data, '操作成功');
 * // 错误响应
 * ResponseHelper.error(res, 400, '参数错误', 'INVALID_PARAMS');
 */
class ResponseHelper {
  /**
   * 发送成功响应
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {*} data - 响应数据
   * @param {string} [message='操作成功'] - 响应消息
   * @param {number} [statusCode=200] - HTTP状态码
   * @returns {Object} Express响应
   */
  static success(res, data = null, message = '操作成功', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      code: statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 发送创建成功响应
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {*} data - 创建的资源数据
   * @param {string} [message='创建成功'] - 响应消息
   * @returns {Object} Express响应
   */
  static created(res, data = null, message = '创建成功') {
    return this.success(res, data, message, 201);
  }

  /**
   * 发送错误响应
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {number} statusCode - HTTP状态码
   * @param {string} message - 错误消息
   * @param {string} [errorCode=null] - 业务错误码
   * @param {*} [details=null] - 错误详情
   * @returns {Object} Express响应
   */
  static error(res, statusCode, message, errorCode = null, details = null) {
    const response = {
      success: false,
      code: statusCode,
      message,
      timestamp: new Date().toISOString()
    };

    if (errorCode) {
      response.errorCode = errorCode;
    }

    if (details) {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 发送400错误响应 - 请求参数错误
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {string} [message='请求参数错误'] - 错误消息
   * @param {*} [details=null] - 错误详情
   * @returns {Object} Express响应
   */
  static badRequest(res, message = '请求参数错误', details = null) {
    return this.error(res, 400, message, 'BAD_REQUEST', details);
  }

  /**
   * 发送401错误响应 - 未授权
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {string} [message='未授权访问'] - 错误消息
   * @returns {Object} Express响应
   */
  static unauthorized(res, message = '未授权访问') {
    return this.error(res, 401, message, 'UNAUTHORIZED');
  }

  /**
   * 发送403错误响应 - 禁止访问
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {string} [message='禁止访问'] - 错误消息
   * @returns {Object} Express响应
   */
  static forbidden(res, message = '禁止访问') {
    return this.error(res, 403, message, 'FORBIDDEN');
  }

  /**
   * 发送404错误响应 - 资源不存在
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {string} [message='资源不存在'] - 错误消息
   * @returns {Object} Express响应
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, 404, message, 'NOT_FOUND');
  }

  /**
   * 发送409错误响应 - 资源冲突
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {string} [message='资源冲突'] - 错误消息
   * @returns {Object} Express响应
   */
  static conflict(res, message = '资源冲突') {
    return this.error(res, 409, message, 'CONFLICT');
  }

  /**
   * 发送500错误响应 - 服务器内部错误
   * 
   * @static
   * @param {Object} res - Express响应对象
   * @param {string} [message='服务器内部错误'] - 错误消息
   * @returns {Object} Express响应
   */
  static serverError(res, message = '服务器内部错误') {
    return this.error(res, 500, message, 'INTERNAL_SERVER_ERROR');
  }
}

module.exports = ResponseHelper;
