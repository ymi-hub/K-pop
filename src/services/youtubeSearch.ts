const YT_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

// 곡명 + 아티스트로 YouTube 비디오 ID 검색
// "official audio" 우선 → 가사 타임스탬프와 싱크가 잘 맞는 오디오 전용 버전 선택
export async function searchYouTube(trackName: string, artist: string): Promise<string | null> {
  if (!YT_API_KEY) {
    console.warn('YouTube API key not configured');
    return null;
  }
  // 1순위: official audio (MV보다 전주가 짧아 가사 싱크 정확)
  // 2순위: topic 채널 (YouTube Music 자동 업로드, 원본과 동일)
  // topic 채널 = YouTube Music 자동 업로드 (Apple Music·iTunes와 동일한 마스터)
  // official audio보다 가사 싱크 정확
  const queries = [
    `${trackName} ${artist} topic`,
    `${trackName} ${artist} official audio`,
    `${trackName} ${artist} audio`,
  ];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        part: 'id',
        type: 'video',
        q: query,
        key: YT_API_KEY,
        maxResults: '1',
        videoCategoryId: '10',
      });
      const res = await fetch(`${SEARCH_URL}?${params}`);
      const data = await res.json();
      if (data.error) {
        console.error('YouTube API error:', data.error.message);
        return null;
      }
      const videoId = data.items?.[0]?.id?.videoId;
      if (videoId) return videoId;
    } catch (e) {
      console.error('YouTube search failed:', e);
    }
  }
  return null;
}
