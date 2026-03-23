import { LyricLine, VocabEntry } from '../types';

// lrclib.net - 완전 무료, API 키 불필요, 타임스탬프 포함 가사 제공
const LRCLIB_BASE = 'https://lrclib.net/api';

export async function getLyrics(trackName: string, artistName: string, durationMs?: number): Promise<LyricLine[]> {
  try {
    // 1순위: duration으로 정확한 버전 매칭 (/api/get)
    if (durationMs) {
      const exactRes = await fetch(
        `${LRCLIB_BASE}/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}&duration=${Math.round(durationMs / 1000)}`
      );
      if (exactRes.ok) {
        const exact = await exactRes.json();
        if (exact?.syncedLyrics) return parseSyncedLyrics(exact.syncedLyrics);
        if (exact?.plainLyrics) return parsePlainLyrics(exact.plainLyrics);
      }
    }

    // 2순위: 검색 (duration 가장 가까운 버전 선택)
    const res = await fetch(
      `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`
    );
    const results = await res.json();
    if (!results || results.length === 0) return [];

    // duration이 있으면 가장 가까운 버전 선택, 없으면 첫 번째
    const match = durationMs
      ? results.reduce((best: any, item: any) => {
          const diff = Math.abs((item.duration ?? 0) * 1000 - durationMs);
          const bestDiff = Math.abs((best.duration ?? 0) * 1000 - durationMs);
          return diff < bestDiff ? item : best;
        })
      : results[0];

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

// 번역 캐시 (같은 단어/문장 반복 요청 방지)
const translationCache = new Map<string, string>();

// 영→한 번역: 3개 API를 동시에 요청해 가장 빠른 결과 사용
export async function translateToKorean(text: string): Promise<string> {
  const key = text.trim().toLowerCase();
  if (translationCache.has(key)) return translationCache.get(key)!;

  const tryLingva = async (host: string): Promise<string> => {
    const res = await fetch(`${host}/api/v1/en/ko/${encodeURIComponent(text)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('fail');
    const data = await res.json();
    const r = data?.translation ?? '';
    if (!r || r.includes('MYMEMORY') || r === text) throw new Error('bad');
    return r;
  };

  const tryMyMemory = async (): Promise<string> => {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`,
      { signal: AbortSignal.timeout(3000) }
    );
    const data = await res.json();
    const r = data?.responseData?.translatedText ?? '';
    if (!r || r.startsWith('MYMEMORY WARNING') || r === text) throw new Error('bad');
    return r;
  };

  try {
    // 3개 동시 요청 → 가장 빠른 성공 결과 사용
    const result = await Promise.any([
      tryLingva('https://lingva.ml'),
      tryLingva('https://translate.plausibility.cloud'),
      tryMyMemory(),
    ]);
    translationCache.set(key, result);
    return result;
  } catch {
    return '';
  }
}

// 영어 단어 뜻 조회 (Free Dictionary API) + 한국어 번역
export async function getWordDefinition(word: string): Promise<VocabEntry | null> {
  try {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return null;

    const [dictRes, koreanMeaning] = await Promise.all([
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`),
      translateToKorean(cleanWord),
    ]);

    if (!dictRes.ok) {
      // 사전에 없어도 번역은 보여줌
      if (koreanMeaning) {
        return {
          word: cleanWord,
          pronunciation: '',
          meaning: '',
          koreanMeaning,
          example: '',
          difficulty: cleanWord.length <= 4 ? 'easy' : cleanWord.length <= 7 ? 'medium' : 'hard',
        };
      }
      return null;
    }

    const data = await dictRes.json();
    const entry = data[0];
    const meaning = entry?.meanings?.[0];
    const definition = meaning?.definitions?.[0];

    return {
      word: cleanWord,
      pronunciation: entry?.phonetic ?? '',
      meaning: definition?.definition ?? '',
      koreanMeaning,
      example: definition?.example ?? '',
      difficulty: cleanWord.length <= 4 ? 'easy' : cleanWord.length <= 7 ? 'medium' : 'hard',
    };
  } catch {
    return null;
  }
}
