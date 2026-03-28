// HTML <audio> 기반 재생기 — YouTube IFrame 대신 사용
// iTunes previewUrl(30초 MP4) 을 즉시 재생, autoplay 정책 이슈 없음

let player: HTMLAudioElement | null = null;
let stateCallback: ((state: 'play' | 'pause' | 'ended' | 'timeupdate' | 'durationchange' | 'error') => void) | null = null;

export function initAudioPlayer(
  cb: (state: 'play' | 'pause' | 'ended' | 'timeupdate' | 'durationchange' | 'error') => void
): void {
  if (typeof document === 'undefined') return;
  if (player) { stateCallback = cb; return; }

  stateCallback = cb;
  player = document.createElement('audio');
  player.preload = 'metadata';

  const emit = (s: Parameters<typeof cb>[0]) => cb(s);
  player.addEventListener('play', () => emit('play'));
  player.addEventListener('pause', () => emit('pause'));
  player.addEventListener('ended', () => emit('ended'));
  player.addEventListener('timeupdate', () => emit('timeupdate'));
  player.addEventListener('durationchange', () => emit('durationchange'));
  player.addEventListener('error', () => emit('error'));

  // DOM에 추가하지 않아도 재생 가능, 하지만 일부 브라우저 호환성을 위해 추가
  player.style.display = 'none';
  document.body.appendChild(player);
}

export function audioLoadAndPlay(url: string): void {
  if (!player) return;
  const saved = parseInt(localStorage.getItem('kpop_volume') ?? '100', 10);
  player.volume = isNaN(saved) ? 1 : Math.max(0, Math.min(100, saved)) / 100;
  player.src = url;
  player.load();
  const p = player.play();
  if (p) p.catch((e) => console.warn('[audio] play failed:', e));
}

export function audioPlay(): void {
  if (!player) return;
  const p = player.play();
  if (p) p.catch((e) => console.warn('[audio] play failed:', e));
}

export function audioPause(): void {
  player?.pause();
}

export function audioSetVolume(vol: number): void {
  if (player) player.volume = Math.max(0, Math.min(100, vol)) / 100;
}

export function audioSetMuted(muted: boolean): void {
  if (player) player.muted = muted;
}

export function audioSetLoop(loop: boolean): void {
  if (player) player.loop = loop;
}

export function audioSeek(ms: number): void {
  if (!player) return;
  player.currentTime = ms / 1000;
}

export function audioGetCurrentTime(): number {
  return Math.round((player?.currentTime ?? 0) * 1000);
}

export function audioGetDuration(): number {
  const d = player?.duration;
  if (!d || !isFinite(d)) return 0;
  return Math.round(d * 1000);
}
