// iTunes Search API로 앨범 커버 이미지 URL 조회
const artCache = new Map<string, string>();

export async function fetchAlbumArt(albumName: string, artistName = 'BTS'): Promise<string | null> {
  const key = `${artistName}:${albumName}`;
  if (artCache.has(key)) return artCache.get(key)!;
  try {
    const q = encodeURIComponent(`${artistName} ${albumName}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&media=music&entity=album&limit=3&country=us`
    );
    const data = await res.json();
    // 콜론으로 나눈 모든 파트가 포함된 앨범 우선 매칭
    // 예: "Map of the Soul: Persona" → ["map of the soul", "persona"] 모두 포함된 항목
    const parts = albumName.toLowerCase().split(':').map(p => p.trim()).filter(Boolean);
    const found = data.results?.find((r: any) => {
      const col = r.collectionName?.toLowerCase() ?? '';
      return parts.every(p => col.includes(p));
    }) ?? data.results?.find((r: any) =>
      r.collectionName?.toLowerCase().includes(parts[0])
    ) ?? data.results?.[0];
    if (found?.artworkUrl100) {
      const url = (found.artworkUrl100 as string).replace('100x100bb', '600x600bb');
      artCache.set(key, url);
      return url;
    }
  } catch {}
  return null;
}

export async function fetchAllAlbumArt(
  albums: { album: string; artist: string }[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  // deduplicate
  const unique = [...new Map(albums.map(a => [a.album, a])).values()];
  await Promise.all(
    unique.map(async ({ album, artist }) => {
      const url = await fetchAlbumArt(album, artist);
      if (url) result[album] = url;
    })
  );
  return result;
}
