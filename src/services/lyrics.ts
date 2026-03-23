import { LyricLine, VocabEntry } from '../types';

// Musixmatch API (가사 제공)
// https://developer.musixmatch.com 에서 API 키 발급
const MUSIXMATCH_API_KEY = process.env.EXPO_PUBLIC_MUSIXMATCH_API_KEY ?? '';

export async function getLyrics(trackName: string, artistName: string): Promise<LyricLine[]> {
  try {
    const res = await fetch(
      `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?format=json&q_track=${encodeURIComponent(trackName)}&q_artist=${encodeURIComponent(artistName)}&apikey=${MUSIXMATCH_API_KEY}`
    );
    const data = await res.json();
    const rawLyrics: string = data?.message?.body?.lyrics?.lyrics_body ?? '';
    return parseLyrics(rawLyrics);
  } catch {
    return [];
  }
}

function parseLyrics(raw: string): LyricLine[] {
  const lines = raw.split('\n').filter((l) => l.trim() !== '');
  return lines.map((text, index) => ({
    startMs: index * 4000,   // 실제로는 타임스탬프 사용
    endMs: (index + 1) * 4000,
    text,
    words: text.split(' ').map((word, wi) => ({
      text: word,
      startMs: index * 4000 + wi * 300,
      endMs: index * 4000 + (wi + 1) * 300,
    })),
  }));
}

// 영어 단어 뜻 조회 (Free Dictionary API)
export async function getWordDefinition(word: string): Promise<VocabEntry | null> {
  try {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return null;

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
    if (!res.ok) return null;

    const data = await res.json();
    const entry = data[0];
    const meaning = entry?.meanings?.[0];
    const definition = meaning?.definitions?.[0];

    return {
      word: cleanWord,
      pronunciation: entry?.phonetic ?? '',
      meaning: definition?.definition ?? '',
      example: definition?.example ?? '',
      difficulty: 'medium',
    };
  } catch {
    return null;
  }
}
