/**
 * @file ID生成器工具类
 * @description 提供各种ID生成方法，用于生成房间号等唯一标识
 * @module utils/IdGenerator
 */

const config = require('../config');

/**
 * ID生成器类
 * 负责生成系统中使用的各种唯一标识符
 * 
 * @class IdGenerator
 */
class IdGenerator {
  /**
   * 生成房间ID
   * 生成指定长度的数字房间号
   * 
   * @static
   * @param {number} [length=6] - 房间号长度
   * @returns {string} 生成的房间号
   * @example
   * const roomId = IdGenerator.generateRoomId(); // "123456"
   */
  static generateRoomId(length = config.room.roomIdLength) {
    let result = '';
    const characters = '0123456789';
    
    // 确保第一位不为0
    result += characters.charAt(Math.floor(Math.random() * 9) + 1);
    
    // 生成剩余位数
    for (let i = 1; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  /**
   * 生成UUID v4
   * 生成符合UUID v4标准的唯一标识符
   * 
   * @static
   * @returns {string} UUID字符串
   * @example
   * const uuid = IdGenerator.generateUUID(); // "550e8400-e29b-41d4-a716-446655440000"
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 生成时间戳ID
   * 结合时间戳和随机数生成唯一ID
   * 
   * @static
   * @returns {string} 时间戳ID
   */
  static generateTimestampId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomPart}`;
  }
}

module.exports = IdGenerator;
