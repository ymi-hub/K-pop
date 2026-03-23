import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import { Track, LyricLine } from './src/types';
import { colors } from './src/theme';

type Screen = 'home' | 'player';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  const handleSelectTrack = (track: Track) => {
    setCurrentTrack(track);
    setScreen('player');
    setIsPlaying(true);
    setCurrentMs(0);
    // TODO: 가사 로드 및 Spotify 재생 시작
  };

  if (screen === 'player' && currentTrack) {
    return (
      <SafeAreaProvider>
        {/* 뒤로가기 */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('home')}
        >
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>

        <PlayerScreen
          track={currentTrack}
          lyrics={lyrics}
          isPlaying={isPlaying}
          currentMs={currentMs}
          onPlayPause={() => setIsPlaying((p) => !p)}
          onNext={() => {/* TODO */}}
          onPrev={() => {/* TODO */}}
          onSeek={(ms) => setCurrentMs(ms)}
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
        onSelectTrack={handleSelectTrack}
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
