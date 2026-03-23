import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors, spacing, borderRadius } from '../theme';
import { Track, LyricLine, VocabEntry } from '../types';
import VocabCard from '../components/VocabCard';
import LyricsView from '../components/LyricsView';
import { ytSetVolume } from '../services/youtubePlayer';

const { width } = Dimensions.get('window');
const ALBUM_ART_SIZE = width - 72;
const OFFSET_STEP = 500;

type RepeatMode = 'off' | 'one' | 'all';

interface Props {
  track: Track;
  lyrics: LyricLine[];
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  lyricsOffset: number;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  onLyricsOffsetChange: (offset: number) => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (ms: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onBack: () => void;
}

function formatTime(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlayerScreen({
  track, lyrics, isPlaying, currentMs, durationMs,
  lyricsOffset, shuffleMode, repeatMode, isLiked,
  onLyricsOffsetChange, onPlayPause, onNext, onPrev, onSeek,
  onToggleShuffle, onToggleRepeat, onToggleLike, onBack,
}: Props) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeVocab, setActiveVocab] = useState<VocabEntry | null>(null);
  const [volume, setVolume] = useState(80);
  const [showRemaining, setShowRemaining] = useState(true);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isPlaying ? 1.0 : 0.9,
      tension: 55, friction: 12, useNativeDriver: true,
    }).start();
  }, [isPlaying]);

  // when lyrics become available, don't auto-show; let user toggle
  const hasLyrics = lyrics.length > 0;

  const adjustedMs = currentMs + lyricsOffset;
  const currentLineIndex = (() => {
    if (!hasLyrics || adjustedMs <= 0) return -1;
    return lyrics.findIndex((l) => adjustedMs >= l.startMs && adjustedMs < l.endMs);
  })();

  const offsetLabel = lyricsOffset === 0
    ? '싱크'
    : lyricsOffset > 0 ? `+${lyricsOffset / 1000}s` : `${lyricsOffset / 1000}s`;

  const rightTime = showRemaining && durationMs > 0
    ? `-${formatTime(durationMs - currentMs)}`
    : formatTime(durationMs);

  // Shared bottom controls block
  const ControlsBlock = () => (
    <View style={styles.controlsArea}>
      {/* Progress */}
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={durationMs || 1}
        value={currentMs}
        onSlidingComplete={onSeek}
        minimumTrackTintColor="rgba(255,255,255,0.9)"
        maximumTrackTintColor="rgba(255,255,255,0.25)"
        thumbTintColor="#fff"
      />
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentMs)}</Text>
        <TouchableOpacity onPress={() => setShowRemaining((r) => !r)}>
          <Text style={styles.timeText}>{rightTime}</Text>
        </TouchableOpacity>
      </View>

      {/* Main controls: shuffle / prev / play / next / repeat */}
      <View style={styles.mainControls}>
        <TouchableOpacity onPress={onToggleShuffle} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.sideBtn}>
          <Ionicons name="shuffle" size={24} color={shuffleMode ? colors.primary : 'rgba(255,255,255,0.65)'} />
          {shuffleMode && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={onPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="play-skip-back" size={38} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onPlayPause} style={styles.playBtn}>
          <Ionicons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={74}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="play-skip-forward" size={38} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onToggleRepeat} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.sideBtn}>
          <Ionicons
            name={repeatMode === 'one' ? 'repeat' : 'repeat'}
            size={24}
            color={repeatMode !== 'off' ? colors.primary : 'rgba(255,255,255,0.65)'}
          />
          {repeatMode === 'one' && <Text style={styles.repeatOneLabel}>1</Text>}
          {repeatMode !== 'off' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* Volume */}
      <View style={styles.volumeRow}>
        <Ionicons name="volume-low" size={18} color="rgba(255,255,255,0.45)" />
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={100}
          value={volume}
          onValueChange={(v) => { setVolume(v); ytSetVolume(v); }}
          minimumTrackTintColor="rgba(255,255,255,0.4)"
          maximumTrackTintColor="rgba(255,255,255,0.15)"
          thumbTintColor="rgba(255,255,255,0.6)"
        />
        <Ionicons name="volume-high" size={18} color="rgba(255,255,255,0.45)" />
      </View>

      {/* Bottom row: sync + lyrics toggle */}
      <View style={styles.bottomRow}>
        {hasLyrics ? (
          <View style={styles.syncRow}>
            <TouchableOpacity style={styles.syncBtn} onPress={() => onLyricsOffsetChange(lyricsOffset - OFFSET_STEP)}>
              <Ionicons name="remove" size={13} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.syncLabel} onPress={() => onLyricsOffsetChange(0)}>
              <Text style={[styles.syncText, lyricsOffset !== 0 && { color: colors.primary }]}>
                {offsetLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.syncBtn} onPress={() => onLyricsOffsetChange(lyricsOffset + OFFSET_STEP)}>
              <Ionicons name="add" size={13} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        ) : <View />}

        {hasLyrics ? (
          <TouchableOpacity
            style={[styles.lyricsToggleBtn, showLyrics && styles.lyricsToggleBtnActive]}
            onPress={() => setShowLyrics((v) => !v)}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={20}
              color={showLyrics ? colors.primary : 'rgba(255,255,255,0.55)'}
            />
            <Text style={[styles.lyricsToggleText, showLyrics && { color: colors.primary }]}>
              가사
            </Text>
          </TouchableOpacity>
        ) : <View />}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Blurred album art background */}
      <Image source={{ uri: track.albumArt }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <BlurView intensity={95} style={StyleSheet.absoluteFillObject} tint="dark" />
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.93)']}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.38, 1]}
      />

      {showLyrics && hasLyrics ? (
        /* ── LYRICS MODE ─────────────────────────────── */
        <>
          <View style={styles.lyricsHeader}>
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.lyricsHeaderCenter} activeOpacity={0.7} onPress={() => setShowLyrics(false)}>
              <Image source={{ uri: track.albumArt }} style={styles.lyricsThumb} contentFit="cover" />
              <View style={styles.lyricsHeaderInfo}>
                <Text style={styles.lyricsHeaderTitle} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.lyricsHeaderArtist} numberOfLines={1}>{track.artists.join(', ')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lyricsActiveBtn}
              onPress={() => setShowLyrics(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.lyricsArea}>
            <LyricsView
              lyrics={lyrics}
              currentLineIndex={currentLineIndex}
              currentMs={adjustedMs}
              onWordPress={setActiveVocab}
            />
          </View>

          <ControlsBlock />
        </>
      ) : (
        /* ── ALBUM ART MODE ──────────────────────────── */
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>지금 재생 중</Text>
            <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Album art – scales with playback state */}
          <View style={styles.albumSection}>
            <Animated.View style={[styles.albumShadow, { transform: [{ scale: scaleAnim }] }]}>
              <Image source={{ uri: track.albumArt }} style={styles.albumArt} contentFit="cover" />
            </Animated.View>
          </View>

          {/* Song name + heart */}
          <View style={styles.songInfoArea}>
            <View style={styles.songInfoRow}>
              <View style={styles.songTexts}>
                <Text style={styles.songName} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{track.artists.join(', ')}</Text>
              </View>
              <TouchableOpacity onPress={onToggleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isLiked ? colors.primary : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ControlsBlock />
        </>
      )}

      {activeVocab && (
        <VocabCard vocab={activeVocab} songName={track.name} onClose={() => setActiveVocab(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  /* ── Album art ── */
  albumSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  albumShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.65,
    shadowRadius: 32,
    elevation: 20,
    borderRadius: 12,
  },
  albumArt: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    borderRadius: 12,
  },

  /* ── Song info ── */
  songInfoArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  songInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  songTexts: { flex: 1 },
  songName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },

  /* ── Controls ── */
  controlsArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  slider: { width: '100%', height: 32 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    marginBottom: 18,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  sideBtn: { alignItems: 'center', width: 36 },
  playBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  activeDot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  repeatOneLabel: {
    position: 'absolute',
    top: -2, right: -2,
    fontSize: 8, fontWeight: '800',
    color: colors.primary,
  },

  /* Volume */
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  volumeSlider: { flex: 1, height: 24 },

  /* Bottom row */
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  syncBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  syncLabel: {
    paddingHorizontal: 4,
    height: 28,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  lyricsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  lyricsToggleBtnActive: { backgroundColor: 'rgba(252,60,68,0.15)' },
  lyricsToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },

  /* ── Lyrics mode header ── */
  lyricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 12,
  },
  lyricsHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lyricsThumb: { width: 44, height: 44, borderRadius: 8 },
  lyricsHeaderInfo: { flex: 1 },
  lyricsHeaderTitle: {
    fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2,
  },
  lyricsHeaderArtist: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)',
  },
  lyricsActiveBtn: {
    padding: 6,
    backgroundColor: 'rgba(252,60,68,0.15)',
    borderRadius: borderRadius.full,
  },
  lyricsArea: { flex: 1, overflow: 'hidden' },
});
