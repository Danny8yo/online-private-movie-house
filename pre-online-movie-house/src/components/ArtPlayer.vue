<template>
  <div ref="artRef" class="artplayer-app"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import Artplayer from 'artplayer';
import type ArtplayerType from 'artplayer/types/artplayer';

const props = defineProps<{
  src: string;
  airplay?: boolean;
  aspectRatio?: boolean;
  autoSize?: boolean;
  autoOrientation?: boolean;
  autoPlayback?: boolean;
  fastForward?: boolean;
  flip?: boolean;
  fullscreenWeb?: boolean;
  lock?: boolean;
  loop?: boolean;
  isLive?: boolean;
  muted?: boolean;
  miniProgressBar?: boolean;
  pip?: boolean;
  screenshot?: boolean;
  subtitleOffset?: boolean;
  // 同步控制相关
  syncMode?: boolean; // 是否启用同步模式（同步模式下，本地操作不会触发同步事件）
}>();

const emit = defineEmits<{
  (e: 'ready', instance: ArtplayerType): void;
  (e: 'play'): void;
  (e: 'pause'): void;
  (e: 'seek', progress: number): void;
  (e: 'ratechange', rate: number): void;
  (e: 'sourcechange', url: string | null): void;
}>();

const artRef = ref<HTMLDivElement | null>(null);
let instance: ArtplayerType | null = null;
let isSyncControlled = ref(false); // 标记是否正在执行同步操作，避免循环触发

// 暴露给父组件的方法
const play = () => {
  if (instance && !isSyncControlled.value) {
    isSyncControlled.value = true;
    instance.play();
    setTimeout(() => {
      isSyncControlled.value = false;
    }, 100);
  }
};

const pause = () => {
  if (instance && !isSyncControlled.value) {
    isSyncControlled.value = true;
    instance.pause();
    setTimeout(() => {
      isSyncControlled.value = false;
    }, 100);
  }
};

const seek = (progress: number) => {
  if (instance && !isSyncControlled.value) {
    isSyncControlled.value = true;
    instance.seek = progress;
    // 增加延迟时间，确保同步操作完成后再允许触发新的事件
    setTimeout(() => {
      isSyncControlled.value = false;
    }, 500);
  }
};

const setPlaybackRate = (rate: number) => {
  if (instance && !isSyncControlled.value) {
    isSyncControlled.value = true;
    instance.playbackRate = rate;
    setTimeout(() => {
      isSyncControlled.value = false;
    }, 100);
  }
};

const switchUrl = (url: string | null) => {
  if (instance) {
    if (url) {
      instance.switchUrl(url);
    } else {
      // 清空视频源
      instance.url = '';
      instance.load();
    }
  }
};

const getCurrentTime = (): number => {
  return instance?.currentTime || 0;
};

const getDuration = (): number => {
  return instance?.duration || 0;
};

const getPlaybackRate = (): number => {
  return instance?.playbackRate || 1;
};

const isPlaying = (): boolean => {
  return instance?.playing || false;
};

// 暴露方法给父组件
defineExpose({
  play,
  pause,
  seek,
  setPlaybackRate,
  switchUrl,
  getCurrentTime,
  getDuration,
  getPlaybackRate,
  isPlaying,
  instance: () => instance
});

onMounted(() => {
  if (artRef.value) {
    instance = new Artplayer({
      container: artRef.value,
      url: props.src || '',
      theme: '#667eea',
      
      // Features
      airplay: props.airplay,
      aspectRatio: props.aspectRatio,
      autoSize: props.autoSize,
      autoOrientation: props.autoOrientation,
      autoPlayback: props.autoPlayback,
      fastForward: props.fastForward,
      flip: props.flip,
      fullscreen: true,
      fullscreenWeb: props.fullscreenWeb,
      lock: props.lock,
      loop: props.loop,
      isLive: props.isLive,
      muted: props.muted,
      miniProgressBar: props.miniProgressBar,
      pip: props.pip,
      screenshot: props.screenshot,
      subtitleOffset: props.subtitleOffset,
      
      // Defaults
      setting: true,
      playbackRate: true,
      playsInline: true,
    }) as ArtplayerType;

    // 监听播放器事件
    instance.on('play', () => {
      if (!isSyncControlled.value && !props.syncMode) {
        emit('play');
      }
    });

    instance.on('pause', () => {
      if (!isSyncControlled.value && !props.syncMode) {
        emit('pause');
      }
    });

    instance.on('video:timeupdate', () => {
      // 时间更新事件，不用于同步（避免频繁触发）
    });

    instance.on('video:ratechange', () => {
      if (!isSyncControlled.value && !props.syncMode && instance) {
        emit('ratechange', instance.playbackRate);
      }
    });

    instance.on('ready', () => {
      emit('ready', instance!);
      
      // 监听视频元素的跳转事件
      // 只在用户主动拖动进度条时触发同步，避免正常播放时频繁触发
      if (instance.video) {
        let wasSeeking = false; // 标记是否正在跳转
        let lastSeekProgress = 0; // 记录上次同步的进度
        let lastSeekTime = 0; // 记录上次触发同步的时间
        
        // 监听 seeking 事件（跳转开始）- 说明用户正在拖动
        instance.video.addEventListener('seeking', () => {
          wasSeeking = true;
        });
        
        // 监听 seeked 事件（跳转完成）
        const handleSeeked = () => {
          if (!instance) return;
          
          const currentProgress = instance.currentTime;
          const now = Date.now();
          const progressDiff = Math.abs(currentProgress - lastSeekProgress);
          const timeDiff = now - lastSeekTime;
          
          // 只有在以下条件都满足时才触发同步：
          // 1. 不是同步控制触发的跳转
          // 2. 不是同步模式（房主模式）
          // 3. 之前有 seeking 事件（说明是用户拖动，不是正常播放）
          // 4. 进度变化大于 0.5 秒（避免微小变化触发）
          // 5. 距离上次触发超过 300ms（防抖）
          if (
            !isSyncControlled.value && 
            !props.syncMode && 
            wasSeeking &&
            progressDiff > 0.5 &&
            timeDiff > 300
          ) {
            lastSeekProgress = currentProgress;
            lastSeekTime = now;
            emit('seek', currentProgress);
          }
          
          // 重置标记
          wasSeeking = false;
        };
        
        instance.video.addEventListener('seeked', handleSeeked);
      }
    });

    // 通知父组件播放器已就绪
    emit('ready', instance);
  }
});

onBeforeUnmount(() => {
  if (instance && instance.destroy) {
    instance.destroy(false);
  }
});

// Watch for src changes to switch video
watch(() => props.src, (newVal) => {
  if (instance && newVal) {
    if (!isSyncControlled.value) {
      switchUrl(newVal);
    }
  }
});
</script>

<style scoped>
.artplayer-app {
  width: 100%;
  height: 100%;
}
</style>
