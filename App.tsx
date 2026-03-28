import React, { useState, useEffect, useRef, Component, useCallback } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import VocabListScreen from './src/screens/VocabListScreen';
import LoginScreen from './src/screens/LoginScreen';
import AlbumDetailScreen from './src/screens/AlbumDetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import QuizScreen from './src/screens/QuizScreen';
import { loadPlaylist, getCachedLyrics, removeFromPlaylist } from './src/services/playlistStorage';
import MiniPlayer from './src/components/MiniPlayer';
import { Track, LyricLine } from './src/types';
import { getLyrics } from './src/services/lyrics';
import {
  initYouTubeAPI, createYTPlayer, ytLoadVideo,
  ytPlay, ytPause, ytSeek, ytGetCurrentTime, ytGetDuration, YT_STATE,
} from './src/services/youtubePlayer';
import { initAudioPlayer, audioLoadAndPlay, audioPause, audioPlay, audioGetCurrentTime, audioGetDuration } from './src/services/audioPlayer';
import { searchYouTube } from './src/services/youtubeSearch';
import { getBTSTracks } from './src/services/itunes';

const ytCache = new Map<string, { videoId: string; thumbnail: string }>();
import { auth, googleProvider } from './src/config/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import { subscribeLiked, saveLiked, subscribeRecent, saveRecent, subscribePlaylistItems, savePlaylistItems } from './src/services/syncService';
import { setFirestorePlaylistSaver } from './src/services/playlistStorage';

type Screen = 'home' | 'vocab' | 'album' | 'search' | 'quiz';
type RepeatMode = 'off' | 'one' | 'all';

