import { Track } from '../types';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

const KEY = 'kpop_playlists';

// 트랙 내부 중복 제거 (id 기준)
function dedupTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

export function getPlaylists(): Playlist[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function savePlaylist(pl: Playlist): void {
  const deduped = { ...pl, tracks: dedupTracks(pl.tracks) };
  // id 중복 + 이름 중복 모두 제거 → 같은 이름은 1개만 유지
  const list = getPlaylists().filter(
    (p) => p.id !== deduped.id && p.name.toLowerCase() !== deduped.name.toLowerCase()
  );
  list.unshift(deduped);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
}

export function deletePlaylist(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getPlaylists().filter((p) => p.id !== id)));
}

// 중복 플레이리스트 정리 (앱 시작 시 호출)
export function cleanupPlaylists(): void {
  const list = getPlaylists();
  const seen = new Set<string>();
  const cleaned = list.filter((p) => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (cleaned.length !== list.length) {
    localStorage.setItem(KEY, JSON.stringify(cleaned));
  }
}
