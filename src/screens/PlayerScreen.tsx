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
import { colors, spacing, borderRadius } from '../theme';
import { Track, LyricLine, VocabEntry } from '../types';
import VocabCard from '../components/VocabCard';
import LyricsView from '../components/LyricsView';

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

// 웹 전용 프로그레스 슬라이더
function ProgressSlider({ value, max, onComplete }: { value: number; max: number; onComplete: (v: number) => void }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="range"
        min={0}
        max={max || 1}
        value={value}
        onChange={(e) => onComplete(Number((e.target as HTMLInputElement).value))}
        style={{
          width: '100%',
          accentColor: '#fff',
          cursor: 'pointer',
          height: 4,
        } as any}
      />
    );
  }
  return (
    <Slider
      style={{ width: '100%', height: 32 }}
      minimumValue={0}
      maximumValue={max || 1}
      value={value}
      onSlidingComplete={onComplete}
      minimumTrackTintColor="rgba(255,255,255,0.9)"
      maximumTrackTintColor="rgba(255,255,255,0.25)"
      thumbTintColor="#fff"
    />
  );
}

// 배경 (BlurView+Gradient)은 track이 바뀔 때만 리렌더 — currentMs 500ms 타이머와 무관
const PlayerBackground = React.memo(({ uri }: { uri: string }) => (
  <>
    <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
    <BlurView intensity={95} style={StyleSheet.absoluteFillObject} tint="dark" />
    <LinearGradient
      colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.93)']}
      style={StyleSheet.absoluteFillObject}
      locations={[0, 0.38, 1]}
    />
  </>
));

