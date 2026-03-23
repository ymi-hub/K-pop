import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { Track, LyricLine, VocabEntry } from '../types';
import VocabCard from '../components/VocabCard';
import PlayerControls from '../components/PlayerControls';
import LyricsView from '../components/LyricsView';

const { width, height } = Dimensions.get('window');

interface Props {
  track: Track;
  lyrics: LyricLine[];
  isPlaying: boolean;
  currentMs: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (ms: number) => void;
}

export default function PlayerScreen({
  track,
  lyrics,
  isPlaying,
  currentMs,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
}: Props) {
  const [activeVocab, setActiveVocab] = useState<VocabEntry | null>(null);

  // 현재 재생 위치에 맞는 가사 라인 찾기
  const currentLineIndex = lyrics.findIndex(
    (line) => currentMs >= line.startMs && currentMs < line.endMs
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 배경 - 앨범아트 블러 */}
      <Image
        source={{ uri: track.albumArt }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <BlurView intensity={90} style={StyleSheet.absoluteFillObject} tint="dark" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', '#000000']}
        style={StyleSheet.absoluteFillObject}
        locations={[0.3, 0.6, 1]}
      />

      {/* 앨범 아트 */}
      <View style={styles.albumArtContainer}>
        <Image
          source={{ uri: track.albumArt }}
          style={styles.albumArt}
          contentFit="cover"
        />
      </View>

      {/* 곡 정보 */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackName}>{track.name}</Text>
        <Text style={styles.artistName}>{track.artists.join(', ')}</Text>
      </View>

      {/* 가사 뷰 */}
      <LyricsView
        lyrics={lyrics}
        currentLineIndex={currentLineIndex}
        currentMs={currentMs}
        onWordPress={setActiveVocab}
      />

      {/* 영어 단어 뜻 카드 */}
      {activeVocab && (
        <VocabCard vocab={activeVocab} onClose={() => setActiveVocab(null)} />
      )}

      {/* 플레이어 컨트롤 */}
      <PlayerControls
        isPlaying={isPlaying}
        currentMs={currentMs}
        durationMs={track.durationMs}
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrev={onPrev}
        onSeek={onSeek}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  albumArtContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  albumArt: {
    width: width - spacing.xl * 2,
    height: width - spacing.xl * 2,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  trackInfo: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  trackName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
