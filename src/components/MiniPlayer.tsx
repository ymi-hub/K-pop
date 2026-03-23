import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../theme';
import { Track } from '../types';

const { width } = Dimensions.get('window');

interface Props {
  track: Track;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onPress: () => void;
  onPlayPause: () => void;
  onNext: () => void;
}

export default function MiniPlayer({
  track, isPlaying, currentMs, durationMs, onPress, onPlayPause, onNext,
}: Props) {
  const progress = durationMs > 0 ? currentMs / durationMs : 0;

  return (
    <View style={styles.container}>
      {/* Thin progress bar at very top */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <TouchableOpacity style={styles.mainArea} onPress={onPress} activeOpacity={0.85}>
          {/* Album art */}
          <Image source={{ uri: track.albumArt }} style={styles.art} contentFit="cover" />

          {/* Song info */}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{track.name}</Text>
            <Text style={styles.artist} numberOfLines={1}>{track.artists.join(', ')}</Text>
          </View>
        </TouchableOpacity>

        {/* Controls */}
        <TouchableOpacity onPress={onPlayPause} style={styles.controlBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play-sharp'}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} style={styles.controlBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="play-skip-forward" size={26} color="#fff" />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  blur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  info: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  controlBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
