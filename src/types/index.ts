export interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt: string;
  durationMs: number;
  previewUrl: string | null;
  spotifyUri: string;
}

export interface LyricLine {
  startMs: number;
  endMs: number;
  text: string;
  words: Word[];
}

export interface Word {
  text: string;
  startMs: number;
  endMs: number;
  vocab?: VocabEntry;
}

export interface VocabEntry {
  word: string;
  pronunciation: string;   // 발음 기호
  meaning: string;         // 한국어 뜻
  example: string;         // 예문
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Song {
  track: Track;
  lyrics: LyricLine[];
}
