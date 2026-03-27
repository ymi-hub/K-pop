import React, { useEffect, useRef, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { colors, borderRadius } from '../theme';
import { Track } from '../types';
import Icon from './Icon';

export const MINI_PLAYER_H = 66; // paddingVertical(10×2) + art(46)
import { ytGetCurrentTime, ytGetDuration } from '../services/youtubePlayer';

const { width } = Dimensions.get('window');

interface Props {
  track: Track;
  isPlaying: boolean;
  onPress: () => void;
  onPlayPause: () => void;
  onNext: () => void;
}

// 진행 바만 별도 컴포넌트 — 1초마다 DOM을 직접 업데이트해서 MiniPlayer re-render 없음
const ProgressBar = memo(function ProgressBar({ isPlaying }: { isPlaying: boolean }) {
  const fillRef = useRef<View>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPlaying) return;
    timerRef.current = setInterval(() => {
      const cur = ytGetCurrentTime();
      const dur = ytGetDuration();
      const pct = dur > 0 ? (cur / dur) * 100 : 0;
      // setNativeProps로 state 없이 직접 업데이트
      (fillRef.current as any)?.setNativeProps?.({ style: { width: `${pct}%` } });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  return (
    <View style={styles.progressTrack}>
      <View ref={fillRef} style={styles.progressFill} />
    </View>
  );
});

function MiniPlayer({ track, isPlaying, onPress, onPlayPause, onNext }: Props) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.92}
      >
        <BlurView intensity={80} tint="dark" style={styles.blur}>
          <Image source={{ uri: track.albumArt }} style={styles.art} contentFit="cover" />

          <View style={styles.info}>
            <Text style={styles.songName} numberOfLines={1}>{track.name}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{track.artists.join(', ')}</Text>
          </View>

          <TouchableOpacity
            onPress={onPlayPause}
            style={styles.ctrlBtn}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onNext}
            style={styles.ctrlBtn}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Icon name="forward" size={26} color="#fff" />
          </TouchableOpacity>
        </BlurView>

        <ProgressBar isPlaying={isPlaying} />
      </TouchableOpacity>
    </View>
  );
}

export default memo(MiniPlayer);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 8,
    left: 8, right: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 16,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  art: {
    width: 46, height: 46,
    borderRadius: 8,
  },
  info: { flex: 1, marginHorizontal: 4 },
  songName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  artistName: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  ctrlBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    width: '0%',
  },
});
