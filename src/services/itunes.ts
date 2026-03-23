import { Track } from '../types';

const ITUNES_API = 'https://itunes.apple.com/search';

export async function getBTSTracks(): Promise<Track[]> {
  try {
    // BTS 곡 검색 (한국 스토어, 최대 200곡)
    const res = await fetch(
      `${ITUNES_API}?term=BTS&entity=song&country=KR&limit=200&lang=ko_KR`
    );
    const data = await res.json();

    if (!data.results) return [];

    // BTS 아티스트 곡만 필터링
    const btsTracks = data.results.filter((item: any) =>
      item.artistName?.toLowerCase().includes('bts') ||
      item.artistName?.includes('방탄소년단')
    );

    return btsTracks.map((item: any) => ({
      id: String(item.trackId),
      name: item.trackName,
      artists: [item.artistName],
      album: item.collectionName,
      albumArt: item.artworkUrl100?.replace('100x100', '600x600') ?? '',
      durationMs: item.trackTimeMillis ?? 30000,
      previewUrl: item.previewUrl ?? null,
      spotifyUri: '',
    }));
  } catch (e) {
    console.error('iTunes API error:', e);
    return [];
  }
}
