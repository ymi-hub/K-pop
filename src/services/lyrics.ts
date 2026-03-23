import { LyricLine, VocabEntry } from '../types';

// lrclib.net - 완전 무료, API 키 불필요, 타임스탬프 포함 가사 제공
const LRCLIB_BASE = 'https://lrclib.net/api';

export async function getLyrics(trackName: string, artistName: string): Promise<LyricLine[]> {
  try {
    const res = await fetch(
      `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`
    );
    const results = await res.json();
    if (!results || results.length === 0) return [];

    const match = results[0];

    // 타임스탬프 있는 싱크 가사 우선 사용
    if (match.syncedLyrics) {
      return parseSyncedLyrics(match.syncedLyrics);
    }

    // 없으면 일반 가사 사용
    if (match.plainLyrics) {
      return parsePlainLyrics(match.plainLyrics);
    }

    return [];
  } catch {
    return [];
  }
}

// [mm:ss.xx] 형식 싱크 가사 파싱
function parseSyncedLyrics(raw: string): LyricLine[] {
  const lines = raw.split('\n').filter((l) => l.trim() !== '');
  const parsed: LyricLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\[(\d+):(\d+\.\d+)\](.*)/);
    if (!match) continue;

    const min = parseInt(match[1], 10);
    const sec = parseFloat(match[2]);
    const text = match[3].trim();
    const startMs = Math.round((min * 60 + sec) * 1000);

    // 다음 라인 시작 시간을 endMs로 사용
    let endMs = startMs + 4000;
    if (i + 1 < lines.length) {
      const nextMatch = lines[i + 1].match(/^\[(\d+):(\d+\.\d+)\]/);
      if (nextMatch) {
        const nm = parseInt(nextMatch[1], 10);
        const ns = parseFloat(nextMatch[2]);
        endMs = Math.round((nm * 60 + ns) * 1000);
      }
    }

    if (!text) continue;

    parsed.push({
      startMs,
      endMs,
      text,
      words: text.split(' ').map((word, wi, arr) => ({
        text: word,
        startMs: startMs + Math.round((wi / arr.length) * (endMs - startMs)),
        endMs: startMs + Math.round(((wi + 1) / arr.length) * (endMs - startMs)),
      })),
    });
  }

  return parsed;
}

// 타임스탬프 없는 일반 가사 파싱
function parsePlainLyrics(raw: string): LyricLine[] {
  return raw
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((text, i) => ({
      startMs: i * 4000,
      endMs: (i + 1) * 4000,
      text,
      words: text.split(' ').map((word, wi, arr) => ({
        text: word,
        startMs: i * 4000 + Math.round((wi / arr.length) * 4000),
        endMs: i * 4000 + Math.round(((wi + 1) / arr.length) * 4000),
      })),
    }));
}

// 영어 단어 뜻 조회 (Free Dictionary API)
export async function getWordDefinition(word: string): Promise<VocabEntry | null> {
  try {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return null;

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
      difficulty: cleanWord.length <= 4 ? 'easy' : cleanWord.length <= 7 ? 'medium' : 'hard',
    };
  } catch {
    return null;
  }
}
