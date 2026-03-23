import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import LoginScreen from './src/screens/LoginScreen';
import { Track, LyricLine } from './src/types';
import { colors } from './src/theme';
import { getStoredToken, handleSpotifyCallback } from './src/services/spotifyAuth';
import { getBTSAllTracks } from './src/services/spotify';
import { getLyrics } from './src/services/lyrics';

type Screen = 'login' | 'home' | 'player';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [token, setToken] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 앱 시작 시 토큰 확인 및 OAuth 콜백 처리
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Spotify OAuth 콜백 처리
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleSpotifyCallback(code).then((t) => {
        if (t) {
          setToken(t);
          setScreen('home');
          window.history.replaceState({}, '', '/');
        }
      });
      return;
    }

    // 저장된 토큰 확인
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      setScreen('home');
    }
  }, []);

  // 토큰 있으면 BTS 곡 로드
  useEffect(() => {
    if (!token) return;
    getBTSAllTracks(token).then((t) => setTracks(t)).catch(console.error);
  }, [token]);

  // 재생 타이머
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentMs((ms) => ms + 250);
      }, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const handleSelectTrack = async (track: Track, index: number) => {
    setCurrentTrack(track);
    setCurrentIndex(index);
    setScreen('player');
    setIsPlaying(false);
    setCurrentMs(0);

    // 가사 로드
    const l = await getLyrics(track.name, track.artists[0]);
    setLyrics(l);

    // 미리듣기 재생 (30초)
    if (track.previewUrl && Platform.OS === 'web') {
      if (playerRef.current) playerRef.current.pause();
      const audio = new Audio(track.previewUrl);
      playerRef.current = audio;
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
      audio.ontimeupdate = () => setCurrentMs(Math.round(audio.currentTime * 1000));
      audio.onended = () => { setIsPlaying(false); handleNext(index); };
    }
  };

  const handleNext = (idx?: number) => {
    const nextIdx = ((idx ?? currentIndex) + 1) % tracks.length;
    if (tracks[nextIdx]) handleSelectTrack(tracks[nextIdx], nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + tracks.length) % tracks.length;
    if (tracks[prevIdx]) handleSelectTrack(tracks[prevIdx], prevIdx);
  };

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) { playerRef.current.pause(); setIsPlaying(false); }
      else { playerRef.current.play(); setIsPlaying(true); }
    }
  };

  if (screen === 'login') return <LoginScreen />;

  if (screen === 'player' && currentTrack) {
    return (
      <SafeAreaProvider>
        <TouchableOpacity style={styles.backButton} onPress={() => setScreen('home')}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <PlayerScreen
          track={currentTrack}
          lyrics={lyrics}
          isPlaying={isPlaying}
          currentMs={currentMs}
          onPlayPause={handlePlayPause}
          onNext={() => handleNext()}
          onPrev={handlePrev}
          onSeek={(ms) => {
            setCurrentMs(ms);
            if (playerRef.current) playerRef.current.currentTime = ms / 1000;
          }}
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
        onSelectTrack={(track) => handleSelectTrack(track, tracks.indexOf(track))}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
