/**
 * @file 模型索引文件
 * @description 统一导出所有实体模型，便于其他模块引用
 * @module models
 */

const { Room, RoomStatus } = require('./Room');
const { VideoState, PlayStatus } = require('./VideoState');
const { Participant, ParticipantRole, ParticipantStatus } = require('./Participant');

module.exports = {
  // 房间相关
  Room,
  RoomStatus,
  
  // 视频状态相关
  VideoState,
  PlayStatus,
  
  // 参与者相关
  Participant,
  ParticipantRole,
  ParticipantStatus
};
