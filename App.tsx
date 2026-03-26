import React, { useState, useEffect, useRef, Component, useCallback, memo } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import VocabListScreen from './src/screens/VocabListScreen';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SearchScreen from './src/screens/SearchScreen';
import QuizScreen from './src/screens/QuizScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import { loadPlaylist, getCachedLyrics } from './src/services/playlistStorage';
import MiniPlayer from './src/components/MiniPlayer';
import TabBar, { TabId, TAB_BAR_H } from './src/components/TabBar';
import { Track, LyricLine } from './src/types';
import { getLyrics } from './src/services/lyrics';
import {
  initYouTubeAPI, createYTPlayer, ytLoadVideo,
  ytPlay, ytPause, ytSeek, ytGetCurrentTime, ytGetDuration, YT_STATE,
} from './src/services/youtubePlayer';
import { searchYouTube } from './src/services/youtubeSearch';
import { getBTSTracks, ytCache } from './src/data/btsSongs';

type Screen = 'home' | 'player';
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
  const [ytReady, setYtReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try { return !localStorage.getItem('kpop_visited'); } catch { return false; }
  });
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistCount, setPlaylistCount] = useState(() => loadPlaylist().length);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef({ currentIndex, playOrder, tracks, repeatMode });
  const handleEndedRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef(false);

  const log = (msg: string) => setInitLog(prev => [...prev.slice(-8), msg]);

  // 트랙 로드
  useEffect(() => {
    try {
      log('Loading tracks...');
      const t = getBTSTracks();
      setTracks(t);
      setPlayOrder(t.map((_, i) => i));
      log(`Tracks loaded: ${t.length}`);
    } catch (e: any) {
      log(`Track load ERROR: ${e?.message}`);
    }
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
        if (mode === 'all') selectByIdx(order[0]);
        else setIsPlaying(false);
      } else {
        selectByIdx(order[next]);
      }
    };
  });

  // YouTube 초기화
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    log('Initializing YouTube...');
    initYouTubeAPI()
      .then(() => {
        log('YT API ready, creating player...');
        return createYTPlayer((state) => {
          if (state === YT_STATE.PLAYING) {
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
      .then(() => { log('YT player ready'); setYtReady(true); })
      .catch((e: any) => log(`YT init ERROR: ${e?.message}`));
  }, []);

  // PlayerScreen이 열려있을 때만 타이머 가동 (MiniPlayer는 자체 타이머 보유)
  useEffect(() => {
    if (!isPlaying || screen !== 'player') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      const ms = ytGetCurrentTime();
      setCurrentMs(prev => (Math.abs(ms - prev) > 300 ? ms : prev));
      const d = ytGetDuration();
      if (d > 0) setDurationMs(prev => (d !== prev ? d : prev));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, screen]);

  const selectByIdx = async (idx: number) => {
    const track = stateRef.current.tracks[idx];
    if (!track) return;
    setCurrentTrack(track);
    setRecentTracks(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 15);
    });
    setCurrentIndex(idx);
    setScreen('player');
    setIsPlaying(false);
    setCurrentMs(0);
    setDurationMs(track.durationMs);
    setLyricsOffset(0);
    getLyrics(track.name, track.artists[0]).then(setLyrics).catch(() => setLyrics([]));
    if (Platform.OS !== 'web' || !ytReady) return;
    const cached = ytCache.get(track.id);
    if (cached) { updateArt(idx, cached.thumbnail); ytLoadVideo(cached.videoId); return; }
    const result = await searchYouTube(track.name, track.artists[0]);
    if (result) { ytCache.set(track.id, result); updateArt(idx, result.thumbnail); ytLoadVideo(result.videoId); }
  };

  const updateArt = (idx: number, thumb: string) => {
    setTracks(prev => { const n = [...prev]; n[idx] = { ...n[idx], albumArt: thumb }; return n; });
    setCurrentTrack(prev => prev ? { ...prev, albumArt: thumb } : prev);
  };

  const handleSelectTrack = useCallback((track: Track) => {
    const idx = tracks.findIndex(t => t.id === track.id);
    if (idx !== -1) selectByIdx(idx);
  }, [tracks]);

  // 외부(Deezer 검색) 트랙 포함 범용 재생 핸들러
  const handleSelectAnyTrack = useCallback(async (track: Track) => {
    const idx = tracks.findIndex(t => t.id === track.id);
    if (idx !== -1) { selectByIdx(idx); return; }

    // 외부 트랙
    setCurrentTrack(track);
    setRecentTracks(prev => [track, ...prev.filter(t => t.id !== track.id)].slice(0, 15));
    setScreen('player');
    setIsPlaying(false);
    setCurrentMs(0);
    setDurationMs(track.durationMs || 0);
    setLyricsOffset(0);

    // 가사: 캐시 → 실시간 조회
    const cachedLyrics = getCachedLyrics(track.id);
    if (cachedLyrics) {
      try { setLyrics(JSON.parse(cachedLyrics)); } catch { setLyrics([]); }
    } else {
      getLyrics(track.name, track.artists[0]).then(setLyrics).catch(() => setLyrics([]));
    }

    if (Platform.OS !== 'web' || !ytReady) return;

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
  }, [tracks, ytReady]);

  const handlePlayPause = useCallback(() => {
    if (isPlayingRef.current) { ytPause(); setIsPlaying(false); }
    else { ytPlay(); setIsPlaying(true); }
  }, []);

  const handleNext = useCallback(() => {
    const { currentIndex: idx, playOrder: order, repeatMode: mode } = stateRef.current;
    if (mode === 'one') { ytSeek(0); ytPlay(); return; }
    selectByIdx(order[(order.indexOf(idx) + 1) % order.length]);
  }, []);

  const handlePrev = useCallback(() => {
    const ms = ytGetCurrentTime();
    if (ms > 3000) { ytSeek(0); return; }
    const { currentIndex: idx, playOrder: order } = stateRef.current;
    selectByIdx(order[(order.indexOf(idx) - 1 + order.length) % order.length]);
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

  const handleToggleLike = useCallback((trackId?: string) => {
    const id = typeof trackId === 'string' ? trackId : currentTrack?.id;
    if (!id) return;
    setLikedIds(prev => {
      let next: Set<string>;
      if (prev.has(id)) {
        next = new Set([...prev].filter(x => x !== id));
      } else {
        next = new Set([id, ...prev]); // 최신 항목 맨 앞
      }
      try { localStorage.setItem('kpop_liked_ids', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [currentTrack?.id]);

  const handlePlaylistChange = useCallback(() => setPlaylistCount(loadPlaylist().length), []);
  const handleVocabPress = useCallback(() => setActiveTab('vocab'), []);
  const handleOpenQuiz = useCallback(() => setActiveTab('quiz'), []);
  const handleOpenPlaylist = useCallback(() => setShowPlaylist(true), []);
  const handleClosePlaylist = useCallback(() => setShowPlaylist(false), []);
  const handleOpenPlayer = useCallback(() => setScreen('player'), []);
  const handleBackToHome = useCallback(() => setScreen('home'), []);
  const handleTabHome = useCallback(() => setActiveTab('home'), []);
  const handleOpenLibrary = useCallback(() => setActiveTab('library'), []);

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

  if (screen === 'player' && currentTrack) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider initialMetrics={SAFE_AREA_INITIAL}>
          <PlayerScreen
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
            onBack={handleBackToHome}
          />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={SAFE_AREA_INITIAL}>
        {activeTab === 'vocab' ? (
          <VocabListScreen uid={null} tracks={tracks} onBack={handleTabHome} onQuizPress={handleOpenQuiz} />
        ) : activeTab === 'settings' ? (
          <SettingsScreen onBack={handleTabHome} />
        ) : activeTab === 'search' ? (
          <SearchScreen
            onPlayTrack={handleSelectAnyTrack}
            onPlaylistChange={handlePlaylistChange}
          />
        ) : activeTab === 'quiz' ? (
          <QuizScreen onBack={handleTabHome} hasMiniPlayer={!!currentTrack} />
        ) : (
          <HomeScreen
            activeTab={activeTab}
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedIds={likedIds}
            recentTracks={recentTracks}
            onSelectTrack={handleSelectAnyTrack}
            onToggleLike={handleToggleLike}
            onVocabPress={handleVocabPress}
            playlistCount={playlistCount}
            onOpenPlaylist={handleOpenPlaylist}
            onOpenLibrary={handleOpenLibrary}
          />
        )}
        {showPlaylist && (
          <PlaylistScreen
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onSelectTrack={handleSelectAnyTrack}
            onBack={handleClosePlaylist}
            onPlaylistChange={handlePlaylistChange}
          />
        )}
        {currentTrack && (
          <MiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            onPress={handleOpenPlayer}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
          />
        )}
        <TabBar active={activeTab} onChange={setActiveTab} />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
