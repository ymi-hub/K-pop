import { VocabEntry } from '../types';

const STORAGE_KEY = 'kpop_vocab_list';

export interface SavedWord extends VocabEntry {
  savedAt: number;
  songName: string;
}

export function getSavedWords(): SavedWord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveWord(vocab: VocabEntry, songName: string): boolean {
  const words = getSavedWords();
  const existing = words.findIndex((w) => w.word === vocab.word);
  if (existing >= 0) {
    // 이미 있으면 업데이트
    words[existing] = { ...vocab, savedAt: words[existing].savedAt, songName };
  } else {
    words.unshift({ ...vocab, savedAt: Date.now(), songName });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  return existing < 0; // true = 새로 저장, false = 업데이트
}

export function updateWord(word: string, updates: Partial<Pick<SavedWord, 'koreanMeaning' | 'meaning' | 'example'>>): void {
  const words = getSavedWords();
  const idx = words.findIndex((w) => w.word === word);
  if (idx >= 0) {
    words[idx] = { ...words[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }
}

export function deleteWord(word: string): void {
  const words = getSavedWords().filter((w) => w.word !== word);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

export function isWordSaved(word: string): boolean {
  return getSavedWords().some((w) => w.word === word);
}