export default function PlayerScreen({
  track, lyrics, isPlaying, currentMs, durationMs,
  lyricsOffset, shuffleMode, repeatMode, isLiked,
  onLyricsOffsetChange, onPlayPause, onNext, onPrev, onSeek,
  onToggleShuffle, onToggleRepeat, onToggleLike, onBack,
}: Props) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeVocab, setActiveVocab] = useState<VocabEntry | null>(null);
  const [showRemaining, setShowRemaining] = useState(true);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isPlaying ? 1.0 : 0.9,
      tension: 55, friction: 12, useNativeDriver: true,
    }).start();
  }, [isPlaying]);

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

  const repeatIcon = repeatMode === 'one' ? '↻¹' : '↻';
  const repeatColor = repeatMode !== 'off' ? colors.primary : 'rgba(255,255,255,0.65)';

  const ControlsBlock = () => (
    <View style={styles.controlsArea}>
      {/* Progress */}
      <View style={styles.sliderWrapper}>
        <ProgressSlider value={currentMs} max={durationMs} onComplete={onSeek} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentMs)}</Text>
        <TouchableOpacity onPress={() => setShowRemaining((r) => !r)}>
          <Text style={styles.timeText}>{rightTime}</Text>
        </TouchableOpacity>
      </View>

      {/* Main controls */}
      <View style={styles.mainControls}>
        {/* Shuffle */}
        <TouchableOpacity onPress={onToggleShuffle} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.sideBtn}>
          <Text style={[styles.sideBtnIcon, shuffleMode && { color: colors.primary }]}>⇌</Text>
          {shuffleMode && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* Prev */}
        <TouchableOpacity onPress={onPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipIcon}>⏮</Text>
        </TouchableOpacity>

        {/* Play / Pause */}
        <TouchableOpacity onPress={onPlayPause} style={styles.playBtnOuter}>
          <View style={styles.playBtnCircle}>
            <Text style={styles.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </View>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity onPress={onNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipIcon}>⏭</Text>
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity onPress={onToggleRepeat} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.sideBtn}>
          <Text style={[styles.sideBtnIcon, { color: repeatColor }]}>{repeatIcon}</Text>
          {repeatMode !== 'off' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* Bottom row: sync + lyrics toggle */}
      <View style={styles.bottomRow}>
        {hasLyrics ? (
          <View style={styles.syncRow}>
            <TouchableOpacity style={styles.syncBtn} onPress={() => onLyricsOffsetChange(lyricsOffset - OFFSET_STEP)}>
              <Text style={styles.syncBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.syncLabel} onPress={() => onLyricsOffsetChange(0)}>
              <Text style={[styles.syncText, lyricsOffset !== 0 && { color: colors.primary }]}>
                {offsetLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.syncBtn} onPress={() => onLyricsOffsetChange(lyricsOffset + OFFSET_STEP)}>
              <Text style={styles.syncBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : <View />}

        {hasLyrics ? (
          <TouchableOpacity
            style={[styles.lyricsToggleBtn, showLyrics && styles.lyricsToggleBtnActive]}
            onPress={() => setShowLyrics((v) => !v)}
          >
            <Text style={[styles.lyricsToggleIcon, showLyrics && { color: colors.primary }]}>💬</Text>
            <Text style={[styles.lyricsToggleText, showLyrics && { color: colors.primary }]}>가사</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <PlayerBackground uri={track.albumArt} />

      {showLyrics && hasLyrics ? (
        <>
          <View style={styles.lyricsHeader}>
            <TouchableOpacity onPress={onBack} style={styles.homeBtn}>
              <Text style={styles.homeBtnIcon}>⌂</Text>
              <Text style={styles.homeBtnText}>홈</Text>
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
              <Text style={styles.lyricsActiveBtnText}>닫기</Text>
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

          {ControlsBlock()}
        </>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.homeBtn}>
              <Text style={styles.homeBtnIcon}>⌂</Text>
              <Text style={styles.homeBtnText}>홈</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>지금 재생 중</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.albumSection}>
            <Animated.View style={[styles.albumShadow, { transform: [{ scale: scaleAnim }] }]}>
              <Image source={{ uri: track.albumArt }} style={styles.albumArt} contentFit="cover" />
            </Animated.View>
          </View>

          <View style={styles.songInfoArea}>
            <View style={styles.songInfoRow}>
              <View style={styles.songTexts}>
                <Text style={styles.songName} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{track.artists.join(', ')}</Text>
              </View>
              <TouchableOpacity onPress={onToggleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.heartIcon, isLiked && { color: colors.primary }]}>
                  {isLiked ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {ControlsBlock()}
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
    fontSize: 13, fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  homeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  homeBtnIcon: { fontSize: 18, color: '#fff' },
  homeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* ── Album art ── */
  albumSection: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36,
  },
  albumShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.65, shadowRadius: 32, elevation: 20, borderRadius: 12,
  },
  albumArt: { width: ALBUM_ART_SIZE, height: ALBUM_ART_SIZE, borderRadius: 12 },

  /* ── Song info ── */
  songInfoArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  songInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  songTexts: { flex: 1 },
  songName: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  artistName: { fontSize: 18, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  heartIcon: { fontSize: 28, color: '#fff' },

  /* ── Controls ── */
  controlsArea: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  sliderWrapper: { width: '100%', marginBottom: 0 },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 4, marginBottom: 18,
  },
  timeText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },

  mainControls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 22,
  },
  sideBtn: { alignItems: 'center', width: 36 },
  sideBtnIcon: { fontSize: 22, color: 'rgba(255,255,255,0.65)' },
  skipIcon: { fontSize: 34, color: '#fff' },

  /* Play button - white circle */
  playBtnOuter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  playBtnCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  playBtnIcon: { fontSize: 30, color: '#000', marginLeft: 4 },

  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary, marginTop: 3,
  },

  /* Bottom row */
  bottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  syncRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  syncBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  syncBtnText: { fontSize: 22, fontWeight: '300', color: '#fff', lineHeight: 28 },
  syncLabel: {
    paddingHorizontal: 10, height: 44, minWidth: 56,
    alignItems: 'center', justifyContent: 'center',
  },
  syncText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  lyricsToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  lyricsToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  lyricsToggleIcon: { fontSize: 18, color: '#fff' },
  lyricsToggleText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* ── Lyrics mode ── */
  lyricsHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    gap: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  lyricsHeaderCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  lyricsThumb: { width: 48, height: 48, borderRadius: 10 },
  lyricsHeaderInfo: { flex: 1 },
  lyricsHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  lyricsHeaderArtist: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  lyricsActiveBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  lyricsActiveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  lyricsArea: { flex: 1, overflow: 'hidden' },
});
