import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, PanResponder, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../theme';
import { Track, LyricLine, VocabEntry } from '../types';
import VocabCard from '../components/VocabCard';
import LyricsView from '../components/LyricsView';
import Icon from '../components/Icon';
import { ytSetVolume, ytGetVolume } from '../services/youtubePlayer';

const { width, height: SCREEN_H } = Dimensions.get('window');
const ART_SIZE = Math.min(width - 56, SCREEN_H * 0.38);
const OFFSET_STEP = 1000;

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
  onLyricsOffsetChange: (v: number) => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (ms: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: () => void;
  onBack: () => void;
  backListName?: string | null;
}

function fmt(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ── 배경 (BlurView 포함) — albumArt가 바뀔 때만 재렌더 ── */
const PlayerBackground = memo(function PlayerBackground({ albumArt }: { albumArt: string }) {
  return (
    <>
      <Image source={{ uri: albumArt }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <BlurView intensity={92} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.97)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </>
  );
});

/* ── 진행 바 ── */
function ProgressBar({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <input
      type="range" min={0} max={max || 1} value={value}
      aria-label="재생 위치"
      onChange={(e) => onChange(Number((e.target as HTMLInputElement).value))}
      style={{
        width: '100%', height: 4, cursor: 'pointer',
        outline: 'none', WebkitAppearance: 'none', appearance: 'none',
        background: `linear-gradient(to right,rgba(255,255,255,0.9) ${pct}%,rgba(255,255,255,0.25) ${pct}%)`,
        borderRadius: 2, accentColor: '#fff',
      } as React.CSSProperties}
    />
  );
}

function VolumeBar() {
  const [vol, setVol] = useState(() => {
    const saved = parseInt(localStorage.getItem('kpop_volume') ?? '', 10);
    return isNaN(saved) ? ytGetVolume() : saved;
  });
  return (
    <input
      type="range" min={0} max={100} value={vol}
      aria-label="볼륨"
      onChange={e => {
        const v = Number(e.target.value);
        setVol(v);
        ytSetVolume(v);
      }}
      style={{
        flex: 1, height: 4, cursor: 'pointer',
        outline: 'none', WebkitAppearance: 'none', appearance: 'none',
        background: `linear-gradient(to right, rgba(255,255,255,0.9) ${vol}%, rgba(255,255,255,0.25) ${vol}%)`,
        borderRadius: 2, accentColor: 'rgba(255,255,255,0.9)',
      } as React.CSSProperties}
    />
  );
}

/* ── Controls — PlayerScreen 외부에 정의, 매 렌더마다 remount 없음 ── */
interface ControlsProps {
  currentMs: number;
  durationMs: number;
  isPlaying: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  lyricsOffset: number;
  hasLyrics: boolean;
  showLyrics: boolean;
  showRemaining: boolean;
  onSeek: (ms: number) => void;
  onToggleShuffle: () => void;
  onPrev: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
  onLyricsOffsetChange: (v: number) => void;
  onBack: () => void;
  setShowLyrics: (v: boolean) => void;
  setShowRemaining: React.Dispatch<React.SetStateAction<boolean>>;
}

function Controls({
  currentMs, durationMs, isPlaying, shuffleMode, repeatMode,
  lyricsOffset, hasLyrics, showLyrics, showRemaining,
  onSeek, onToggleShuffle, onPrev, onPlayPause, onNext, onToggleRepeat,
  onLyricsOffsetChange, onBack, setShowLyrics, setShowRemaining,
}: ControlsProps) {
  const rightTime = showRemaining && durationMs > 0
    ? `-${fmt(durationMs - currentMs)}` : fmt(durationMs);
  const shuffleColor = shuffleMode ? '#fff' : 'rgba(255,255,255,0.35)';
  const repeatColor = repeatMode !== 'off' ? '#fff' : 'rgba(255,255,255,0.35)';
  const offsetLabel = lyricsOffset === 0 ? '싱크' : lyricsOffset > 0 ? `+${lyricsOffset / 1000}s` : `${lyricsOffset / 1000}s`;

  return (
    <View style={styles.controlsBlock}>
      {/* 진행 바 */}
      <View style={styles.progressWrap}>
        <ProgressBar value={currentMs} max={durationMs} onChange={onSeek} />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmt(currentMs)}</Text>
          <TouchableOpacity onPress={() => setShowRemaining(v => !v)}>
            <Text style={styles.timeText}>{rightTime}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메인 컨트롤 */}
      <View style={styles.mainControls}>
        <TouchableOpacity onPress={onToggleShuffle} style={styles.sideBtn}>
          <Icon name="shuffle" size={22} color={shuffleColor} />
          {shuffleMode && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={onPrev} style={styles.skipBtn}>
          <Icon name="backward" size={34} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onPlayPause} style={styles.playBtn}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={34} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.skipBtn}>
          <Icon name="forward" size={34} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onToggleRepeat} style={styles.sideBtn}>
          <Icon name={repeatMode === 'one' ? 'repeat-1' : 'repeat'} size={22} color={repeatColor} />
          {repeatMode !== 'off' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* 볼륨 */}
      <View style={styles.volumeRow}>
        <Icon name="volume-low" size={16} color="rgba(255,255,255,0.45)" />
        <VolumeBar />
        <Icon name="volume-high" size={16} color="rgba(255,255,255,0.45)" />
      </View>

      {/* 하단 툴바 */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity
          style={[styles.toolbarBtn, showLyrics && styles.toolbarBtnActive]}
          onPress={() => hasLyrics && setShowLyrics(!showLyrics)}
          activeOpacity={0.7}
        >
          <Icon name="lyrics" size={18} color={showLyrics ? '#000' : (hasLyrics ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)')} />
          <Text style={[styles.toolbarLabel, showLyrics && styles.toolbarLabelActive]}>가사</Text>
        </TouchableOpacity>

        {hasLyrics && (
          <View style={[styles.syncControl, !showLyrics && { opacity: 0.45 }]}>
            <TouchableOpacity
              style={styles.syncBtn}
              onPress={() => showLyrics && onLyricsOffsetChange(lyricsOffset - OFFSET_STEP)}
            >
              <Text style={styles.syncBtnText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showLyrics && onLyricsOffsetChange(0)}>
              <Text style={[styles.syncLabel, lyricsOffset !== 0 && { color: colors.primary }]}>
                {offsetLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.syncBtn}
              onPress={() => showLyrics && onLyricsOffsetChange(lyricsOffset + OFFSET_STEP)}
            >
              <Text style={styles.syncBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.toolbarBtn} onPress={onBack} activeOpacity={0.7}>
          <Icon name="queue" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={styles.toolbarLabel}>목록</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PlayerScreen({
  track, lyrics, isPlaying, currentMs, durationMs,
  lyricsOffset, shuffleMode, repeatMode, isLiked,
  onLyricsOffsetChange, onPlayPause, onNext, onPrev, onSeek,
  onToggleShuffle, onToggleRepeat, onToggleLike, onBack,
}: Props) {
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeVocab, setActiveVocab] = useState<VocabEntry | null>(null);
  const [showRemaining, setShowRemaining] = useState(true);

  /* ── 슬라이드 업 (등장 애니메이션) ── */
  const slideIn = useRef(new Animated.Value(SCREEN_H)).current;
  useEffect(() => {
    Animated.spring(slideIn, {
      toValue: 0, tension: 68, friction: 12, useNativeDriver: true,
    }).start();
  }, []);

  /* ── 스와이프 다운 (닫기) ── */
  const swipeY = useRef(new Animated.Value(0)).current;
  const panRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        dy > 8 && Math.abs(dy) > Math.abs(dx) * 1.5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) swipeY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 110 || vy > 1.0) {
          Animated.spring(swipeY, {
            toValue: SCREEN_H, tension: 60, friction: 12, useNativeDriver: true,
          }).start(() => onBack());
        } else {
          Animated.spring(swipeY, {
            toValue: 0, tension: 120, friction: 14, useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  /* ── 앨범 아트 스케일 (재생 여부) ── */
  const artScale = useRef(new Animated.Value(isPlaying ? 1.0 : 0.88)).current;
  useEffect(() => {
    Animated.spring(artScale, {
      toValue: isPlaying ? 1.0 : 0.88,
      tension: 55, friction: 12, useNativeDriver: true,
    }).start();
  }, [isPlaying]);

  const hasLyrics = lyrics.length > 0;
  const adjMs = currentMs + lyricsOffset;
  const currentLine = hasLyrics && adjMs > 0
    ? lyrics.findIndex(l => adjMs >= l.startMs && adjMs < l.endMs)
    : -1;

  const controlsProps: ControlsProps = {
    currentMs, durationMs, isPlaying, shuffleMode, repeatMode,
    lyricsOffset, hasLyrics, showLyrics, showRemaining,
    onSeek, onToggleShuffle, onPrev, onPlayPause, onNext, onToggleRepeat,
    onLyricsOffsetChange, onBack, setShowLyrics, setShowRemaining,
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: Animated.add(slideIn, swipeY) }] },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* 배경: albumArt가 바뀔 때만 재렌더 */}
      <PlayerBackground albumArt={track.albumArt} />

      {/* ── 가사 모드 ── */}
      {showLyrics && hasLyrics ? (
        <>
          <View style={styles.lyricsHeader}>
            <TouchableOpacity onPress={() => setShowLyrics(false)} style={styles.lyricsHeaderBtn}>
              <Icon name="chevron-down" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.lyricsHeaderCenter}>
              <Image source={{ uri: track.albumArt }} style={styles.lyricsThumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.lyricsSongName} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.lyricsArtistName} numberOfLines={1}>{track.artists.join(', ')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onToggleLike} style={styles.lyricsHeaderBtn}>
              <Icon name={isLiked ? 'heart-fill' : 'heart'} size={20} color={isLiked ? colors.primary : 'rgba(255,255,255,0.6)'} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, overflow: 'hidden' }}>
            <LyricsView
              lyrics={lyrics}
              currentLineIndex={currentLine}
              currentMs={adjMs}
              onWordPress={setActiveVocab}
              onLineSyncPress={(lineStartMs) => onLyricsOffsetChange(currentMs - lineStartMs)}
            />
          </View>

          <Controls {...controlsProps} />
        </>
      ) : (
        /* ── 일반 플레이어 모드 ── */
        <>
          <View {...panRef.panHandlers} style={styles.topArea}>
            <View style={styles.dragHandle} />
            <View style={styles.header}>
              <TouchableOpacity onPress={onBack} style={styles.headerIconBtn}>
                <Icon name="chevron-down" size={26} color="#fff" />
              </TouchableOpacity>

              <View style={styles.headerTitleBlock}>
                <Text style={styles.headerLabel}>지금 재생 중</Text>
                <Text style={styles.headerAlbum} numberOfLines={1}>{track.album}</Text>
              </View>

              <TouchableOpacity style={styles.headerIconBtn}>
                <Icon name="ellipsis" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.artSection}>
            <Animated.View style={[styles.artShadow, { transform: [{ scale: artScale }] }]}>
              <Image source={{ uri: track.albumArt }} style={styles.albumArt} contentFit="cover" />
            </Animated.View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.songTitle} numberOfLines={1}>{track.name}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{track.artists.join(', ')}</Text>
              </View>
              <TouchableOpacity onPress={onToggleLike} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon
                  name={isLiked ? 'heart-fill' : 'heart'}
                  size={26}
                  color={isLiked ? colors.primary : 'rgba(255,255,255,0.55)'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Controls {...controlsProps} />
        </>
      )}

      {activeVocab && (
        <VocabCard vocab={activeVocab} songName={track.name} onClose={() => setActiveVocab(null)} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000',
  },

  topArea: { paddingTop: 14 },
  dragHandle: {
    alignSelf: 'center',
    width: 36, height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  headerIconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitleBlock: { flex: 1, alignItems: 'center' },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerAlbum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },

  artSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginVertical: 16,
  },
  artShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.75,
    shadowRadius: 36,
    elevation: 24,
    borderRadius: 14,
  },
  albumArt: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 14,
  },

  infoSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 17,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },

  controlsBlock: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: 24,
    justifyContent: 'flex-end',
    gap: 16,
  },
  progressWrap: { gap: 6 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },

  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideBtn: { width: 36, alignItems: 'center', gap: 3 },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#fff',
  },
  skipBtn: {
    width: 56, height: 56,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },

  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 14,
  },
  toolbarBtn: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  toolbarBtnActive: {
    backgroundColor: '#fff',
  },
  toolbarLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  toolbarLabelActive: { color: '#000' },

  syncControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  syncBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  syncBtnText: { fontSize: 20, fontWeight: '300', color: '#fff', lineHeight: 24 },
  syncLabel: {
    paddingHorizontal: 8,
    fontSize: 11, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },

  lyricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  lyricsHeaderBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  lyricsHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lyricsThumb: { width: 44, height: 44, borderRadius: 8 },
  lyricsSongName: {
    fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2,
  },
  lyricsArtistName: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)',
  },
});
