import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, PanResponder, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../theme';
import { Track, LyricLine, VocabEntry } from '../types';
import VocabCard from '../components/VocabCard';
import LyricsView, { TranslationCard, TranslationCardProps } from '../components/LyricsView';
import Icon from '../components/Icon';
import { ytSetVolume, ytGetVolume } from '../services/youtubePlayer';
import { audioSetVolume } from '../services/audioPlayer';

const { width, height: SCREEN_H } = Dimensions.get('window');
const ART_SIZE = Math.min(width - 56, SCREEN_H * 0.36);
const OFFSET_STEP = 1000;

type RepeatMode = 'off' | 'one' | 'all';

interface Props {
  expanded: boolean;
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

// 볼륨 슬라이더 글로벌 CSS (한 번만 주입)
if (typeof document !== 'undefined' && !document.getElementById('__vol_style__')) {
  const s = document.createElement('style');
  s.id = '__vol_style__';
  s.innerHTML = `
    input.kpop-vol {
      -webkit-appearance: none; appearance: none;
      width: 100%; height: 20px;
      background: transparent; outline: none; cursor: pointer;
      margin: 0; padding: 0;
    }
    input.kpop-vol::-webkit-slider-runnable-track {
      height: 4px; border-radius: 2px;
      background: linear-gradient(to right,
        rgba(255,255,255,0.9) var(--vol, 100%),
        rgba(255,255,255,0.22) var(--vol, 100%));
    }
    input.kpop-vol::-webkit-slider-thumb {
      -webkit-appearance: none; width: 14px; height: 14px;
      margin-top: -5px;
      border-radius: 50%; background: #fff; cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
    input.kpop-vol::-moz-range-track {
      height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.22);
    }
    input.kpop-vol::-moz-range-progress {
      height: 4px; border-radius: 2px;
      background: rgba(255,255,255,0.9);
    }
    input.kpop-vol::-moz-range-thumb {
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; border: none; cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
  `;
  document.head.appendChild(s);
}

function VolumeRow() {
  const [vol, setVol] = useState(() => {
    const saved = parseInt(localStorage.getItem('kpop_volume') ?? '', 10);
    return isNaN(saved) ? 100 : saved;
  });

  const applyVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setVol(clamped);
    ytSetVolume(clamped);
    audioSetVolume(clamped);
  };