const SAFE_AREA_INITIAL = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 에러를 화면에 직접 표시
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: any) {
    return { error: String(e?.message ?? e) };
  }
  componentDidCatch(e: any, info: any) {
    console.error('ErrorBoundary caught:', e, info);
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 16, marginTop: 60, marginBottom: 10 }}>
            ERROR:
          </Text>
          <Text style={{ color: '#fff', fontSize: 13 }}>
            {this.state.error}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [initLog, setInitLog] = useState<string[]>(['App started']);
  const [screen, setScreen] = useState<Screen>('home');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [lyricsOffset, setLyricsOffset] = useState(0);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('kpop_liked_ids');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const likedUnsubRef = useRef<(() => void) | null>(null);
  const recentUnsubRef = useRef<(() => void) | null>(null);
  const playlistUnsubRef = useRef<(() => void) | null>(null);
  const userRef = useRef<User | null>(null);
  const [recentTracks, setRecentTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem('kpop_recent_tracks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try { return !localStorage.getItem('kpop_visited'); } catch { return false; }
  });
  const [activeAlbum, setActiveAlbum] = useState<{ name: string; art: string; tracks: Track[] } | null>(null);
  const [playerExpanded, setPlayerExpanded] = useState(false);

  // ── Firebase Auth ─────────────────────────────────────────
  useEffect(() => {
    if (!auth) return;
    // 모바일 Safari signInWithRedirect 후 결과 처리
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      userRef.current = u;
      // 기존 구독 해제
      likedUnsubRef.current?.();
      recentUnsubRef.current?.();
      playlistUnsubRef.current?.();

      if (u) {
        // 좋아요
        likedUnsubRef.current = subscribeLiked(u.uid, (ids) => {
          setLikedIds(new Set(ids));
        });
        // 최근 재생 — Firestore 데이터 있으면 덮어쓰기, 없으면 로컬 데이터 업로드
        recentUnsubRef.current = subscribeRecent(u.uid, (tracks) => {
          if (tracks.length > 0) {
            setRecentTracks(tracks);
          } else {
            try {
              const raw = localStorage.getItem('kpop_recent_tracks');
              const local = raw ? JSON.parse(raw) : [];
              if (local.length > 0) saveRecent(u.uid, local).catch(() => {});
            } catch {}
          }
        });
        // 플레이리스트 — Firestore 데이터 있으면 localStorage 업데이트,
        // 없으면 localStorage 데이터를 Firestore에 업로드 (첫 로그인 시 복구)
        playlistUnsubRef.current = subscribePlaylistItems(u.uid, (items) => {
          if (items.length > 0) {
            try { localStorage.setItem('kpop_my_playlist', JSON.stringify(items)); } catch {}
            window.dispatchEvent(new CustomEvent('kpop_playlist_synced'));
          } else {
            try {
              const raw = localStorage.getItem('kpop_my_playlist');
              const local = raw ? JSON.parse(raw) : [];
              if (local.length > 0) savePlaylistItems(u.uid, local).catch(() => {});
            } catch {}
          }
        });
        setFirestorePlaylistSaver((items) => savePlaylistItems(u.uid, items).catch(() => {}));
      } else {
        try {
          const saved = localStorage.getItem('kpop_liked_ids');
          setLikedIds(saved ? new Set<string>(JSON.parse(saved)) : new Set());
        } catch {}
        setFirestorePlaylistSaver(null);
      }
    });
    return () => {
      unsub();
      likedUnsubRef.current?.();
      recentUnsubRef.current?.();
      playlistUnsubRef.current?.();
    };
  }, []);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (e.code === 'auth/popup-blocked') {
        try { await signInWithRedirect(auth, googleProvider); } catch {}
      } else if (e.code !== 'auth/popup-closed-by-user') {
        console.error('Login error:', e.code);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef({ currentIndex, playOrder, tracks, repeatMode });
  const handleEndedRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef(false);
  const ytReadyRef = useRef(false);
  const playerModeRef = useRef<'audio' | 'youtube'>('audio');
  const selectByIdxRef = useRef<(idx: number) => Promise<void>>(async () => {});

  // 최근 재생 목록 localStorage + Firestore(로그인 시) 저장
  useEffect(() => {
    try { localStorage.setItem('kpop_recent_tracks', JSON.stringify(recentTracks)); } catch {}
    if (userRef.current) saveRecent(userRef.current.uid, recentTracks).catch(() => {});
  }, [recentTracks]);

  const log = (msg: string) => setInitLog(prev => [...prev.slice(-8), msg]);

  // 트랙 로드
  useEffect(() => {
    log('Loading tracks...');
    getBTSTracks()
      .then((t) => {
        setTracks(t);
        setPlayOrder(t.map((_, i) => i));
        log(`Tracks loaded: ${t.length}`);
      })
      .catch((e: any) => log(`Track load ERROR: ${e?.message}`));
  }, []);

  useEffect(() => {
    stateRef.current = { currentIndex, playOrder, tracks, repeatMode };
    isPlayingRef.current = isPlaying;
  });

  useEffect(() => {
    handleEndedRef.current = () => {
      const { currentIndex: idx, playOrder: order, repeatMode: mode } = stateRef.current;
      if (mode === 'one') { ytSeek(0); ytPlay(); return; }
      const next = order.indexOf(idx) + 1;
      if (next >= order.length) {
        if (mode === 'all') selectByIdxRef.current(order[0]);
        else setIsPlaying(false);
      } else {
        selectByIdxRef.current(order[next]);
      }
    };
  });

  // YouTube 초기화
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    log('Initializing YouTube...');
    initAudioPlayer(() => {});
    initYouTubeAPI()
      .then(() => {
        log('YT API ready, creating player...');
        return createYTPlayer((state) => {
          if (state === YT_STATE.PLAYING) {
            audioPause(); // iTunes 프리뷰 중지
            playerModeRef.current = 'youtube';
            setIsPlaying(true);
            const d = ytGetDuration();
            if (d > 0) setDurationMs(d);
          } else if (state === YT_STATE.PAUSED) {
            setIsPlaying(false);
          } else if (state === YT_STATE.ENDED) {
            handleEndedRef.current();
          }
        });
      })
      .then(() => { log('YT player ready'); ytReadyRef.current = true; })
      .catch((e: any) => log(`YT init ERROR: ${e?.message}`));
  }, []);

  // 재생 중 타이머 — YouTube 우선, 없으면 iTunes audio fallback
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      const ytMs = ytGetCurrentTime();
      const ms = ytMs > 0 ? ytMs : audioGetCurrentTime();
      setCurrentMs(prev => (Math.abs(ms - prev) > 300 ? ms : prev));
      const ytDur = ytGetDuration();
      const d = ytDur > 0 ? ytDur : audioGetDuration();
      if (d > 0) setDurationMs(prev => (d !== prev ? d : prev));
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const selectByIdx = async (idx: number) => {
    const track = stateRef.current.tracks[idx];
    if (!track) return;
    setCurrentTrack(track);
    setRecentTracks(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 15);
    });
    setCurrentIndex(idx);
    setPlayerExpanded(true);
    setIsPlaying(false);
    setCurrentMs(0);
    setDurationMs(track.durationMs);
    setLyricsOffset(0);
    playerModeRef.current = 'audio';
    getLyrics(track.name, track.artists[0]).then(setLyrics).catch(() => setLyrics([]));
    // iTunes 프리뷰 즉시 재생 (YouTube 로드 전 fallback)
    if (track.previewUrl) { audioLoadAndPlay(track.previewUrl); setIsPlaying(true); }
    if (Platform.OS !== 'web' || !ytReadyRef.current) return;
    const cached = ytCache.get(track.id);
    if (cached) { updateArt(idx, cached.thumbnail); ytLoadVideo(cached.videoId); return; }
    const result = await searchYouTube(track.name, track.artists[0]);
    if (result) { ytCache.set(track.id, result); updateArt(idx, result.thumbnail); ytLoadVideo(result.videoId); }
  };
  selectByIdxRef.current = selectByIdx;

  const updateArt = (idx: number, thumb: string) => {
    setTracks(prev => { const n = [...prev]; n[idx] = { ...n[idx], albumArt: thumb }; return n; });
    setCurrentTrack(prev => prev ? { ...prev, albumArt: thumb } : prev);
  };

  // 외부(Deezer 검색) 트랙 포함 범용 재생 핸들러
  const handleSelectAnyTrack = useCallback(async (track: Track) => {
    const idx = stateRef.current.tracks.findIndex(t => t.id === track.id);
    if (idx !== -1) { selectByIdxRef.current(idx); return; }

    // 외부 트랙
    setCurrentTrack(track);
    setRecentTracks(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 15));
    setPlayerExpanded(true);
    setIsPlaying(false);
    setCurrentMs(0);
    setDurationMs(track.durationMs || 0);
    setLyricsOffset(0);
    playerModeRef.current = 'audio';

    // iTunes 프리뷰 즉시 재생
    if (track.previewUrl) { audioLoadAndPlay(track.previewUrl); setIsPlaying(true); }
    // 가사: 캐시 → 실시간 조회
    const cachedLyrics = getCachedLyrics(track.id);
    if (cachedLyrics) {
      try { setLyrics(JSON.parse(cachedLyrics)); } catch { setLyrics([]); }
    } else {
      getLyrics(track.name, track.artists[0]).then(setLyrics).catch(() => setLyrics([]));
    }

    if (Platform.OS !== 'web' || !ytReadyRef.current) return;

    // videoId: ytCache(메모리) → playlist에 저장된 videoId → YouTube 검색
    let videoId: string | undefined = ytCache.get(track.id)?.videoId;
    if (!videoId) {
      const pl = loadPlaylist().find(t => t.id === track.id);
      videoId = (pl as any)?.videoId;
    }
    if (!videoId) {
      const result = await searchYouTube(track.name, track.artists[0]);
      if (result) { ytCache.set(track.id, result); videoId = result.videoId; }
    }
    if (videoId) ytLoadVideo(videoId);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlayingRef.current) {
      ytPause();
      audioPause();
      setIsPlaying(false);
    } else {
      if (playerModeRef.current === 'youtube') ytPlay();
      else audioPlay();
      setIsPlaying(true);
    }
  }, []);

  const handleNext = useCallback(() => {
    const { currentIndex: idx, playOrder: order, repeatMode: mode } = stateRef.current;
    if (mode === 'one') { ytSeek(0); ytPlay(); return; }
    selectByIdxRef.current(order[(order.indexOf(idx) + 1) % order.length]);
  }, []);

  const handlePrev = useCallback(() => {
    const ms = ytGetCurrentTime();
    if (ms > 3000) { ytSeek(0); return; }
    const { currentIndex: idx, playOrder: order } = stateRef.current;
    selectByIdxRef.current(order[(order.indexOf(idx) - 1 + order.length) % order.length]);
  }, []);

  const handleSeek = useCallback((ms: number) => { ytSeek(ms); setCurrentMs(ms); }, []);

  const handleToggleShuffle = useCallback(() => {
    setShuffleMode(prev => {
      const next = !prev;
      if (next) {
        const rest = tracks.map((_, i) => i).filter(i => i !== currentIndex);
        setPlayOrder([currentIndex, ...shuffleArray(rest)]);
      } else {
        setPlayOrder(tracks.map((_, i) => i));
      }
      return next;
    });
  }, [tracks, currentIndex]);

  const handleToggleRepeat = useCallback(() =>
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'), []);

  const handleRemoveFromPlaylist = useCallback((id: string) => {
    removeFromPlaylist(id);
    // 즐겨찾기에서 제거
    setLikedIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set([...prev].filter(x => x !== id));
      const ids = [...next];
      if (userRef.current) saveLiked(userRef.current.uid, ids).catch(() => {});
      else { try { localStorage.setItem('kpop_liked_ids', JSON.stringify(ids)); } catch {} }
      return next;
    });
    // 최근 재생에서 제거
    setRecentTracks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleToggleLike = useCallback((trackId?: string) => {
    const id = typeof trackId === 'string' ? trackId : currentTrack?.id;
    if (!id) return;
    setLikedIds(prev => {
      const next = prev.has(id)
        ? new Set([...prev].filter(x => x !== id))
        : new Set([id, ...prev]);
      const ids = [...next];
      if (user) {
        saveLiked(user.uid, ids).catch(() => {});
      } else {
        try { localStorage.setItem('kpop_liked_ids', JSON.stringify(ids)); } catch {}
      }
      return next;
    });
  }, [currentTrack?.id, user]);

  const handleOpenAlbum = useCallback((name: string, art: string, albumTracks: Track[]) => {
    setActiveAlbum({ name, art, tracks: albumTracks });
    setScreen('album');
  }, []);

  const handleBackFromAlbum = useCallback(() => {
    setScreen('home');
  }, []);

  const handleBackToHome = useCallback(() => setScreen('home'), []);
  const handleOpenPlayer = useCallback(() => setPlayerExpanded(true), []);

  const handleWelcomeStart = () => {
    try { localStorage.setItem('kpop_visited', '1'); } catch {}
    setShowWelcome(false);
  };

  // 웰컴 화면 (첫 방문)
  if (showWelcome) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider initialMetrics={SAFE_AREA_INITIAL}>
          <LoginScreen onStart={handleWelcomeStart} />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // 초기 로딩 중 (트랙 없으면 로그 표시)
  if (tracks.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', padding: 24, justifyContent: 'center' }}>
        {initLog.map((msg, i) => (
          <Text key={i} style={{ color: i === initLog.length - 1 ? '#1DB954' : '#666', fontSize: 13, marginBottom: 4 }}>
            {msg}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={SAFE_AREA_INITIAL}>
        {/* Base layer: current screen */}
        {screen === 'quiz' ? (
          <QuizScreen onBack={handleBackToHome} hasMiniPlayer={!!currentTrack} />
        ) : screen === 'vocab' ? (
          <VocabListScreen uid={user?.uid ?? null} tracks={tracks} onBack={handleBackToHome} onQuizPress={() => setScreen('quiz')} />
        ) : screen === 'search' ? (
          <SearchScreen
            onPlayTrack={handleSelectAnyTrack}
            onPlaylistChange={() => {}}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            onBack={handleBackToHome}
          />
        ) : screen === 'album' && activeAlbum ? (
          <AlbumDetailScreen
            album={activeAlbum}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onBack={handleBackFromAlbum}
            onSelectTrack={handleSelectAnyTrack}
            onPlayAll={() => { if (activeAlbum.tracks[0]) handleSelectAnyTrack(activeAlbum.tracks[0]); }}
            onShuffleAll={() => {
              const shuffled = shuffleArray(activeAlbum.tracks);
              if (shuffled[0]) handleSelectAnyTrack(shuffled[0]);
            }}
          />
        ) : (
          <HomeScreen
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedIds={likedIds}
            recentTracks={recentTracks}
            onSelectTrack={handleSelectAnyTrack}
            onToggleLike={handleToggleLike}
            onOpenAlbum={handleOpenAlbum}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            onVocabPress={() => setScreen('vocab')}
            onSearchPress={() => setScreen('search')}
            user={user}
            authLoading={authLoading}
            onLogin={handleGoogleLogin}
            onLogout={handleLogout}
          />
        )}

        {/* MiniPlayer — always visible when track loaded, covered by PlayerScreen when expanded */}
        {currentTrack && (
          <MiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            onPress={handleOpenPlayer}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
          />
        )}

        {/* PlayerScreen overlay — always mounted when track exists, slides up/down */}
        {currentTrack && (
          <PlayerScreen
            expanded={playerExpanded}
            track={currentTrack}
            lyrics={lyrics}
            isPlaying={isPlaying}
            currentMs={currentMs}
            durationMs={durationMs}
            lyricsOffset={lyricsOffset}
            shuffleMode={shuffleMode}
            repeatMode={repeatMode}
            isLiked={likedIds.has(currentTrack.id)}
            onLyricsOffsetChange={setLyricsOffset}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
            onSeek={handleSeek}
            onToggleShuffle={handleToggleShuffle}
            onToggleRepeat={handleToggleRepeat}
            onToggleLike={handleToggleLike}
            onBack={() => setPlayerExpanded(false)}
          />
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
