import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
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
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 앱 시작 시 토큰 확인 및 OAuth 콜백 처리
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 웹 환경에서 OAuth 콜백 처리
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            const t = await handleSpotifyCallback(code);
            if (t) {
              setToken(t);
              setScreen('home');
              window.history.replaceState({}, '', '/');
            }
            return;
          }
        }

        // 저장된 토큰 확인
        const stored = await getStoredToken();
        if (stored) {
          setToken(stored);
          setScreen('home');
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // 토큰 있으면 BTS 곡 로드
  useEffect(() => {
    if (!token) return;
    getBTSAllTracks(token).then((t) => setTracks(t)).catch(console.error);
  }, [token]);

  // 재생 상태 동기화 (데이터 포맷팅/UI 업데이트용)
  // expo-av의 onPlaybackStatusUpdate로 시간 업데이트됨
  // 이것은 보조 역할만 함
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      timerRef.current = setInterval(() => {
        setCurrentMs((ms) => ms + 500);
      }, 500);
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

    // 기존 소리 정지
    if (playerRef.current) {
      try {
        await playerRef.current.unloadAsync();
      } catch (error) {
        console.error('Error unloading previous audio:', error);
      }
    }

    // 가사 로드
    try {
      const l = await getLyrics(track.name, track.artists[0]);
      setLyrics(l);
    } catch (error) {
      console.error('Error loading lyrics:', error);
      setLyrics([]);
    }

    // 미리듣기 재생 (30초) - Spotify API 제한
    if (track.previewUrl) {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: track.previewUrl },  // ← 30초 미리듣기 URL
          { shouldPlay: false }
        );

        playerRef.current = sound;

        // 현재 시간 업데이트 리스너
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('isLoaded' in status && status.isLoaded) {
            if (!status.didJustFinish) {
              setCurrentMs(Math.round(status.positionMillis || 0));
            } else {
              setIsPlaying(false);
              handleNext(index);
            }
          }
        });

        // 재생 시작
        await sound.playAsync();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing preview:', error);
        setLyrics([]);
      }
    } else {
      // 전곡 재생을 위한 Spotify Web Playback SDK 통합 필요
      console.log('전곡 재생을 위해서는 Spotify Premium 계정과 Web Playback SDK가 필요합니다');
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

  const handlePlayPause = async () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        await playerRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await playerRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  if (screen === 'login') return <LoginScreen />;

  if (isLoading && !token) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <Ionicons name="musical-note" size={48} color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 16, fontSize: 16 }}>앱 초기화 중...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

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
          onSeek={async (ms) => {
            setCurrentMs(ms);
            if (playerRef.current) {
              try {
                await playerRef.current.setPositionAsync(ms);
              } catch (error) {
                console.error('Error seeking:', error);
              }
            }
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
        isLoading={isLoading}
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
