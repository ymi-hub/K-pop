// YouTube IFrame API 래퍼 (웹 전용)
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let player: any = null;
let apiReadyPromise: Promise<void> | null = null;

export const YT_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

export function initYouTubeAPI(): Promise<void> {
  if (apiReadyPromise) return apiReadyPromise;
  apiReadyPromise = new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiReadyPromise;
}

export function createYTPlayer(
  onStateChange: (state: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    const containerId = '__yt_hidden_player__';
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      Object.assign(el.style, {
        position: 'fixed', bottom: '0', right: '0',
        width: '1px', height: '1px', opacity: '0.01',
        pointerEvents: 'none', zIndex: '-1',
      });
      document.body.appendChild(el);
    }

    // iframe이 생성되는 즉시 allow="autoplay" 주입 (Chrome autoplay 정책 우회)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if ((node as Element).tagName === 'IFRAME') {
            (node as HTMLIFrameElement).setAttribute(
              'allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture'
            );
            observer.disconnect();
          }
        }
      }
    });
    observer.observe(el, { childList: true, subtree: true });

    player = new window.YT.Player(containerId, {
      height: '1', width: '1',
      playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, fs: 0 },
      events: {
        onReady: () => {
          const saved = parseInt(localStorage.getItem('kpop_volume') ?? '100', 10);
          const vol = isNaN(saved) ? 100 : Math.max(0, Math.min(100, saved));
          player.unMute();
          player.setVolume(vol);
          resolve();
        },
        onStateChange: (e: any) => onStateChange(e.data),
      },
    });
  });
}

export function ytLoadVideo(videoId: string): void {
  if (!player) return;
  player.loadVideoById(videoId);
  // loadVideoById 후 unmute 보장 (mute:1로 생성된 경우 대비)
  player.unMute();
}

export function ytPlay(): void {
  if (!player) return;
  player.unMute();
  player.playVideo();
}

export function ytSetVolume(vol: number): void {
  const v = Math.max(0, Math.min(100, vol));
  player?.setVolume(v);
  try { localStorage.setItem('kpop_volume', String(v)); } catch {}
}

export function ytGetVolume(): number {
  return player?.getVolume?.() ?? 100;
}
export function ytPause(): void { player?.pauseVideo(); }
export function ytSeek(ms: number): void { player?.seekTo(ms / 1000, true); }
export function ytGetCurrentTime(): number {
  return Math.round((player?.getCurrentTime?.() ?? 0) * 1000);
}
export function ytGetDuration(): number {
  return Math.round((player?.getDuration?.() ?? 0) * 1000);
}
