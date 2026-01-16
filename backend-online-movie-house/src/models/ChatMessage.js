/**
 * @file 聊天消息实体类
 * @description 定义房间聊天消息的数据结构
 * @module models/ChatMessage
 */

const IdGenerator = require('../utils/IdGenerator');

/**
 * 聊天消息类型枚举
 * @readonly
 * @enum {string}
 */
const MessageType = {
  /** 普通聊天消息 */
  CHAT: 'chat',
  /** 系统通知消息 */
  SYSTEM: 'system'
};

/**
 * 聊天消息类
 * 表示房间内的一条聊天消息
 * 
 * @class ChatMessage
 * @property {string} id - 消息唯一ID
 * @property {string} roomId - 所属房间ID
 * @property {string} senderId - 发送者ID
 * @property {string} senderNickname - 发送者昵称
 * @property {string} content - 消息内容
 * @property {string} type - 消息类型（chat/system）
 * @property {number} timestamp - 发送时间戳（毫秒）
 */
class ChatMessage {
  /**
   * 创建聊天消息实例
   * 
   * @constructor
   * @param {Object} options - 消息选项
   * @param {string} [options.id] - 消息ID，默认自动生成
   * @param {string} options.roomId - 房间ID
   * @param {string} options.senderId - 发送者ID
   * @param {string} options.senderNickname - 发送者昵称
   * @param {string} options.content - 消息内容
   * @param {string} [options.type='chat'] - 消息类型
   * @param {number} [options.timestamp] - 时间戳，默认当前时间
   */
  constructor(options) {
    this.id = options.id || IdGenerator.generateMessageId();
    this.roomId = options.roomId;
    this.senderId = options.senderId;
    this.senderNickname = options.senderNickname || '匿名用户';
    this.content = options.content;
    this.type = options.type || MessageType.CHAT;
    this.timestamp = options.timestamp || Date.now();
  }

  /**
   * 创建系统消息
   * 
   * @static
   * @param {string} roomId - 房间ID
   * @param {string} content - 消息内容
   * @returns {ChatMessage} 系统消息实例
   */
  static createSystemMessage(roomId, content) {
    return new ChatMessage({
      roomId,
      senderId: 'system',
      senderNickname: '系统',
      content,
      type: MessageType.SYSTEM
    });
  }

  /**
   * 转换为JSON格式
   * 用于序列化和网络传输
   * 
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      roomId: this.roomId,
      senderId: this.senderId,
      senderNickname: this.senderNickname,
      content: this.content,
      type: this.type,
      timestamp: this.timestamp
    };
  }
}

module.exports = { ChatMessage, MessageType };
