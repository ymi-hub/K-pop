import { SPOTIFY_CONFIG, BTS_ARTIST_ID } from '../config/spotify';
import { Track } from '../types';

const BASE_URL = 'https://api.spotify.com/v1';

export async function getAccessToken(code: string): Promise<string> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      client_id: SPOTIFY_CONFIG.clientId,
    }),
  });
  const data = await response.json();
  return data.access_token;
}

export async function getBTSAlbums(token: string) {
  const res = await fetch(
    `${BASE_URL}/artists/${BTS_ARTIST_ID}/albums?market=KR&include_groups=album,single&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
}

export async function getAlbumTracks(token: string, albumId: string): Promise<Track[]> {
  const res = await fetch(
    `${BASE_URL}/albums/${albumId}/tracks?market=KR`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  const albumRes = await fetch(`${BASE_URL}/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const albumData = await albumRes.json();

  return data.items.map((item: any) => ({
    id: item.id,
    name: item.name,
    artists: item.artists.map((a: any) => a.name),
    album: albumData.name,
    albumArt: albumData.images[0]?.url ?? '',
    durationMs: item.duration_ms,
    previewUrl: item.preview_url,
    spotifyUri: item.uri,
  }));
}

// BTS 전체 곡 로드 (앨범 전체 순회)
export async function getBTSAllTracks(token: string): Promise<Track[]> {
  try {
    const albumsRes = await fetch(
      `${BASE_URL}/artists/${BTS_ARTIST_ID}/albums?market=KR&include_groups=album,single&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const albumsData = await albumsRes.json();
    if (!albumsData.items) return [];

    const trackPromises = albumsData.items.slice(0, 20).map((album: any) =>
      getAlbumTracks(token, album.id)
    );
    const trackArrays = await Promise.all(trackPromises);
    const allTracks = trackArrays.flat();

    // 중복 제거 (같은 곡 이름)
    const seen = new Set<string>();
    return allTracks.filter((t) => {
      const key = t.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

export async function searchBTSSongs(token: string, query: string): Promise<Track[]> {
  const res = await fetch(
    `${BASE_URL}/search?q=${encodeURIComponent(query + ' BTS')}&type=track&market=KR&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.tracks.items.map((item: any) => ({
    id: item.id,
    name: item.name,
    artists: item.artists.map((a: any) => a.name),
    album: item.album.name,
    albumArt: item.album.images[0]?.url ?? '',
    durationMs: item.duration_ms,
    previewUrl: item.preview_url,
    spotifyUri: item.uri,
  }));
}
