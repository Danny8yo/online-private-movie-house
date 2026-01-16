/**
 * @file 聊天服务层
 * @description 实现聊天消息的核心业务逻辑，包括消息验证、频率限制、创建和存储
 *              采用单例模式，处理房间内的聊天互动
 * @module services/ChatService
 */

const { ChatMessage, MessageType } = require('../models/ChatMessage');
const RoomService = require('./RoomService');
const {
  RoomNotFoundException,
  RoomClosedException,
  ValidationException
} = require('../exceptions/BusinessException');

/**
 * 聊天服务配置
 * @constant
 */
const CHAT_CONFIG = {
  /** 消息最小长度 */
  MIN_LENGTH: 1,
  /** 消息最大长度 */
  MAX_LENGTH: 500,
  /** 消息发送最小间隔（毫秒） */
  RATE_LIMIT_MS: 500,
  /** 每个房间保存的最大消息数 */
  MAX_MESSAGES_PER_ROOM: 200
};

/**
 * 聊天服务类
 * 封装聊天消息的所有业务逻辑，负责消息验证、频率控制和消息管理
 * 
 * @class ChatService
 * @singleton
 */
class ChatService {
  /**
   * 单例实例
   * @private
   * @static
   * @type {ChatService|null}
   */
  static instance = null;

  /**
   * 创建聊天服务实例
   * @constructor
   * @private
   */
  constructor() {
    this.roomService = RoomService.getInstance();
    
    /**
     * 房间消息存储
     * Map<roomId, ChatMessage[]>
     * @private
     */
    this.roomMessages = new Map();
    
    /**
     * 用户发送消息时间记录（用于频率限制）
     * Map<`${roomId}:${senderId}`, number>
     * @private
     */
    this.lastSendTime = new Map();
  }

  /**
   * 获取单例实例
   * 
   * @static
   * @returns {ChatService} 服务实例
   */
  static getInstance() {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * 验证消息内容
   * 检查消息长度和格式是否合法
   * 
   * @param {string} content - 消息内容
   * @throws {ValidationException} 当消息不合法时抛出
   */
  validateMessage(content) {
    // 检查是否为空
    if (!content || typeof content !== 'string') {
      throw new ValidationException('消息内容不能为空');
    }

    // 去除首尾空格后检查
    const trimmedContent = content.trim();
    
    if (trimmedContent.length === 0) {
      throw new ValidationException('消息内容不能全是空格');
    }

    if (trimmedContent.length < CHAT_CONFIG.MIN_LENGTH) {
      throw new ValidationException(`消息长度不能少于${CHAT_CONFIG.MIN_LENGTH}个字符`);
    }

    if (trimmedContent.length > CHAT_CONFIG.MAX_LENGTH) {
      throw new ValidationException(`消息长度不能超过${CHAT_CONFIG.MAX_LENGTH}个字符`);
    }

    return trimmedContent;
  }

  /**
   * 检查发送频率限制
   * 防止用户发送消息过于频繁
   * 
   * @param {string} roomId - 房间ID
   * @param {string} senderId - 发送者ID
   * @throws {ValidationException} 当发送过于频繁时抛出
   */
  checkRateLimit(roomId, senderId) {
    const key = `${roomId}:${senderId}`;
    const lastTime = this.lastSendTime.get(key);
    const now = Date.now();

    if (lastTime && (now - lastTime) < CHAT_CONFIG.RATE_LIMIT_MS) {
      const waitTime = Math.ceil((CHAT_CONFIG.RATE_LIMIT_MS - (now - lastTime)) / 1000 * 10) / 10;
      throw new ValidationException(`发送消息过于频繁，请等待${waitTime}秒后再试`);
    }

    // 更新最后发送时间
    this.lastSendTime.set(key, now);
  }

  /**
   * 验证房间状态
   * 
   * @private
   * @param {string} roomId - 房间ID
   * @returns {Object} 房间实例
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   */
  validateRoom(roomId) {
    const RoomRepository = require('../repositories/RoomRepository');
    const room = RoomRepository.getInstance().findById(roomId);
    
    if (!room) {
      throw new RoomNotFoundException(roomId);
    }
    
    if (room.status === 'closed') {
      throw new RoomClosedException(roomId);
    }
    
    return room;
  }

  /**
   * 创建并存储聊天消息
   * 
   * @param {string} roomId - 房间ID
   * @param {string} senderId - 发送者ID
   * @param {string} senderNickname - 发送者昵称
   * @param {string} content - 消息内容
   * @returns {ChatMessage} 创建的消息实例
   * @throws {RoomNotFoundException} 当房间不存在时抛出
   * @throws {RoomClosedException} 当房间已关闭时抛出
   * @throws {ValidationException} 当消息验证失败时抛出
   */
  createMessage(roomId, senderId, senderNickname, content) {
    // 验证房间
    this.validateRoom(roomId);

    // 验证消息内容
    const validatedContent = this.validateMessage(content);

    // 检查频率限制
    this.checkRateLimit(roomId, senderId);

    // 创建消息
    const message = new ChatMessage({
      roomId,
      senderId,
      senderNickname,
      content: validatedContent,
      type: MessageType.CHAT
    });

    // 存储消息
    this.saveMessage(message);

    return message;
  }

  /**
   * 创建系统消息
   * 
   * @param {string} roomId - 房间ID
   * @param {string} content - 消息内容
   * @returns {ChatMessage} 创建的系统消息实例
   */
  createSystemMessage(roomId, content) {
    const message = ChatMessage.createSystemMessage(roomId, content);
    this.saveMessage(message);
    return message;
  }

  /**
   * 保存消息到内存存储
   * 
   * @private
   * @param {ChatMessage} message - 消息实例
   */
  saveMessage(message) {
    const { roomId } = message;
    
    if (!this.roomMessages.has(roomId)) {
      this.roomMessages.set(roomId, []);
    }

    const messages = this.roomMessages.get(roomId);
    messages.push(message);

    // 如果超过最大数量，移除最旧的消息
    while (messages.length > CHAT_CONFIG.MAX_MESSAGES_PER_ROOM) {
      messages.shift();
    }
  }

  /**
   * 获取房间的历史消息
   * 
   * @param {string} roomId - 房间ID
   * @param {number} [limit=50] - 返回消息数量限制
   * @returns {Array<Object>} 消息列表（JSON格式）
   */
  getRoomMessages(roomId, limit = 50) {
    const messages = this.roomMessages.get(roomId) || [];
    // 返回最新的 limit 条消息
    return messages.slice(-limit).map(msg => msg.toJSON());
  }

  /**
   * 清理房间消息
   * 在房间解散时调用
   * 
   * @param {string} roomId - 房间ID
   */
  clearRoomMessages(roomId) {
    this.roomMessages.delete(roomId);
    
    // 清理该房间相关的频率限制记录
    for (const key of this.lastSendTime.keys()) {
      if (key.startsWith(`${roomId}:`)) {
        this.lastSendTime.delete(key);
      }
    }
  }
}

module.exports = ChatService;
