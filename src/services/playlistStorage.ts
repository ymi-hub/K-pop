import { Track } from '../types';

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

const KEY = 'kpop_playlists';

export function getPlaylists(): Playlist[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function savePlaylist(pl: Playlist): void {
  const list = getPlaylists().filter((p) => p.id !== pl.id);
  list.unshift(pl);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
}

export function deletePlaylist(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getPlaylists().filter((p) => p.id !== id)));
}
