import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import VocabListScreen from './src/screens/VocabListScreen';
import { Track, LyricLine } from './src/types';
import { getBTSTracks } from './src/services/itunes';
import { getLyrics } from './src/services/lyrics';
import {
  initYouTubeAPI,
  createYTPlayer,
  ytLoadVideo,
  ytPlay,
  ytPause,
  ytSeek,
  ytGetCurrentTime,
  ytGetDuration,
  YT_STATE,
} from './src/services/youtubePlayer';
import { searchYouTube } from './src/services/youtubeSearch';
import { auth, googleProvider } from './src/config/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import {
  subscribeLiked,
  saveLiked,
  subscribeVocab,
} from './src/services/syncService';
import { getSavedWords } from './src/services/vocabStorage';

type Screen = 'home' | 'player' | 'vocab';
type RepeatMode = 'off' | 'one' | 'all';

// localStorage fallback (로그아웃 상태)
function loadLikedLocal(): Set<string> {
  try {
    const s = localStorage.getItem('kpop_liked');
    return s ? new Set(JSON.parse(s)) : new Set();
  } catch { return new Set(); }
}
function saveLikedLocal(set: Set<string>) {
  try { localStorage.setItem('kpop_liked', JSON.stringify([...set])); } catch {}
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [lyricsOffset, setLyricsOffset] = useState(0);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [likedTracks, setLikedTracks] = useState<Set<string>>(loadLikedLocal);

  // ── Firebase Auth ──────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const likedUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // redirect 결과 처리 (모바일에서 signInWithRedirect 후)
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // 이전 구독 해제
      likedUnsubRef.current?.();
      if (u) {
        // 로그인 → Firestore 실시간 구독
        likedUnsubRef.current = subscribeLiked(u.uid, (ids) => {
          setLikedTracks(new Set(ids));
        });
      } else {
        // 로그아웃 → localStorage로 복원
        setLikedTracks(loadLikedLocal());
      }
    });
    return () => { unsub(); likedUnsubRef.current?.(); };
  }, []);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      // 모바일 브라우저는 popup 차단 가능 → redirect 우선
      const isMobile = /iPhone|iPad|iPod|Android/i.test(
        typeof navigator !== 'undefined' ? navigator.userAgent : ''
      );
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (e: any) {
      console.error('Google login error:', e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // ── Refs ───────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const ytReadyRef = useRef(false);
  const currentTrackRef = useRef<Track | null>(null);
  const shuffleModeRef = useRef(false);
  const repeatModeRef = useRef<RepeatMode>('off');

  useEffect(() => { loadTracks(); }, []);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { shuffleModeRef.current = shuffleMode; }, [shuffleMode]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  const getNextIndex = useCallback((current: number): number => {
    if (shuffleModeRef.current) {
      const len = tracksRef.current.length;
      let idx = Math.floor(Math.random() * len);
      if (len > 1 && idx === current) idx = (idx + 1) % len;
      return idx;
    }
    return (current + 1) % tracksRef.current.length;
  }, []);

  // ── YouTube + Media Session 초기화 ─────────────────────────
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const fontMap = Ionicons.font as Record<string, any>;
      const fontUrl = Object.values(fontMap)[0];
      if (fontUrl) {
        const style = document.createElement('style');
        style.textContent = `@font-face { font-family: 'Ionicons'; src: url('${fontUrl}') format('truetype'); }`;
        document.head.appendChild(style);
      }
    }
    Font.loadAsync({ ...Ionicons.font }).catch(() => {});

    if (Platform.OS === 'web') {
      initYouTubeAPI().then(() => {
        createYTPlayer((state) => {
          if (state === YT_STATE.PLAYING) {
            setIsPlaying(true);
            setTimeout(async () => {
              const dur = ytGetDuration();
              if (dur <= 0) return;
              setDurationMs(dur);
              const track = currentTrackRef.current;
              if (!track) return;
              const diffMs = dur - track.durationMs;
              if (Math.abs(diffMs) > 1000) {
                const newLyrics = await getLyrics(track.name, track.artists[0], dur);
                if (newLyrics.length > 0) { setLyrics(newLyrics); setLyricsOffset(0); return; }
                if (diffMs > 1000 && diffMs < 30000) setLyricsOffset(-diffMs);
              }
            }, 800);
          } else if (state === YT_STATE.PAUSED) {
            setIsPlaying(false);
          } else if (state === YT_STATE.ENDED) {
            setIsPlaying(false);
            if (repeatModeRef.current === 'one') { ytSeek(0); ytPlay(); return; }
            const nextIdx = getNextIndex(currentIndexRef.current);
            if (tracksRef.current[nextIdx]) playTrack(tracksRef.current[nextIdx], nextIdx);
          }
        });
        ytReadyRef.current = true;

        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          const ms = navigator.mediaSession;
          ms.setActionHandler('play', () => { ytPlay(); setIsPlaying(true); });
          ms.setActionHandler('pause', () => { ytPause(); setIsPlaying(false); });
          ms.setActionHandler('previoustrack', () => {
            const len = tracksRef.current.length;
            const prevIdx = (currentIndexRef.current - 1 + len) % len;
            if (tracksRef.current[prevIdx]) playTrack(tracksRef.current[prevIdx], prevIdx);
          });
          ms.setActionHandler('nexttrack', () => {
            const nextIdx = getNextIndex(currentIndexRef.current);
            if (tracksRef.current[nextIdx]) playTrack(tracksRef.current[nextIdx], nextIdx);
          });
          ms.setActionHandler('seekto', (details) => {
            if (details.seekTime != null) {
              const ms2 = details.seekTime * 1000;
              ytSeek(ms2); setCurrentMs(ms2);
            }
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => setCurrentMs(ytGetCurrentTime()), 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  // ── Player ─────────────────────────────────────────────────
  const playTrack = async (track: Track, index: number) => {
    setCurrentTrack(track);
    currentTrackRef.current = track;
    setCurrentIndex(index);
    currentIndexRef.current = index;
    setScreen('player');
    setIsPlaying(false);
    setCurrentMs(0);
    setDurationMs(track.durationMs);
    setLyricsOffset(0);

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new (window as any).MediaMetadata({
        title: track.name,
        artist: track.artists[0] ?? '',
        album: track.album ?? '',
        artwork: [{ src: track.albumArt, sizes: '600x600', type: 'image/jpeg' }],
      });
    }

    const [l, videoId] = await Promise.all([
      getLyrics(track.name, track.artists[0], track.durationMs),
      ytReadyRef.current ? searchYouTube(track.name, track.artists[0]) : Promise.resolve(null),
    ]);
    setLyrics(l);
    if (videoId) ytLoadVideo(videoId);
    else console.warn('YouTube video not found:', track.name);
  };

  const loadTracks = () => {
    setScreen('home');
    getBTSTracks()
      .then((t) => {
        if (t.length === 0) setLoadError('곡을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        else { setLoadError(null); setTracks(t); }
      })
      .catch((e) => setLoadError(`오류: ${e.message ?? e}`));
  };

  const handleNext = useCallback(() => {
    if (repeatModeRef.current === 'one') { ytSeek(0); ytPlay(); return; }
    const nextIdx = getNextIndex(currentIndexRef.current);
    if (tracksRef.current[nextIdx]) playTrack(tracksRef.current[nextIdx], nextIdx);
  }, []);

  const handlePrev = useCallback(() => {
    if (currentMs > 3000) { ytSeek(0); setCurrentMs(0); }
    else {
      const len = tracksRef.current.length;
      const prevIdx = (currentIndexRef.current - 1 + len) % len;
      if (tracksRef.current[prevIdx]) playTrack(tracksRef.current[prevIdx], prevIdx);
    }
  }, [currentMs]);

  const handlePlayPause = () => {
    if (isPlaying) {
      ytPause(); setIsPlaying(false);
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'paused';
    } else {
      ytPlay(); setIsPlaying(true);
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator)
        navigator.mediaSession.playbackState = 'playing';
    }
  };

  const handleToggleLike = (trackId: string) => {
    setLikedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      const ids = [...next];
      if (user) {
        // 로그인 상태: Firestore 저장 (실시간 sync)
        saveLiked(user.uid, ids);
      } else {
        // 비로그인: localStorage
        saveLikedLocal(next);
      }
      return next;
    });
  };

  const handleToggleRepeat = () => {
    setRepeatMode((m) => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off');
  };

  // ── Auth 배너 (홈 화면 상단에 오버레이) ────────────────────
  const AuthBanner = () => (
    <View style={styles.authBanner}>
      {user ? (
        <View style={styles.authRow}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.authAvatar} />
          ) : (
            <View style={styles.authAvatarPlaceholder}>
              <Text style={styles.authAvatarText}>{user.displayName?.[0] ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.authName} numberOfLines={1}>{user.displayName}</Text>
          <View style={styles.syncDot} />
          <Text style={styles.syncLabel}>실시간 동기화 중</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.authBtn}>
            <Text style={styles.authBtnText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={authLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.googleBtnIcon}>G</Text>
          <Text style={styles.googleBtnText}>
            {authLoading ? '로그인 중...' : 'Google로 로그인하면 모든 기기 동기화'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (screen === 'vocab') return (
    <SafeAreaProvider>
      <VocabListScreen onBack={() => setScreen('home')} uid={user?.uid ?? null} />
    </SafeAreaProvider>
  );

  if (screen === 'player' && currentTrack) {
    return (
      <SafeAreaProvider>
        <PlayerScreen
          track={currentTrack}
          lyrics={lyrics}
          isPlaying={isPlaying}
          currentMs={currentMs}
          durationMs={durationMs}
          lyricsOffset={lyricsOffset}
          shuffleMode={shuffleMode}
          repeatMode={repeatMode}
          isLiked={likedTracks.has(currentTrack.id)}
          onLyricsOffsetChange={setLyricsOffset}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={(ms) => { setCurrentMs(ms); ytSeek(ms); }}
          onToggleShuffle={() => setShuffleMode((s) => !s)}
          onToggleRepeat={handleToggleRepeat}
          onToggleLike={() => handleToggleLike(currentTrack.id)}
          onBack={() => setScreen('home')}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <AuthBanner />
        <HomeScreen
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentMs={currentMs}
          durationMs={durationMs}
          likedTrackIds={likedTracks}
          onSelectTrack={(track) => playTrack(track, tracks.indexOf(track))}
          onOpenPlayer={() => setScreen('player')}
          onVocabPress={() => setScreen('vocab')}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          loadError={loadError}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },

  // ── Auth 배너 ──
  authBanner: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authAvatar: { width: 28, height: 28, borderRadius: 14 },
  authAvatarPlaceholder: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FC3C44', alignItems: 'center', justifyContent: 'center',
  },
  authAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  authName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  syncDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#30D158',
  },
  syncLabel: { fontSize: 12, color: '#30D158', fontWeight: '600' },
  authBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  authBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // ── Google 로그인 버튼 ──
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  googleBtnIcon: {
    fontSize: 15, fontWeight: '900', color: '#4285F4',
    width: 22, textAlign: 'center',
  },
  googleBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 },
});
