/**
 * Firestore 실시간 동기화 서비스
 * - liked tracks: users/{uid} 문서의 likedIds 필드
 * - vocab words: users/{uid}/data/vocab 문서의 words 필드
 * - onSnapshot → 모든 기기에서 즉시 반영
 */
import {
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { SavedWord } from './vocabStorage';

// ── Liked Tracks ──────────────────────────────────────────────

export function subscribeLiked(
  uid: string,
  onUpdate: (likedIds: string[]) => void
): Unsubscribe {
  const ref = doc(db, 'users', uid);
  return onSnapshot(ref, (snap) => {
    onUpdate((snap.data()?.likedIds as string[]) ?? []);
  });
}

export async function saveLiked(uid: string, likedIds: string[]): Promise<void> {
  await setDoc(doc(db, 'users', uid), { likedIds }, { merge: true });
}

// ── Vocab Words ───────────────────────────────────────────────

export function subscribeVocab(
  uid: string,
  onUpdate: (words: SavedWord[]) => void
): Unsubscribe {
  const ref = doc(db, 'users', uid, 'data', 'vocab');
  return onSnapshot(ref, (snap) => {
    onUpdate((snap.data()?.words as SavedWord[]) ?? []);
  });
}

export async function saveVocab(uid: string, words: SavedWord[]): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'data', 'vocab'), { words });
}

export async function getVocab(uid: string): Promise<SavedWord[]> {
  const snap = await getDoc(doc(db, 'users', uid, 'data', 'vocab'));
  return (snap.data()?.words as SavedWord[]) ?? [];
}
