// YouTube 전곡 오디오 스트림 URL 획득 (Invidious 프록시 경유)
// IFrame 방식 대신 직접 오디오 URL → HTML <audio> 요소로 재생
// → autoplay 제한 없음, play/pause 제어 완벽, progress 정확

const INSTANCES = [
  'https://yewtu.be',
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://invidious.nerdvpn.de',
  'https://yt.artemislena.eu',
  'https://inv.riverside.rocks',
  'https://invidious.kavin.rocks',
];

// m4a 128kbps(140) → webm opus 순으로 시도
const AUDIO_ITAGS = [140, 251, 250, 249];

async function fetchFromInstance(instance: string, videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const formats: any[] = data.adaptiveFormats ?? [];
    const audioFormats = formats.filter((f) => f.type?.startsWith('audio/'));
    if (audioFormats.length === 0) return null;

    for (const itag of AUDIO_ITAGS) {
      const found = audioFormats.find((f) => f.itag === itag);
      if (found) {
        // local=true → Invidious가 직접 프록시 → CORS 허용 URL
        return `${instance}/latest_version?id=${videoId}&itag=${itag}&local=true`;
      }
    }

    const fallback = audioFormats[0];
    if (fallback?.itag) {
      return `${instance}/latest_version?id=${videoId}&itag=${fallback.itag}&local=true`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getYouTubeAudioUrl(videoId: string): Promise<string | null> {
  // 모든 인스턴스에 동시 요청 → 가장 빠른 성공 응답 사용
  return new Promise((resolve) => {
    let settled = false;
    let pending = INSTANCES.length;

    INSTANCES.forEach((instance) => {
      fetchFromInstance(instance, videoId).then((url) => {
        pending--;
        if (!settled && url) {
          settled = true;
          console.log('[YT-Audio] 스트림 URL 획득:', instance);
          resolve(url);
        } else if (pending === 0 && !settled) {
          console.warn('[YT-Audio] 모든 인스턴스 실패, videoId:', videoId);
          resolve(null);
        }
      });
    });
  });
}
