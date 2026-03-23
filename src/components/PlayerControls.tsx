import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

interface Props {
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (ms: number) => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PlayerControls({
  isPlaying,
  currentMs,
  durationMs,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
}: Props) {
  return (
    <View style={styles.container}>
      {/* 슬라이더 */}
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={durationMs}
        value={currentMs}
        onSlidingComplete={onSeek}
        minimumTrackTintColor={colors.text}
        maximumTrackTintColor="rgba(255,255,255,0.3)"
        thumbTintColor={colors.text}
      />
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentMs)}</Text>
        <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
      </View>

      {/* 컨트롤 버튼 */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrev}>
          <Ionicons name="play-skip-back" size={36} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onPlayPause} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={72}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext}>
          <Ionicons name="play-skip-forward" size={36} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    marginBottom: spacing.md,
  },
  timeText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  playButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
