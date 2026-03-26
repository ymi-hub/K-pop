const YT_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

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

// 곡명 + 아티스트로 YouTube 임베딩 가능한 영상 검색
// official audio / topic 채널 우선 → 가사 싱크 정확
export async function searchYouTube(
  trackName: string,
  artist: string
): Promise<YTResult | null> {
  if (!YT_API_KEY) {
    console.warn('YouTube API key not configured');
    return null;
  }

  const queries = [
    `${trackName} ${artist} topic`,
    `${trackName} ${artist} official audio`,
    `${trackName} ${artist} audio`,
  ];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        part: 'id,snippet',
        type: 'video',
        q: query,
        key: YT_API_KEY,
        maxResults: '3',
        videoCategoryId: '10',
        videoEmbeddable: 'true',
      });
      const res = await fetch(`${SEARCH_URL}?${params}`);
      const data = await res.json();
      if (data.error) {
        console.error('YouTube API error:', data.error.message);
        return null;
      }
      const item = data.items?.[0];
      const videoId = item?.id?.videoId;
      if (videoId) {
        const thumb =
          item?.snippet?.thumbnails?.high?.url ??
          item?.snippet?.thumbnails?.medium?.url ??
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        return { videoId, thumbnail: thumb };
      }
    } catch (e) {
      console.error('YouTube search failed:', e);
    }
  }
  return null;
}
