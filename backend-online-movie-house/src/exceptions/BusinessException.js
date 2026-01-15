/**
 * @file 业务异常类定义
 * @description 定义系统中使用的各种业务异常类，用于统一错误处理
 * @module exceptions/BusinessException
 */

/**
 * 业务异常基类
 * 所有业务异常的父类，包含错误码和HTTP状态码
 * 
 * @class BusinessException
 * @extends Error
 */
class BusinessException extends Error {
  /**
   * 创建业务异常实例
   * 
   * @constructor
   * @param {string} message - 错误消息
   * @param {string} errorCode - 业务错误码
   * @param {number} statusCode - HTTP状态码
   */
  constructor(message, errorCode, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 房间不存在异常
 * 当请求的房间不存在时抛出
 * 
 * @class RoomNotFoundException
 * @extends BusinessException
 */
class RoomNotFoundException extends BusinessException {
  constructor(roomId) {
    super(`房间 ${roomId} 不存在`, 'ROOM_NOT_FOUND', 404);
    this.roomId = roomId;
  }
}

/**
 * 房间已满异常
 * 当房间达到人数上限时抛出
 * 
 * @class RoomFullException
 * @extends BusinessException
 */
class RoomFullException extends BusinessException {
  constructor(roomId) {
    super(`房间 ${roomId} 已满`, 'ROOM_FULL', 409);
    this.roomId = roomId;
  }
}

/**
 * 密码错误异常
 * 当房间密码验证失败时抛出
 * 
 * @class InvalidPasswordException
 * @extends BusinessException
 */
class InvalidPasswordException extends BusinessException {
  constructor() {
    super('房间密码错误', 'INVALID_PASSWORD', 401);
  }
}

/**
 * 权限不足异常
 * 当用户没有执行操作的权限时抛出
 * 
 * @class PermissionDeniedException
 * @extends BusinessException
 */
class PermissionDeniedException extends BusinessException {
  constructor(action) {
    super(`没有权限执行此操作: ${action}`, 'PERMISSION_DENIED', 403);
    this.action = action;
  }
}

/**
 * 参数验证异常
 * 当请求参数不合法时抛出
 * 
 * @class ValidationException
 * @extends BusinessException
 */
class ValidationException extends BusinessException {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.details = details;
  }
}

/**
 * 房间已关闭异常
 * 当尝试操作已关闭的房间时抛出
 * 
 * @class RoomClosedException
 * @extends BusinessException
 */
class RoomClosedException extends BusinessException {
  constructor(roomId) {
    super(`房间 ${roomId} 已关闭`, 'ROOM_CLOSED', 410);
    this.roomId = roomId;
  }
}

module.exports = {
  BusinessException,
  RoomNotFoundException,
  RoomFullException,
  InvalidPasswordException,
  PermissionDeniedException,
  ValidationException,
  RoomClosedException
};
