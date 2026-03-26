// lrclib.net에서 가사 사용 가능 여부 확인 + localStorage 캐싱
const CACHE_KEY = 'kpop_lyrics_avail';
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7일

function loadCache(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return {};
    return data;
  } catch { return {}; }
}

function saveCache(data: Record<string, boolean>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

// 단일 곡 가사 존재 여부 확인
async function hasLyrics(name: string, artist: string): Promise<boolean> {
  try {
    const q = new URLSearchParams({ track_name: name, artist_name: artist });
    const res = await fetch(`https://lrclib.net/api/search?${q}`);
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 && !!(data[0]?.syncedLyrics || data[0]?.plainLyrics);
  } catch { return false; }
}

// 여러 곡 일괄 확인 (concurrency 5)
export async function checkBatchLyrics(
  tracks: { id: string; name: string; artist: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<Set<string>> {
  const cache = loadCache();
  const result = new Set<string>();
  const toCheck: typeof tracks = [];

  for (const t of tracks) {
    if (cache[t.id] !== undefined) {
      if (cache[t.id]) result.add(t.id);
    } else {
      toCheck.push(t);
    }
  }

  // Already cached
  if (toCheck.length === 0) return result;

  const CONCURRENCY = 5;
  let done = 0;
  const newCache: Record<string, boolean> = {};

  for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
    const batch = toCheck.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(t => hasLyrics(t.name, t.artist))
    );
    for (let j = 0; j < batch.length; j++) {
      newCache[batch[j].id] = batchResults[j];
      if (batchResults[j]) result.add(batch[j].id);
    }
    done += batch.length;
    onProgress?.(done, toCheck.length);
  }

  saveCache({ ...cache, ...newCache });
  return result;
}
