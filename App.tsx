import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import LoginScreen from './src/screens/LoginScreen';
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

type Screen = 'login' | 'home' | 'player' | 'vocab';
type RepeatMode = 'off' | 'one' | 'all';

function loadLiked(): Set<string> {
  try {
    const s = localStorage.getItem('kpop_liked');
    return s ? new Set(JSON.parse(s)) : new Set();
  } catch { return new Set(); }
}
function saveLiked(set: Set<string>) {
  try { localStorage.setItem('kpop_liked', JSON.stringify([...set])); } catch {}
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(true); // 즉시 렌더링, 폰트는 백그라운드 로드
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

  // Apple Music features
  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [likedTracks, setLikedTracks] = useState<Set<string>>(loadLiked);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const ytReadyRef = useRef(false);
  const currentTrackRef = useRef<Track | null>(null);
  const shuffleModeRef = useRef(false);
  const repeatModeRef = useRef<RepeatMode>('off');

  // 앱 시작 시 자동 트랙 로드
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

  useEffect(() => {
    // CSS @font-face 직접 주입 — Font.loadAsync보다 안정적
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

              // YouTube 실제 길이로 가사 재시도 (더 정확한 버전 매칭)
              if (Math.abs(diffMs) > 1000) {
                const newLyrics = await getLyrics(track.name, track.artists[0], dur);
                if (newLyrics.length > 0) {
                  // 새 가사를 찾았으면 오프셋 초기화
                  setLyrics(newLyrics);
                  setLyricsOffset(0);
                  return;
                }
                // 못 찾으면 전주 길이만큼 오프셋 보정 (전주가 더 길면 음수 → 가사 늦게)
                if (diffMs > 1000 && diffMs < 30000) setLyricsOffset(-diffMs);
              }
            }, 800);
          } else if (state === YT_STATE.PAUSED) {
            setIsPlaying(false);
          } else if (state === YT_STATE.ENDED) {
            setIsPlaying(false);
            if (repeatModeRef.current === 'one') {
              ytSeek(0); ytPlay(); return;
            }
            const nextIdx = getNextIndex(currentIndexRef.current);
            if (tracksRef.current[nextIdx]) playTrack(tracksRef.current[nextIdx], nextIdx);
          }
        });
        ytReadyRef.current = true;
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
        if (t.length === 0) {
          setLoadError('곡을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setLoadError(null);
          setTracks(t);
        }
      })
      .catch((e) => setLoadError(`오류: ${e.message ?? e}`));
  };

  const handleNext = useCallback(() => {
    if (repeatModeRef.current === 'one') { ytSeek(0); ytPlay(); return; }
    const nextIdx = getNextIndex(currentIndexRef.current);
    if (tracksRef.current[nextIdx]) playTrack(tracksRef.current[nextIdx], nextIdx);
  }, []);

  const handlePrev = useCallback(() => {
    if (currentMs > 3000) {
      ytSeek(0); setCurrentMs(0);
    } else {
      const len = tracksRef.current.length;
      const prevIdx = (currentIndexRef.current - 1 + len) % len;
      if (tracksRef.current[prevIdx]) playTrack(tracksRef.current[prevIdx], prevIdx);
    }
  }, [currentMs]);

  const handlePlayPause = () => {
    if (isPlaying) { ytPause(); setIsPlaying(false); }
    else { ytPlay(); setIsPlaying(true); }
  };

  const handleToggleLike = (trackId: string) => {
    setLikedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      saveLiked(next);
      return next;
    });
  };

  const handleToggleRepeat = () => {
    setRepeatMode((m) => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off');
  };

  if (screen === 'login') return <LoginScreen onStart={loadTracks} />;

  if (screen === 'vocab') return (
    <SafeAreaProvider>
      <VocabListScreen onBack={() => setScreen('home')} />
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
      <HomeScreen
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentMs={currentMs}
        durationMs={durationMs}
        onSelectTrack={(track) => playTrack(track, tracks.indexOf(track))}
        onOpenPlayer={() => setScreen('player')}
        onVocabPress={() => setScreen('vocab')}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        loadError={loadError}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});
