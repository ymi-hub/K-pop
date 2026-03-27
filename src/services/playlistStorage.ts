import { Track } from '../types';

const KEY = 'kpop_my_playlist';
const LYRICS_KEY = 'kpop_cached_lyrics';

// 로그인 시 App.tsx에서 주입 — 저장할 때마다 Firestore에도 반영
let _firestoreSaver: ((items: PlaylistItem[]) => void) | null = null;
export function setFirestorePlaylistSaver(fn: ((items: PlaylistItem[]) => void) | null) {
  _firestoreSaver = fn;
}

export interface PlaylistItem {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt: string;
  durationMs: number;
  previewUrl: null;
  spotifyUri: string;
  videoId?: string; // YouTube video ID (add 시점에 캐싱)
}

export function loadPlaylist(): PlaylistItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePlaylist(items: PlaylistItem[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  _firestoreSaver?.(items);
}

export function addToPlaylist(track: Track, videoId?: string): boolean {
  const list = loadPlaylist();
  if (list.find(t => t.id === track.id)) return false;
  const item: PlaylistItem = {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    albumArt: track.albumArt,
    durationMs: track.durationMs,
    previewUrl: null,
    spotifyUri: '',
    videoId: videoId || undefined,
  };
  list.unshift(item);
  savePlaylist(list);
  return true;
}

export function removeFromPlaylist(trackId: string): void {
  const list = loadPlaylist().filter(t => t.id !== trackId);
  savePlaylist(list);
}

export function isInPlaylist(trackId: string): boolean {
  return loadPlaylist().some(t => t.id === trackId);
}

// 가사 캐시
export function cacheLyrics(trackId: string, lyrics: string): void {
  try {
    const raw = localStorage.getItem(LYRICS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[trackId] = lyrics;
    localStorage.setItem(LYRICS_KEY, JSON.stringify(map));
  } catch {}
}

export function getCachedLyrics(trackId: string): string | null {
  try {
    const raw = localStorage.getItem(LYRICS_KEY);
    if (!raw) return null;
    return JSON.parse(raw)[trackId] ?? null;
  } catch { return null; }
}
