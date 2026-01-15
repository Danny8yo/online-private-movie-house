<template>
  <div ref="artRef" class="artplayer-app"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import Artplayer from 'artplayer';

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
}>();

const artRef = ref<HTMLDivElement | null>(null);
let instance: Artplayer | null = null;

onMounted(() => {
  if (artRef.value) {
    instance = new Artplayer({
      container: artRef.value,
      url: props.src,
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
    });
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
    instance.switchUrl(newVal);
  }
});
</script>

<style scoped>
.artplayer-app {
  width: 100%;
  height: 100%;
}
</style>
