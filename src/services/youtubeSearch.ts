const YT_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

// ── 7일 TTL localStorage 캐시 ──────────────────────────────
const CACHE_KEY = 'kpop_yt_cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function getCached(key: string): YTResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[key];
    if (!entry || Date.now() - entry.ts > CACHE_TTL) return null;
    return { videoId: entry.videoId, thumbnail: entry.thumbnail };
  } catch { return null; }
}

function setCached(key: string, result: YTResult): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[key] = { ...result, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export type YTResult = {
  videoId: string;
  thumbnail: string;
};

export type YTSearchItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
};

// 자유 검색어로 YouTube 음악 영상 여러 개 반환
export async function searchYouTubeMulti(query: string, maxResults = 10): Promise<YTSearchItem[]> {
  if (!YT_API_KEY || !query.trim()) return [];
  try {
    const params = new URLSearchParams({
      part: 'id,snippet',
      type: 'video',
      q: query,
      key: YT_API_KEY,
      maxResults: String(maxResults),
      videoCategoryId: '10',
      videoEmbeddable: 'true',
    });
    const res = await fetch(`${SEARCH_URL}?${params}`);
    const data = await res.json();
    if (data.error) { console.warn('YouTube search error:', data.error.message); return []; }
    return ((data.items ?? []) as any[])
      .map(item => ({
        videoId: item.id?.videoId ?? '',
        title: item.snippet?.title ?? '',
        channelTitle: item.snippet?.channelTitle ?? '',
        thumbnail:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
      }))
      .filter(i => i.videoId);
  } catch {
    return [];
  }
}

// Invidious 공개 인스턴스 목록 (YouTube quota 초과 시 fallback)
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://iv.melmac.space',
];

async function searchInvidious(query: string): Promise<YTResult | null> {
  for (const host of INVIDIOUS_INSTANCES) {
    try {
      const params = new URLSearchParams({
        q: query, type: 'video',
        fields: 'videoId,title,author,videoThumbnails',
      });
      const res = await fetch(`${host}/api/v1/search?${params}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const items: any[] = await res.json();
      const videoId = items?.[0]?.videoId;
      if (videoId) {
        const thumb = items[0]?.videoThumbnails?.find((t: any) => t.quality === 'high')?.url
          ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        return { videoId, thumbnail: thumb };
      }
    } catch { /* try next instance */ }
  }
  return null;
}

// 곡명 + 아티스트로 YouTube 임베딩 가능한 영상 검색
// official audio / topic 채널 우선 → 가사 싱크 정확
// quota 초과 시 Invidious fallback, 결과 7일 캐시
export async function searchYouTube(
  trackName: string,
  artist: string
): Promise<YTResult | null> {
  // 캐시 확인 (7일 TTL)
  const cacheKey = `${trackName}::${artist}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const queries = [
    `${trackName} ${artist} topic`,
    `${trackName} ${artist} official audio`,
    `${trackName} ${artist} audio`,
  ];

  // 1. YouTube Data API (캐시 포함)
  if (YT_API_KEY) {
    for (const query of queries) {
      try {
        const params = new URLSearchParams({
          part: 'id,snippet', type: 'video',
          q: query, key: YT_API_KEY,
          maxResults: '3', videoCategoryId: '10', videoEmbeddable: 'true',
        });
        const res = await fetch(`${SEARCH_URL}?${params}`);
        const data = await res.json();
        if (data.error) {
          // quota 초과 → Invidious fallback으로 전환
          console.warn('YouTube API quota/error, switching to Invidious:', data.error.message);
          break;
        }
        const item = data.items?.[0];
        const videoId = item?.id?.videoId;
        if (videoId) {
          const thumb =
            item?.snippet?.thumbnails?.high?.url ??
            item?.snippet?.thumbnails?.medium?.url ??
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          const result = { videoId, thumbnail: thumb };
          setCached(cacheKey, result);
          return result;
        }
      } catch { /* network error → fallback */ }
    }
  }

  // 2. Invidious fallback (YouTube API 실패 시)
  for (const query of queries) {
    const result = await searchInvidious(query);
    if (result) {
      setCached(cacheKey, result);
      return result;
    }
  }

  return null;
}
