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

const { width, height } = Dimensions.get('window');
const ALBUM_ART_SIZE = Math.min(width - 72, height * 0.38);
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

function ProgressSlider({ value, max, onComplete }: { value: number; max: number; onComplete: (v: number) => void }) {
  return (
    <input
      type="range"
      min={0}
      max={max || 1}
      value={value}
      onChange={(e) => onComplete(Number((e.target as HTMLInputElement).value))}
      style={{ width: '100%', accentColor: '#fff', cursor: 'pointer', height: 4 } as any}
    />
  );
}

// 배경 — track 바뀔 때만 리렌더
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
  const repeatColor = repeatMode !== 'off' ? colors.primary : 'rgba(255,255,255,0.5)';

  // ── 하단 공통 컨트롤 블록 ────────────────────────────────
  const ControlsBlock = () => (
    <View style={styles.controlsArea}>
      {/* 프로그레스 */}
      <View style={styles.sliderWrapper}>
        <ProgressSlider value={currentMs} max={durationMs} onComplete={onSeek} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentMs)}</Text>
        <TouchableOpacity onPress={() => setShowRemaining((r) => !r)}>
          <Text style={styles.timeText}>{rightTime}</Text>
        </TouchableOpacity>
      </View>

      {/* 재생 컨트롤: Shuffle · Prev · Play · Next · Repeat */}
      <View style={styles.mainControls}>
        <TouchableOpacity onPress={onToggleShuffle} style={styles.sideBtn}>
          <Text style={[styles.sideBtnIcon, shuffleMode && { color: colors.primary }]}>⇌</Text>
          {shuffleMode && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={onPrev} style={styles.skipBtnOuter}>
          <View style={styles.skipBtnCircle}>
            <Text style={styles.skipBtnIcon}>⏮</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPlayPause} style={styles.playBtnOuter}>
          <View style={styles.playBtnCircle}>
            <Text style={styles.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.skipBtnOuter}>
          <View style={styles.skipBtnCircle}>
            <Text style={styles.skipBtnIcon}>⏭</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onToggleRepeat} style={styles.sideBtn}>
          <Text style={[styles.sideBtnIcon, { color: repeatColor }]}>{repeatIcon}</Text>
          {repeatMode !== 'off' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* ── 하단 바: 💬 가사 | 싱크 | ☰ 목록 ── */}
      <View style={styles.bottomBar}>
        {/* 왼쪽: 가사보기 — 항상 누를 수 있음 */}
        <TouchableOpacity
          style={styles.bottomBarBtn}
          onPress={() => setShowLyrics((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.bottomBarIconWrap, showLyrics && styles.bottomBarIconActive]}>
            <Text style={styles.bottomBarIconText}>💬</Text>
          </View>
          <Text style={[styles.bottomBarLabel, showLyrics && { color: colors.primary }]}>가사</Text>
        </TouchableOpacity>

        {/* 가운데: 싱크 — 항상 표시, 가사 없으면 흐리게 */}
        <View style={styles.bottomBarCenter}>
          <View style={[styles.syncRow, !hasLyrics && { opacity: 0.35 }]}>
            <TouchableOpacity style={styles.syncBtn} onPress={() => hasLyrics && onLyricsOffsetChange(lyricsOffset - OFFSET_STEP)}>
              <Text style={styles.syncBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.syncLabel} onPress={() => hasLyrics && onLyricsOffsetChange(0)}>
              <Text style={[styles.syncText, lyricsOffset !== 0 && { color: colors.primary }]}>
                {offsetLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.syncBtn} onPress={() => hasLyrics && onLyricsOffsetChange(lyricsOffset + OFFSET_STEP)}>
              <Text style={styles.syncBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 오른쪽: 목록 */}
        <TouchableOpacity style={styles.bottomBarBtn} onPress={onBack} activeOpacity={0.7}>
          <View style={styles.bottomBarIconWrap}>
            <Text style={styles.bottomBarIconText}>☰</Text>
          </View>
          <Text style={styles.bottomBarLabel}>목록</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PlayerBackground uri={track.albumArt} />

      {showLyrics && hasLyrics ? (
        /* ── 가사 보기 모드 ── */
        <>
          <View style={styles.lyricsHeader}>
            <TouchableOpacity style={styles.lyricsHeaderCenter} activeOpacity={0.8} onPress={() => setShowLyrics(false)}>
              <Image source={{ uri: track.albumArt }} style={styles.lyricsThumb} contentFit="cover" />
              <View style={styles.lyricsHeaderInfo}>
                <Text style={styles.lyricsHeaderTitle} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.lyricsHeaderArtist} numberOfLines={1}>{track.artists.join(', ')}</Text>
              </View>
            </TouchableOpacity>

            {/* 즐겨찾기 */}
            <TouchableOpacity onPress={onToggleLike} style={styles.starBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.starIcon, isLiked && { color: '#FFD60A' }]}>
                {isLiked ? '★' : '☆'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowLyrics(false)} style={styles.closeBadge}>
              <Text style={styles.closeBadgeText}>닫기</Text>
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
        /* ── 일반 플레이어 모드 ── */
        <>
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            {/* 즐겨찾기 — 상단 우측 */}
            <TouchableOpacity onPress={onToggleLike} style={styles.starBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.starIcon, isLiked && { color: '#FFD60A' }]}>
                {isLiked ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.albumSection}>
            <Animated.View style={[styles.albumShadow, { transform: [{ scale: scaleAnim }] }]}>
              <Image source={{ uri: track.albumArt }} style={styles.albumArt} contentFit="cover" />
            </Animated.View>
          </View>

          <View style={styles.songInfoArea}>
            <Text style={styles.songName} numberOfLines={1}>{track.name}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{track.artists.join(', ')}</Text>
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

  /* ── 일반 헤더 ── */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.6 },
  homeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  homeBtnIcon: { fontSize: 18, color: '#fff' },
  homeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* ── 즐겨찾기 ★ ── */
  starBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  starIcon: { fontSize: 22, color: 'rgba(255,255,255,0.7)' },

  /* ── 앨범 아트 ── */
  albumSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  albumShadow: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.65, shadowRadius: 32, elevation: 20, borderRadius: 12,
  },
  albumArt: { width: ALBUM_ART_SIZE, height: ALBUM_ART_SIZE, borderRadius: 12 },

  /* ── 곡 정보 ── */
  songInfoArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  songName: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  artistName: { fontSize: 18, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  /* ── 컨트롤 영역 ── */
  controlsArea: { paddingHorizontal: spacing.xl, paddingBottom: 28 },
  sliderWrapper: { width: '100%' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 18 },
  timeText: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },

  mainControls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  sideBtn: { alignItems: 'center', width: 36 },
  sideBtnIcon: { fontSize: 22, color: 'rgba(255,255,255,0.65)' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 3 },

  /* Prev / Next — 반투명 원형 */
  skipBtnOuter: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  skipBtnCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtnIcon: { fontSize: 22, color: '#fff' },

  /* Play — 흰 원 */
  playBtnOuter: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  playBtnCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  playBtnIcon: { fontSize: 30, color: '#000', marginLeft: 4 },

  /* ── 하단 바: 💬 가사 | 싱크 | ☰ 목록 ── */
  bottomBar: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
  },
  bottomBarBtn: { flex: 1, alignItems: 'center', gap: 5 },
  bottomBarCenter: { flex: 1.4, alignItems: 'center' },
  bottomBarIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bottomBarIconActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bottomBarIconText: { fontSize: 20 },
  bottomBarLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  /* 싱크 컨트롤 (하단 바 가운데) */
  syncRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  syncBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  syncBtnText: { fontSize: 22, fontWeight: '300', color: '#fff', lineHeight: 26 },
  syncLabel: { paddingHorizontal: 8, height: 40, minWidth: 52, alignItems: 'center', justifyContent: 'center' },
  syncText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },

  /* ── 가사 헤더 ── */
  lyricsHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  lyricsHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lyricsThumb: { width: 48, height: 48, borderRadius: 10 },
  lyricsHeaderInfo: { flex: 1 },
  lyricsHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  lyricsHeaderArtist: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  closeBadge: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
  },
  closeBadgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  lyricsArea: { flex: 1, overflow: 'hidden' },
});
