import { Track } from '../types';

const ITUNES_API = 'https://itunes.apple.com/search';

// 동일 곡명+아티스트 중복 제거 (컴필레이션/리패키지 중복 방지)
function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    const key = `${t.name.toLowerCase()}||${t.artists[0]?.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapItem(item: any): Track {
  return {
    id: String(item.trackId),
    name: item.trackName,
    artists: [item.artistName],
    album: item.collectionName,
    albumArt: item.artworkUrl100?.replace('100x100', '600x600') ?? '',
    durationMs: item.trackTimeMillis ?? 30000,
    previewUrl: item.previewUrl ?? null,
    spotifyUri: '',
  };
}

export async function getBTSTracks(): Promise<Track[]> {
  try {
    const res = await fetch(
      `${ITUNES_API}?term=BTS&entity=song&country=KR&limit=200&lang=ko_KR`
    );
    const data = await res.json();
    if (!data.results) return [];
    return dedupe(data.results
      .filter((item: any) =>
        item.artistName?.toLowerCase().includes('bts') ||
        item.artistName?.includes('방탄소년단')
      )
      .map(mapItem));
  } catch (e) {
    console.error('iTunes API error:', e);
    return [];
  }
}

export async function searchTracks(query: string): Promise<Track[]> {
  try {
    const res = await fetch(
      `${ITUNES_API}?term=${encodeURIComponent(query)}&entity=song&country=KR&limit=200&lang=ko_KR`
    );
    const data = await res.json();
    if (!data.results) return [];
    const q = query.toLowerCase();
    return dedupe(data.results
      .filter((item: any) =>
        item.trackId && (
          item.artistName?.toLowerCase().includes(q) ||
          item.trackName?.toLowerCase().includes(q) ||
          item.collectionName?.toLowerCase().includes(q)
        )
      )
      .map(mapItem));
  } catch (e) {
    console.error('iTunes API error:', e);
    return [];
  }
}
