import { VocabEntry } from '../types';
import { saveVocab as saveVocabFirestore } from './syncService';

const STORAGE_KEY = 'kpop_vocab_list';

export interface SavedWord extends VocabEntry {
  savedAt: number;
  songName: string;
}

// ── localStorage 기본 조작 ─────────────────────────────────

export function getSavedWords(): SavedWord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function persistLocal(words: SavedWord[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(words)); } catch {}
}

// uid 있으면 Firestore에도 동기화
async function persistAll(words: SavedWord[], uid: string | null) {
  persistLocal(words);
  if (uid) await saveVocabFirestore(uid, words);
}

// ── CRUD ──────────────────────────────────────────────────────

export async function saveWord(
  vocab: VocabEntry,
  songName: string,
  uid: string | null
): Promise<boolean> {
  const words = getSavedWords();
  const existing = words.findIndex((w) => w.word === vocab.word);
  if (existing >= 0) {
    words[existing] = { ...vocab, savedAt: words[existing].savedAt, songName };
  } else {
    words.unshift({ ...vocab, savedAt: Date.now(), songName });
  }
  await persistAll(words, uid);
  return existing < 0;
}

export async function updateWord(
  word: string,
  updates: Partial<Pick<SavedWord, 'koreanMeaning' | 'meaning' | 'example'>>,
  uid: string | null
): Promise<void> {
  const words = getSavedWords();
  const idx = words.findIndex((w) => w.word === word);
  if (idx >= 0) {
    words[idx] = { ...words[idx], ...updates };
    await persistAll(words, uid);
  }
}

export async function deleteWord(word: string, uid: string | null): Promise<void> {
  const words = getSavedWords().filter((w) => w.word !== word);
  await persistAll(words, uid);
}

export function isWordSaved(word: string): boolean {
  return getSavedWords().some((w) => w.word === word);
}

// 로그인 후 Firestore → localStorage 병합 (기존 로컬 데이터 보존)
export async function mergeFromFirestore(
  remoteWords: SavedWord[],
  uid: string
): Promise<SavedWord[]> {
  const local = getSavedWords();
  const merged = [...remoteWords];
  for (const lw of local) {
    if (!merged.find((rw) => rw.word === lw.word)) merged.push(lw);
  }
  merged.sort((a, b) => b.savedAt - a.savedAt);
  await persistAll(merged, uid);
  return merged;
}
