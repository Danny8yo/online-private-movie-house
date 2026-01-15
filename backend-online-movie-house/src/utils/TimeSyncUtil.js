/**
 * @file 时间同步工具类
 * @description 提供服务端时间戳生成与时间差计算，用于视频同步的基准时间戳策略
 * @module utils/TimeSyncUtil
 */

/**
 * 时间同步工具类
 * 提供时间相关的计算和同步功能，用于视频播放进度的时间同步
 * 
 * @class TimeSyncUtil
 */
class TimeSyncUtil {
  /**
   * 获取当前服务端时间戳（毫秒）
   * 
   * @static
   * @returns {number} 当前时间戳（毫秒）
   */
  static nowMs() {
    return Date.now();
  }

  /**
   * 计算预期播放进度
   * 根据基准进度、基准时间、当前时间和播放倍速，计算当前应该的播放进度
   * 用于处理播放状态下的进度同步
   * 
   * @static
   * @param {number} baseProgress - 基准进度（秒）
   * @param {number} baseTimeMs - 基准时间戳（毫秒）
   * @param {number} nowMs - 当前时间戳（毫秒）
   * @param {number} playbackRate - 播放倍速
   * @returns {number} 预期播放进度（秒）
   * 
   * @example
   * // 假设在100秒时暂停，倍速1.0，现在过了5秒
   * const progress = TimeSyncUtil.calcExpectedProgress(100, 1000000, 1005000, 1.0);
   * // 返回 100（因为暂停状态，进度不变）
   * 
   * @example
   * // 假设在100秒时播放，倍速1.0，现在过了5秒
   * const progress = TimeSyncUtil.calcExpectedProgress(100, 1000000, 1005000, 1.0);
   * // 返回 105（100 + 5秒 * 1.0倍速）
   */
  static calcExpectedProgress(baseProgress, baseTimeMs, nowMs, playbackRate) {
    const elapsedSeconds = (nowMs - baseTimeMs) / 1000;
    return baseProgress + (elapsedSeconds * playbackRate);
  }

  /**
   * 计算时间差（毫秒）
   * 
   * @static
   * @param {number} time1 - 时间1（毫秒）
   * @param {number} time2 - 时间2（毫秒）
   * @returns {number} 时间差（毫秒），time1 - time2
   */
  static diffMs(time1, time2) {
    return time1 - time2;
  }

  /**
   * 计算时间差（秒）
   * 
   * @static
   * @param {number} time1 - 时间1（毫秒）
   * @param {number} time2 - 时间2（毫秒）
   * @returns {number} 时间差（秒），time1 - time2
   */
  static diffSeconds(time1, time2) {
    return (time1 - time2) / 1000;
  }
}

module.exports = TimeSyncUtil;