  return (
    <View style={styles.volumeRow}>
      <TouchableOpacity
        onPress={() => applyVolume(vol - 10)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="volume-low" size={18} color={vol === 0 ? colors.primary : 'rgba(255,255,255,0.55)'} />
      </TouchableOpacity>

      <input
        type="range" min={0} max={100} value={vol}
        className="kpop-vol"
        onChange={e => applyVolume(Number(e.target.value))}
        onInput={(e: any) => applyVolume(Number(e.target.value))}
        style={{ '--vol': `${vol}%`, flex: 1 } as React.CSSProperties}
      />

      <TouchableOpacity
        onPress={() => applyVolume(vol + 10)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="volume-high" size={18} color={vol === 100 ? colors.primary : 'rgba(255,255,255,0.55)'} />
      </TouchableOpacity>
    </View>
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
  compact?: boolean;
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
  lyricsOffset, hasLyrics, showLyrics, showRemaining, compact,
  onSeek, onToggleShuffle, onPrev, onPlayPause, onNext, onToggleRepeat,
  onLyricsOffsetChange, onBack, setShowLyrics, setShowRemaining,
}: ControlsProps) {
  const rightTime = showRemaining && durationMs > 0
    ? `-${fmt(durationMs - currentMs)}` : fmt(durationMs);
  const shuffleColor = shuffleMode ? '#fff' : 'rgba(255,255,255,0.35)';
  const repeatColor = repeatMode !== 'off' ? '#fff' : 'rgba(255,255,255,0.35)';
  const offsetLabel = lyricsOffset === 0 ? '싱크' : lyricsOffset > 0 ? `+${lyricsOffset / 1000}s` : `${lyricsOffset / 1000}s`;

  return (
    <View style={[styles.controlsBlock, compact && styles.controlsBlockCompact]}>
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
      <VolumeRow />

      {/* 하단 툴바 */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity
          style={[styles.toolbarBtn, showLyrics && styles.toolbarBtnActive]}
          onPress={() => hasLyrics && setShowLyrics(!showLyrics)}
          activeOpacity={0.7}
        >
          <Icon name="lyrics" size={32} color={showLyrics ? '#000' : (hasLyrics ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)')} />
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
          <Icon name="queue" size={32} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PlayerScreen({
  expanded, track, lyrics, isPlaying, currentMs, durationMs,
  lyricsOffset, shuffleMode, repeatMode, isLiked,
  onLyricsOffsetChange, onPlayPause, onNext, onPrev, onSeek,
  onToggleShuffle, onToggleRepeat, onToggleLike, onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeVocab, setActiveVocab] = useState<VocabEntry | null>(null);
  const [showRemaining, setShowRemaining] = useState(true);
  const [lyricsTranslation, setLyricsTranslation] = useState<TranslationCardProps | null>(null);

  /* ── 슬라이드 업/다운 (expanded 기반) ── */
  const playerY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (expanded) {
      Animated.spring(playerY, {
        toValue: 0, tension: 68, friction: 12, useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(playerY, {
        toValue: SCREEN_H, tension: 68, friction: 12, useNativeDriver: true,
      }).start();
    }
  }, [expanded]);

  /* ── 스와이프 다운 (닫기) ── */
  const panRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        dy > 8 && Math.abs(dy) > Math.abs(dx) * 1.5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) playerY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 110 || vy > 1.0) {
          Animated.spring(playerY, {
            toValue: SCREEN_H, tension: 60, friction: 12, useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) { playerY.setValue(SCREEN_H); onBack(); }
          });
        } else {
          Animated.spring(playerY, {
            toValue: 0, tension: 120, friction: 14, useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  /* ── 가사 전환 애니메이션 (0=플레이어, 1=가사) ── */
  const lyricsAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(lyricsAnim, {
      toValue: showLyrics ? 1 : 0,
      tension: 72, friction: 14,
      useNativeDriver: true,
    }).start();
  }, [showLyrics]);

  const playerOpacity = lyricsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const playerSlideY  = lyricsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 24] });
  const lyricsOpacity = lyricsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const lyricsSlideY  = lyricsAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

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
        { transform: [{ translateY: playerY }] },
      ]}
      pointerEvents={expanded ? 'auto' : 'none'}
    >
      <StatusBar barStyle="light-content" />

      {/* 배경: albumArt가 바뀔 때만 재렌더 */}
      <PlayerBackground albumArt={track.albumArt} />

      {/* ── 일반 플레이어 모드 (가사 전환 시 fade+slide out) ── */}
      <Animated.View
        style={[styles.playerView, { opacity: playerOpacity, transform: [{ translateY: playerSlideY }] }]}
        pointerEvents={showLyrics ? 'none' : 'box-none'}
      >
        <View {...panRef.panHandlers} style={[styles.topArea, { paddingTop: insets.top + 14 }]}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.headerIconBtn}>
              <Icon name="chevron-down" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <View style={styles.headerTitleBlock} />
            <View style={styles.headerIconBtn} />
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
                name={isLiked ? 'star-fill' : 'star'}
                size={26}
                color={isLiked ? '#FFD700' : 'rgba(255,255,255,0.55)'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Controls {...controlsProps} />
      </Animated.View>

      {/* ── 가사 모드 (가사 전환 시 fade+slide in) ── */}
      {hasLyrics && (
        <Animated.View
          style={[styles.lyricsView, { opacity: lyricsOpacity, transform: [{ translateY: lyricsSlideY }] }]}
          pointerEvents={showLyrics ? 'box-none' : 'none'}
        >
          <View style={[styles.lyricsHeader, { paddingTop: insets.top + 12 }]}>
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
              <Icon name={isLiked ? 'star-fill' : 'star'} size={20} color={isLiked ? '#FFD700' : 'rgba(255,255,255,0.6)'} />
            </TouchableOpacity>
          </View>

          <View style={styles.lyricsScrollArea}>
            <LyricsView
              lyrics={lyrics}
              currentLineIndex={currentLine}
              currentMs={adjMs}
              onWordPress={setActiveVocab}
              onLineSyncPress={(lineStartMs) => onLyricsOffsetChange(currentMs - lineStartMs)}
              onTranslationChange={setLyricsTranslation}
            />
            {/* 아래쪽 가사가 컨트롤 영역으로 사라지는 gradient fade */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.92)']}
              style={styles.lyricsFade}
              pointerEvents="none"
            />
          </View>

          <View style={styles.lyricsControlsArea}>
            <Controls {...controlsProps} compact />
          </View>

          {/* 번역 카드 — lyricsScrollArea 밖에서 렌더링 (overflow:hidden 영향 없음) */}
          {lyricsTranslation && (
            <>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                onPress={lyricsTranslation.onClose}
                activeOpacity={1}
              />
              <TranslationCard {...lyricsTranslation} />
            </>
          )}
        </Animated.View>
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

  topArea: {},
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
  headerBackText: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '300',
    lineHeight: 26,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
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
    marginTop: 4,
    marginBottom: 20,
  },
  artShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.65,
    shadowRadius: 40,
    elevation: 24,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  albumArt: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 16,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  artistName: {
    fontSize: 18,
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
  controlsBlockCompact: {
    flex: 0,
    justifyContent: 'flex-start',
    paddingTop: 8,
  },

  lyricsScrollArea: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  lyricsFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  lyricsControlsArea: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
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
    paddingTop: 12,
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

  playerView: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  lyricsView: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
});
