/**
 * @file 视频状态实体类
 * @description 定义视频播放状态的数据结构，管理播放进度、状态等信息
 * @module models/VideoState
 */

/**
 * 播放状态枚举
 * @readonly
 * @enum {string}
 */
const PlayStatus = {
  /** 播放中 */
  PLAYING: 'playing',
  /** 暂停 */
  PAUSED: 'paused',
  /** 已停止 */
  STOPPED: 'stopped'
};

/**
 * 视频状态类
 * 管理房间内视频的播放状态，是实现多端同步的核心数据结构
 * 
 * @class VideoState
 * @property {string|null} source - 视频源URL
 * @property {string} status - 播放状态
 * @property {number} progress - 播放进度(秒)
 * @property {number} playbackRate - 播放倍速
 * @property {string|null} subtitle - 字幕设置
 * @property {number} lastUpdateTime - 最后更新的时间戳
 */
class VideoState {
  /**
   * 创建视频状态实例
   * 
   * @constructor
   * @param {Object} [options={}] - 初始化选项
   * @param {string|null} [options.source=null] - 视频源URL
   * @param {string} [options.status='paused'] - 播放状态
   * @param {number} [options.progress=0] - 播放进度
   * @param {number} [options.playbackRate=1.0] - 播放倍速
   * @param {string|null} [options.subtitle=null] - 字幕设置
   */
  constructor(options = {}) {
    this.source = options.source || null;
    this.status = options.status || PlayStatus.PAUSED;
    this.progress = options.progress || 0;
    this.playbackRate = options.playbackRate || 1.0;
    this.subtitle = options.subtitle || null;
    this.lastUpdateTime = Date.now();
  }

  /**
   * 更新视频源
   * 
   * @param {string} source - 新的视频源URL
   */
  setSource(source) {
    this.source = source;
    this.progress = 0;
    this.status = PlayStatus.PAUSED;
    this.lastUpdateTime = Date.now();
  }

  /**
   * 设置播放状态
   * 
   * @param {string} status - 新的播放状态
   */
  setStatus(status) {
    if (Object.values(PlayStatus).includes(status)) {
      this.status = status;
      this.lastUpdateTime = Date.now();
    }
  }

  /**
   * 更新播放进度
   * 
   * @param {number} progress - 新的播放进度(秒)
   */
  setProgress(progress) {
    this.progress = Math.max(0, progress);
    this.lastUpdateTime = Date.now();
  }

  /**
   * 设置播放倍速
   * 
   * @param {number} rate - 新的播放倍速
   */
  setPlaybackRate(rate) {
    if (rate > 0 && rate <= 4) {
      this.playbackRate = rate;
      this.lastUpdateTime = Date.now();
    }
  }

  /**
   * 获取当前计算后的播放进度
   * 根据最后更新时间和播放状态计算当前进度
   * 
   * @returns {number} 当前播放进度(秒)
   */
  getCurrentProgress() {
    if (this.status === PlayStatus.PLAYING) {
      const elapsedTime = (Date.now() - this.lastUpdateTime) / 1000;
      return this.progress + (elapsedTime * this.playbackRate);
    }
    return this.progress;
  }

  /**
   * 转换为JSON格式
   * 
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      source: this.source,
      status: this.status,
      progress: this.progress,
      playbackRate: this.playbackRate,
      subtitle: this.subtitle,
      lastUpdateTime: this.lastUpdateTime,
      currentProgress: this.getCurrentProgress()
    };
  }
}

// 导出类和枚举
module.exports = { VideoState, PlayStatus };
