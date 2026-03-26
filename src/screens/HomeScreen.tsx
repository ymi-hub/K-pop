import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList, SectionList,
  TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, StatusBar,
  LayoutAnimation, Platform, UIManager, Animated,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import Icon from '../components/Icon';
import { TabId } from '../components/TabBar';
import { loadPlaylist, PlaylistItem, removeFromPlaylist } from '../services/playlistStorage';

const { width } = Dimensions.get('window');
const FEAT_W = width * 0.72;
const FEAT_H = FEAT_W * 1.12;
const RECENT_SZ = 130;
const TAB_MINI_OFFSET = 140; // tabbar + miniplayer

/* ── 나노바나 애니메이션 (음악 바) ── */
function AnimatedMusicBars({ barColor = colors.primary }: { barColor?: string }) {
  const MAX_H = 44;
  const MIN_H = 6;
  const v1 = useRef(new Animated.Value(14)).current;
  const v2 = useRef(new Animated.Value(36)).current;
  const v3 = useRef(new Animated.Value(22)).current;
  const v4 = useRef(new Animated.Value(38)).current;
  const v5 = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const make = (val: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: MAX_H, duration: dur, useNativeDriver: false }),
          Animated.timing(val, { toValue: MIN_H, duration: dur, useNativeDriver: false }),
        ])
      );
    const anims = [make(v1, 420), make(v2, 580), make(v3, 360), make(v4, 500), make(v5, 460)];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  const bar = (v: Animated.Value) => ({
    width: 6, borderRadius: 3, backgroundColor: barColor, height: v,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: MAX_H }}>
      <Animated.View style={bar(v1)} />
      <Animated.View style={bar(v2)} />
      <Animated.View style={bar(v3)} />
      <Animated.View style={bar(v4)} />
      <Animated.View style={bar(v5)} />
    </View>
  );
}

/* ── 앨범별 그룹 ── */
function groupByAlbum(tracks: Track[]) {
  const map = new Map<string, Track[]>();
  for (const t of tracks) {
    if (!map.has(t.album)) map.set(t.album, []);
    map.get(t.album)!.push(t);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function fmt(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ── props ── */
interface Props {
  activeTab: TabId;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  recentTracks: Track[];
  onSelectTrack: (track: Track) => void;
  onToggleLike: (id: string) => void;
  onVocabPress?: () => void;
  playlistCount?: number;
  onOpenPlaylist?: () => void;
  onOpenLibrary?: () => void;
}

/* ═══════════════════════════════════════════════
   최근 재생한 음악 전체 페이지 — 2열 그리드
══════════════════════════════════════════════ */
const GRID_COLS = 2;
const GRID_PAD = 16;
const GRID_GAP = 12;
const GRID_ITEM_W = (width - GRID_PAD * 2 - GRID_GAP) / GRID_COLS;

function RecentPage({ tracks, currentTrack, isPlaying, onSelectTrack, onBack }: {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (t: Track) => void;
  onBack: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 헤더 */}
      <View style={recentStyles.header}>
        <TouchableOpacity onPress={onBack} style={recentStyles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-down" size={20} color={colors.primary} style={{ transform: [{ rotate: '90deg' }] }} />
          <Text style={recentStyles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={recentStyles.title}>최근 재생한 음악</Text>
        <View style={{ width: 60 }} />
      </View>

      {tracks.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="musical-note" size={52} color={colors.textTertiary} />
          <Text style={styles.emptyText}>재생 기록이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={i => i.id + '_rg'}
          numColumns={GRID_COLS}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={recentStyles.grid}
          columnWrapperStyle={{ gap: GRID_GAP, marginBottom: GRID_GAP }}
          renderItem={({ item }) => {
            const active = currentTrack?.id === item.id;
            return (
              <TouchableOpacity
                style={recentStyles.gridItem}
                onPress={() => onSelectTrack(item)}
                activeOpacity={0.8}
              >
                <View style={recentStyles.artWrap}>
                  <Image
                    source={{ uri: item.albumArt }}
                    style={recentStyles.art}
                    contentFit="cover"
                  />
                  {active && isPlaying && (
                    <View style={recentStyles.overlay}>
                      <Icon name="musical-note" size={22} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[recentStyles.name, active && { color: colors.primary }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={recentStyles.artist} numberOfLines={1}>{item.artists.join(', ')}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const recentStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    gap: 2,
  },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff' },
  grid: {
    paddingHorizontal: GRID_PAD,
    paddingTop: 8,
    paddingBottom: TAB_MINI_OFFSET,
  },
  gridItem: { width: GRID_ITEM_W },
  artWrap: { position: 'relative', marginBottom: 8 },
  art: { width: GRID_ITEM_W, height: GRID_ITEM_W, borderRadius: 12 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 3, lineHeight: 18 },
  artist: { fontSize: 12, color: colors.textTertiary },
});

/* ═══════════════════════════════════════════════
   앨범 드롭다운 공용 컴포넌트
══════════════════════════════════════════════ */
function AlbumDropdownList({ tracks, currentTrack, isPlaying, likedIds, onSelectTrack, onToggleLike, sectionTitle, initialExpanded, minGroupSize = 1, editMode, onDelete }: {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  onSelectTrack: (t: Track) => void;
  onToggleLike: (id: string) => void;
  sectionTitle?: string;
  initialExpanded?: boolean;
  minGroupSize?: number;
  editMode?: boolean;
  onDelete?: (id: string) => void;
}) {
  const sections = useMemo(() => groupByAlbum(tracks), [tracks]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (initialExpanded === false) return new Set();
    const first = sections.find(s => s.data.length >= (minGroupSize ?? 1))?.title;
    return first ? new Set([first]) : new Set();
  });

  const toggle = (title: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(title) ? n.delete(title) : n.add(title);
      return n;
    });
  };

  const renderTrackRow = (item: Track, idx: number, isLast: boolean) => {
    const active = currentTrack?.id === item.id;
    const liked = likedIds.has(item.id);
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.dropTrackRow,
          isLast && styles.dropTrackRowLast,
          active && styles.dropTrackRowActive,
        ]}
        onPress={() => onSelectTrack(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropTrackNum, active && { color: colors.primary }]}>
          {active && isPlaying ? '▶' : idx + 1}
        </Text>
        <View style={styles.dropTrackInfo}>
          <Text style={[styles.dropTrackName, active && { color: colors.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.dropTrackDur}>{fmt(item.durationMs)}</Text>
        </View>
        {onToggleLike && (
          <TouchableOpacity
            onPress={() => onToggleLike(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={styles.dropLikeBtn}
          >
            <Icon
              name={liked ? 'heart-fill' : 'heart'}
              size={15}
              color={liked ? colors.primary : 'rgba(255,255,255,0.22)'}
            />
          </TouchableOpacity>
        )}
        {editMode && onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={styles.dropDeleteBtn}
          >
            <Icon name="close" size={13} color="#ff4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      {sectionTitle && (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>{sections.length}개 앨범 · {tracks.length}곡</Text>
        </View>
      )}
      <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
        {sections.map(section => {
          const albumArt = section.data[0]?.albumArt ?? '';
          const useDropdown = section.data.length >= minGroupSize;

          // 1곡 앨범: 앨범아트 포함 플랫 행
          if (!useDropdown) {
            return (
              <View key={section.title} style={styles.dropSection}>
                {section.data.map(item => {
                  const active = currentTrack?.id === item.id;
                  const liked = likedIds.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.dropHeader, active && styles.dropTrackRowActive]}
                      onPress={() => onSelectTrack(item)}
                      activeOpacity={0.75}
                    >
                      <Image source={{ uri: item.albumArt || albumArt }} style={styles.dropArt} contentFit="cover" />
                      <View style={styles.dropInfo}>
                        <Text style={[styles.dropAlbumName, active && { color: colors.primary }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.dropAlbumMeta}>{item.artists.join(', ')} · {fmt(item.durationMs)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => onToggleLike(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                        style={styles.dropLikeBtn}
                      >
                        <Icon name={liked ? 'heart-fill' : 'heart'} size={15} color={liked ? colors.primary : 'rgba(255,255,255,0.22)'} />
                      </TouchableOpacity>
                      {editMode && onDelete && (
                        <TouchableOpacity
                          onPress={() => onDelete(item.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                          style={styles.dropDeleteBtn}
                        >
                          <Icon name="close" size={13} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          }

          // 2곡 이상: 드롭다운
          const isOpen = expanded.has(section.title);
          return (
            <View key={section.title} style={styles.dropSection}>
              <TouchableOpacity
                style={styles.dropHeader}
                onPress={() => toggle(section.title)}
                activeOpacity={0.75}
              >
                <Image source={{ uri: albumArt }} style={styles.dropArt} contentFit="cover" />
                <View style={styles.dropInfo}>
                  <Text style={styles.dropAlbumName} numberOfLines={1}>{section.title}</Text>
                  <Text style={styles.dropAlbumMeta}>
                    {section.data[0]?.artists.join(', ')} · {section.data.length}곡
                  </Text>
                </View>
                <View style={[styles.dropChevron, isOpen && styles.dropChevronOpen]}>
                  <Icon name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
                </View>
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.dropBody}>
                  {section.data.map((item, idx) => renderTrackRow(item, idx, idx === section.data.length - 1))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ── 2열 그리드 전체 페이지 ─────────────────────────── */
const GRID2_PAD = 16;
const GRID2_GAP = 10;
const GRID2_W = (width - GRID2_PAD * 2 - GRID2_GAP) / 2;

function LibraryGridPage({ title, items, currentTrack, isPlaying, onSelect, onBack, onPlayAll, onShuffleAll }: {
  title: string;
  items: { id: string; name: string; artists: string[]; albumArt: string }[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelect: (item: any) => void;
  onBack: () => void;
  onPlayAll?: () => void;
  onShuffleAll?: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 헤더 */}
      <View style={libGridStyles.header}>
        <TouchableOpacity onPress={onBack} style={libGridStyles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-down" size={20} color={colors.primary} style={{ transform: [{ rotate: '90deg' }] }} />
          <Text style={libGridStyles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={libGridStyles.title}>{title}</Text>
        <Text style={libGridStyles.count}>{items.length}곡</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="musical-note" size={52} color={colors.textTertiary} />
          <Text style={styles.emptyText}>항목이 없습니다</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={libGridStyles.grid}
          columnWrapperStyle={{ gap: GRID2_GAP, marginBottom: GRID2_GAP }}
          ListHeaderComponent={
            <View style={libGridStyles.actionRow}>
              <TouchableOpacity style={libGridStyles.actionBtn} onPress={onPlayAll} activeOpacity={0.75}>
                <Icon name="play" size={16} color="#fff" />
                <Text style={libGridStyles.actionText}>재생</Text>
              </TouchableOpacity>
              <TouchableOpacity style={libGridStyles.actionBtn} onPress={onShuffleAll} activeOpacity={0.75}>
                <Icon name="shuffle" size={16} color="#fff" />
                <Text style={libGridStyles.actionText}>임의 재생</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const active = currentTrack?.id === item.id;
            return (
              <TouchableOpacity style={libGridStyles.item} onPress={() => onSelect(item)} activeOpacity={0.8}>
                <View style={libGridStyles.artWrap}>
                  {item.albumArt ? (
                    <Image source={{ uri: item.albumArt }} style={libGridStyles.art} contentFit="cover" />
                  ) : (
                    <View style={[libGridStyles.art, libGridStyles.artPlaceholder]}>
                      <Icon name="musical-note" size={28} color="rgba(255,255,255,0.25)" />
                    </View>
                  )}
                  {active && isPlaying && (
                    <View style={libGridStyles.overlay}><Icon name="musical-note" size={24} color="#fff" /></View>
                  )}
                </View>
                <Text style={[libGridStyles.name, active && { color: colors.primary }]} numberOfLines={2}>{item.name}</Text>
                <Text style={libGridStyles.artist} numberOfLines={1}>{item.artists.join(', ')}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const libGridStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  count: { width: 60, fontSize: 12, color: colors.textTertiary, textAlign: 'right' },
  grid: { paddingHorizontal: GRID2_PAD, paddingTop: 0, paddingBottom: TAB_MINI_OFFSET },
  actionRow: {
    flexDirection: 'row', gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  item: { width: GRID2_W },
  artWrap: { position: 'relative', marginBottom: 8 },
  art: { width: GRID2_W, height: GRID2_W, borderRadius: 12 },
  artPlaceholder: { backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 18, marginBottom: 2 },
  artist: { fontSize: 12, color: colors.textTertiary },
});

/* ── 2열 그리드 미리보기 (최대 4개, 2×2) ─────────────── */
function LibraryGridPreview({ items, currentTrack, isPlaying, onSelect }: {
  items: { id: string; name: string; artists: string[]; albumArt: string }[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelect: (item: any) => void;
}) {
  const preview = items.slice(0, 4);
  const rows: typeof preview[] = [];
  for (let i = 0; i < preview.length; i += 2) rows.push(preview.slice(i, i + 2));

  return (
    <View style={previewStyles.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={previewStyles.row}>
          {row.map(item => {
            const active = currentTrack?.id === item.id;
            return (
              <TouchableOpacity key={item.id} style={previewStyles.item} onPress={() => onSelect(item)} activeOpacity={0.8}>
                <View style={previewStyles.artWrap}>
                  {item.albumArt ? (
                    <Image source={{ uri: item.albumArt }} style={previewStyles.art} contentFit="cover" />
                  ) : (
                    <View style={[previewStyles.art, previewStyles.artPlaceholder]}>
                      <Icon name="musical-note" size={22} color="rgba(255,255,255,0.25)" />
                    </View>
                  )}
                  {active && isPlaying && (
                    <View style={previewStyles.overlay}><Icon name="musical-note" size={18} color="#fff" /></View>
                  )}
                </View>
                <Text style={[previewStyles.name, active && { color: colors.primary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={previewStyles.artist} numberOfLines={1}>{item.artists.join(', ')}</Text>
              </TouchableOpacity>
            );
          })}
          {row.length === 1 && <View style={previewStyles.item} />}
        </View>
      ))}
    </View>
  );
}

// 플레이리스트 미리보기용 (작은 2열)
const PREV_PAD = spacing.lg;
const PREV_GAP = 10;
const PREV_W = (width - PREV_PAD * 2 - PREV_GAP) / 2;

const previewStyles = StyleSheet.create({
  grid: { paddingHorizontal: PREV_PAD, gap: PREV_GAP },
  row: { flexDirection: 'row', gap: PREV_GAP },
  item: { width: PREV_W },
  artWrap: { position: 'relative', marginBottom: 6 },
  art: { width: PREV_W, height: PREV_W, borderRadius: 10 },
  artPlaceholder: { backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 12, fontWeight: '600', color: '#fff', marginBottom: 1 },
  artist: { fontSize: 11, color: colors.textTertiary },
});

/* ═══════════════════════════════════════════════
   홈 탭 — Apple Music 스타일 홈 페이지
══════════════════════════════════════════════ */
function HomeTab({ tracks, currentTrack, isPlaying, likedIds, recentTracks, onSelectTrack, onToggleLike, onVocabPress, onOpenPlaylist, onOpenLibrary }: {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedIds: Set<string>;
  recentTracks: Track[];
  onSelectTrack: (t: Track) => void;
  onToggleLike: (id: string) => void;
  onVocabPress?: () => void;
  onOpenPlaylist?: () => void;
  onOpenLibrary?: () => void;
}) {
  const [showRecent, setShowRecent] = useState(false);
  const [showLibPage, setShowLibPage] = useState<'liked' | 'playlist' | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => loadPlaylist());

  const likedTracks = useMemo(() => {
    const trackMap = new Map<string, Track>();
    [...tracks, ...(playlist as unknown as Track[])].forEach(t => { if (!trackMap.has(t.id)) trackMap.set(t.id, t); });
    return [...likedIds].filter(id => trackMap.has(id)).map(id => trackMap.get(id)!);
  }, [tracks, playlist, likedIds]);
  const recent = recentTracks.length > 0 ? recentTracks : tracks.slice(0, 12);

  if (showRecent) {
    const recentFull = recentTracks.length > 0 ? recentTracks : tracks.slice(0, 20);
    return (
      <RecentPage
        tracks={recentFull}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onSelectTrack={(t) => { onSelectTrack(t); setShowRecent(false); }}
        onBack={() => setShowRecent(false)}
      />
    );
  }

  if (showLibPage === 'liked') {
    return (
      <LibraryGridPage
        title="즐겨찾기"
        items={likedTracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onSelect={(t) => { onSelectTrack(t); setShowLibPage(null); }}
        onBack={() => setShowLibPage(null)}
        onPlayAll={() => { if (likedTracks[0]) { onSelectTrack(likedTracks[0]); setShowLibPage(null); } }}
        onShuffleAll={() => {
          const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
          if (shuffled[0]) { onSelectTrack(shuffled[0]); setShowLibPage(null); }
        }}
      />
    );
  }

  if (showLibPage === 'playlist') {
    return (
      <LibraryGridPage
        title="플레이리스트"
        items={playlist}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onSelect={(t) => { onSelectTrack(t as unknown as Track); setShowLibPage(null); }}
        onBack={() => setShowLibPage(null)}
        onPlayAll={() => { if (playlist[0]) { onSelectTrack(playlist[0] as unknown as Track); setShowLibPage(null); } }}
        onShuffleAll={() => {
          const shuffled = [...playlist].sort(() => Math.random() - 0.5);
          if (shuffled[0]) { onSelectTrack(shuffled[0] as unknown as Track); setShowLibPage(null); }
        }}
      />
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: TAB_MINI_OFFSET }}
    >
      {/* 헤더 */}
      <View style={styles.homeHeader}>
        <TouchableOpacity onPress={() => { setShowRecent(false); setShowLibPage(null); }} activeOpacity={0.7}>
          <Text style={styles.homeTitle}>K-POP English</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onVocabPress} style={styles.vocabBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Icon name="book" size={26} color="rgba(255,255,255,0.85)" />
          <Text style={styles.vocabBtnLabel}>단어장</Text>
        </TouchableOpacity>
      </View>

      {/* ── 보관함 (즐겨찾기 + 플레이리스트 Apple Music 카드) ── */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionNavRow} onPress={onOpenLibrary} activeOpacity={0.7}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>보관함</Text>
          <Icon name="chevron-right" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'liked', label: '즐겨찾기', sublabel: '나만을 위한', items: likedTracks, onPress: () => setShowLibPage('liked') },
            { key: 'playlist', label: '플레이리스트', sublabel: '저장된 음악', items: playlist as any[], onPress: () => setShowLibPage('playlist') },
          ]}
          keyExtractor={d => d.key}
          contentContainerStyle={styles.hListPad}
          snapToInterval={FEAT_W + 12}
          decelerationRate="fast"
          renderItem={({ item: d }) => {
            // ── 즐겨찾기: Apple Music 인기 추천곡 스타일 (콜라주 배경 + 하단 타이틀)
            if (d.key === 'liked') {
              const arts = d.items.slice(0, 4).map((t: any) => t.albumArt).filter(Boolean);
              return (
                <TouchableOpacity style={stationCardStyles.card} onPress={d.onPress} activeOpacity={0.88}>
                  {arts.length >= 4 ? (
                    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}>
                      <View style={stationCardStyles.collageRow}>
                        <Image source={{ uri: arts[0] }} style={stationCardStyles.collageCell} contentFit="cover" />
                        <Image source={{ uri: arts[1] }} style={stationCardStyles.collageCell} contentFit="cover" />
                      </View>
                      <View style={stationCardStyles.collageRow}>
                        <Image source={{ uri: arts[2] }} style={stationCardStyles.collageCell} contentFit="cover" />
                        <Image source={{ uri: arts[3] }} style={stationCardStyles.collageCell} contentFit="cover" />
                      </View>
                    </View>
                  ) : arts.length > 0 ? (
                    <Image source={{ uri: arts[0] }} style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]} contentFit="cover" />
                  ) : (
                    <LinearGradient
                      colors={['#2d0845', '#160a38', '#070720']}
                      locations={[0, 0.55, 1]}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.78)']}
                    locations={[0.3, 1]}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }]}
                  />
                  {/* 빈 상태: 중앙 애니메이션 */}
                  {arts.length === 0 && (
                    <View style={stationCardStyles.emptyCenter}>
                      <AnimatedMusicBars barColor="rgba(220,100,130,0.95)" />
                      <Text style={stationCardStyles.emptyCenterTitle}>즐겨찾기</Text>
                      <Text style={stationCardStyles.emptyCenterSub}>재생 화면의 ♥ 버튼으로{'\n'}좋아하는 곡을 저장하세요</Text>
                    </View>
                  )}
                  {arts.length > 0 && (
                    <View style={stationCardStyles.likedBottom}>
                      <Text style={stationCardStyles.sublabel}>{d.sublabel}</Text>
                      <Text style={stationCardStyles.likedLabel}>{d.label}</Text>
                      <Text style={stationCardStyles.count}>{d.items.length}곡</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }

            // ── 플레이리스트: 3×2 그리드
            const six = d.items.slice(0, 6);
            return (
              <View style={stationCardStyles.cardPadded}>
                <TouchableOpacity style={stationCardStyles.header} onPress={d.onPress} activeOpacity={0.7}>
                  <View>
                    <Text style={stationCardStyles.sublabel}>{d.sublabel}</Text>
                    <Text style={stationCardStyles.label}>{d.label}</Text>
                  </View>
                  <View style={stationCardStyles.headerRight}>
                    <Text style={stationCardStyles.count}>{d.items.length}곡</Text>
                    <Icon name="chevron-right" size={14} color="rgba(255,255,255,0.45)" />
                  </View>
                </TouchableOpacity>
                {six.length === 0 ? (
                  <View style={stationCardStyles.emptyPlaylist}>
                    <LinearGradient
                      colors={['#041a3a', '#08102e', '#030810']}
                      locations={[0, 0.55, 1]}
                      style={[StyleSheet.absoluteFillObject, { borderRadius: 12, margin: -SC_PAD }]}
                    />
                    <View style={{ zIndex: 1, alignItems: 'center', gap: 12 }}>
                      <AnimatedMusicBars barColor="rgba(80,160,255,0.95)" />
                      <Text style={stationCardStyles.emptyCenterTitle}>플레이리스트</Text>
                      <Text style={stationCardStyles.emptyCenterSub}>검색 탭에서 마음에 드는{'\n'}곡을 추가하세요</Text>
                    </View>
                  </View>
                ) : (
                  <View style={stationCardStyles.grid}>
                    {six.map((item: any) => {
                      const active = currentTrack?.id === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={stationCardStyles.cell}
                          onPress={() => onSelectTrack(item as unknown as Track)}
                          activeOpacity={0.8}
                        >
                          <View style={stationCardStyles.artWrap}>
                            {item.albumArt ? (
                              <Image source={{ uri: item.albumArt }} style={stationCardStyles.art} contentFit="cover" />
                            ) : (
                              <View style={[stationCardStyles.art, stationCardStyles.artPlaceholder]}>
                                <Icon name="musical-note" size={16} color="rgba(255,255,255,0.3)" />
                              </View>
                            )}
                            {active && isPlaying && (
                              <View style={stationCardStyles.artOverlay}>
                                <Icon name="musical-note" size={14} color="#fff" />
                              </View>
                            )}
                          </View>
                          <Text style={[stationCardStyles.cellName, active && { color: colors.primary }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>

      {/* ── 최근 추가된 음악 (플레이리스트 최신순) ── */}
      {playlist.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionNavRow} onPress={() => setShowLibPage('playlist')} activeOpacity={0.7}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>최근 추가된 음악</Text>
            <Icon name="chevron-right" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={playlist.slice(0, 15)}
            keyExtractor={i => i.id + '_na'}
            contentContainerStyle={styles.hListPad}
            renderItem={({ item }) => {
              const active = currentTrack?.id === item.id;
              return (
                <TouchableOpacity style={styles.recentCard} onPress={() => onSelectTrack(item as unknown as Track)} activeOpacity={0.8}>
                  <View style={styles.recentArtWrap}>
                    {item.albumArt ? (
                      <Image source={{ uri: item.albumArt }} style={styles.recentArt} contentFit="cover" />
                    ) : (
                      <View style={[styles.recentArt, { backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }]}>
                        <Icon name="musical-note" size={28} color="rgba(255,255,255,0.25)" />
                      </View>
                    )}
                    {active && isPlaying && (
                      <View style={styles.recentOverlay}><Icon name="musical-note" size={18} color="#fff" /></View>
                    )}
                  </View>
                  <Text style={[styles.recentName, active && { color: colors.primary }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.recentArtist} numberOfLines={1}>{item.artists.join(', ')}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ── 최근 재생한 음악 ── */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionNavRow} onPress={() => setShowRecent(true)} activeOpacity={0.7}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>최근 재생한 음악</Text>
          <Icon name="chevron-right" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={recent}
          keyExtractor={i => i.id + '_r'}
          contentContainerStyle={styles.hListPad}
          renderItem={({ item }) => {
            const active = currentTrack?.id === item.id;
            return (
              <TouchableOpacity style={styles.recentCard} onPress={() => onSelectTrack(item)} activeOpacity={0.8}>
                <View style={styles.recentArtWrap}>
                  <Image source={{ uri: item.albumArt }} style={styles.recentArt} contentFit="cover" />
                  {active && isPlaying && (
                    <View style={styles.recentOverlay}><Icon name="musical-note" size={18} color="#fff" /></View>
                  )}
                </View>
                <Text style={[styles.recentName, active && { color: colors.primary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.recentArtist} numberOfLines={1}>{item.artists.join(', ')}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── BTS 앨범 목록 ── */}
      {tracks.length > 0 && (
        <AlbumDropdownList
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          likedIds={likedIds}
          onSelectTrack={onSelectTrack}
          onToggleLike={onToggleLike}
          sectionTitle="BTS 앨범"
          initialExpanded={false}
        />
      )}
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════
   보관함 탭 — 플레이리스트 + 즐겨찾기 섹션
══════════════════════════════════════════════ */
function LibraryTab({ tracks, currentTrack, isPlaying, likedIds, onSelectTrack, onToggleLike }: {
  tracks: Track[]; currentTrack: Track | null; isPlaying: boolean;
  likedIds: Set<string>; onSelectTrack: (t: Track) => void; onToggleLike: (id: string) => void;
}) {
  const [playlist, setPlaylist] = useState(() => loadPlaylist());
  const [editMode, setEditMode] = useState(false);
  const likedTracks = useMemo(() => {
    const trackMap = new Map<string, Track>();
    [...tracks, ...(playlist as unknown as Track[])].forEach(t => { if (!trackMap.has(t.id)) trackMap.set(t.id, t); });
    return [...likedIds].filter(id => trackMap.has(id)).map(id => trackMap.get(id)!);
  }, [tracks, playlist, likedIds]);

  const handleRemove = (id: string) => {
    removeFromPlaylist(id);
    setPlaylist(loadPlaylist());
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_MINI_OFFSET }}>
      <View style={styles.listHeader}>
        <Text style={styles.homeTitle}>보관함</Text>
      </View>

      {/* ── 플레이리스트 섹션 (앨범별 드롭다운) */}
      {playlist.length === 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Icon name="musical-note" size={15} color="#60a5fa" />
            <Text style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}>플레이리스트</Text>
          </View>
          <View style={[styles.libEmpty, { paddingVertical: 20, alignItems: 'center' }]}>
            <Icon name="musical-note" size={36} color={colors.textTertiary} />
            <Text style={[styles.libEmptyText, { marginTop: 8 }]}>검색탭에서 곡을 추가하세요</Text>
          </View>
        </View>
      ) : (
        <View>
          {/* 플레이리스트 헤더 + 편집 버튼 */}
          <View style={styles.libEditHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="musical-note" size={15} color="#60a5fa" />
              <Text style={styles.sectionTitle}>플레이리스트</Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>{playlist.length}곡</Text>
            </View>
            <TouchableOpacity onPress={() => setEditMode(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.libEditBtn, editMode && styles.libEditBtnActive]}>
                {editMode ? '완료' : '편집'}
              </Text>
            </TouchableOpacity>
          </View>
          <AlbumDropdownList
            tracks={playlist as unknown as Track[]}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            likedIds={likedIds}
            onSelectTrack={onSelectTrack}
            onToggleLike={onToggleLike}
            initialExpanded={true}
            minGroupSize={2}
            editMode={editMode}
            onDelete={handleRemove}
          />
        </View>
      )}

      {/* ── 즐겨찾기 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Icon name="heart-fill" size={15} color={colors.primary} />
          <Text style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}>즐겨찾기</Text>
          {likedTracks.length > 0 && (
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginLeft: 4 }}>{likedTracks.length}곡</Text>
          )}
        </View>
        {likedTracks.length === 0 ? (
          <View style={[styles.libEmpty, { paddingVertical: 20, alignItems: 'center' }]}>
            <Icon name="heart" size={36} color={colors.textTertiary} />
            <Text style={[styles.libEmptyText, { marginTop: 8 }]}>재생 화면에서 ♥ 버튼으로 추가하세요</Text>
          </View>
        ) : (
          likedTracks.map(item => (
            <TrackRow key={item.id} item={item} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onSelect={onSelectTrack} onLike={onToggleLike} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════
   즐겨찾기 탭
══════════════════════════════════════════════ */
function LikedTab({ tracks, currentTrack, isPlaying, likedIds, onSelectTrack, onToggleLike }: {
  tracks: Track[]; currentTrack: Track | null; isPlaying: boolean;
  likedIds: Set<string>; onSelectTrack: (t: Track) => void; onToggleLike: (id: string) => void;
}) {
  const playlist = useMemo(() => loadPlaylist(), []);
  const liked = useMemo(() => {
    const trackMap = new Map<string, Track>();
    [...tracks, ...(playlist as unknown as Track[])].forEach(t => { if (!trackMap.has(t.id)) trackMap.set(t.id, t); });
    return [...likedIds].filter(id => trackMap.has(id)).map(id => trackMap.get(id)!);
  }, [tracks, playlist, likedIds]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.listHeader}>
        <Text style={styles.homeTitle}>즐겨찾기</Text>
        {liked.length > 0 && <Text style={styles.listHeaderSub}>{liked.length}곡</Text>}
      </View>
      {liked.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="heart" size={52} color={colors.textTertiary} />
          <Text style={styles.emptyText}>즐겨찾기한 곡이 없습니다</Text>
          <Text style={styles.emptyHint}>보관함에서 ♡ 버튼을 눌러 추가하세요</Text>
        </View>
      ) : (
        <FlatList
          data={liked}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <TrackRow item={item} currentTrack={currentTrack} isPlaying={isPlaying} likedIds={likedIds} onSelect={onSelectTrack} onLike={onToggleLike} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_MINI_OFFSET }}
        />
      )}
    </View>
  );
}

/* ── 공통 트랙 행 ── */
function TrackRow({ item, currentTrack, isPlaying, likedIds, onSelect, onLike }: {
  item: Track; currentTrack: Track | null; isPlaying: boolean;
  likedIds: Set<string>; onSelect: (t: Track) => void; onLike: (id: string) => void;
}) {
  const active = currentTrack?.id === item.id;
  const liked = likedIds.has(item.id);
  return (
    <TouchableOpacity
      style={[styles.trackRow, active && styles.trackRowActive]}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.albumArt }} style={styles.trackArt} contentFit="cover" />
      <View style={styles.trackInfo}>
        <Text style={[styles.trackName, active && { color: colors.primary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artists.join(', ')}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onLike(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.likeBtn}
      >
        <Icon name={liked ? 'heart-fill' : 'heart'} size={17} color={liked ? colors.primary : 'rgba(255,255,255,0.28)'} />
      </TouchableOpacity>
      <View style={styles.trackRight}>
        {active && isPlaying ? (
          <Icon name="musical-note" size={16} color={colors.primary} />
        ) : (
          <Text style={styles.duration}>{fmt(item.durationMs)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════
   메인 HomeScreen
══════════════════════════════════════════════ */
const HomeScreen = React.memo(function HomeScreen({
  activeTab, tracks, currentTrack, isPlaying, likedIds, recentTracks, onSelectTrack, onToggleLike, onVocabPress, playlistCount, onOpenPlaylist, onOpenLibrary,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {activeTab === 'home' && (
        <HomeTab
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          likedIds={likedIds}
          recentTracks={recentTracks}
          onSelectTrack={onSelectTrack}
          onToggleLike={onToggleLike}
          onVocabPress={onVocabPress}
          onOpenPlaylist={onOpenPlaylist}
          onOpenLibrary={onOpenLibrary}
        />
      )}
      {activeTab === 'library' && (
        <LibraryTab
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          likedIds={likedIds}
          onSelectTrack={onSelectTrack}
          onToggleLike={onToggleLike}
        />
      )}
      {activeTab === 'liked' && (
        <LikedTab
          tracks={tracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          likedIds={likedIds}
          onSelectTrack={onSelectTrack}
          onToggleLike={onToggleLike}
        />
      )}
    </SafeAreaView>
  );
});

export default HomeScreen;

/* ── 보관함 스테이션 카드 (Apple Music 인기 추천곡 크기 + 내부 6곡 그리드) ── */
const SC_PAD = 12;
const SC_GAP = 8;
const SC_COLS = 3;
const SC_ROWS = 2;
const SC_ART = (FEAT_W - SC_PAD * 2 - SC_GAP * (SC_COLS - 1)) / SC_COLS;
const SC_CELL_H = (FEAT_H - SC_PAD * 2 - 62 - SC_GAP * (SC_ROWS - 1) - 10) / SC_ROWS; // 62 = header, 10 = gap below header

const stationCardStyles = StyleSheet.create({
  card: {
    width: FEAT_W,
    height: FEAT_H,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(22,22,35,0.97)',
  },
  cardPadded: {
    width: FEAT_W,
    height: FEAT_H,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(22,22,35,0.97)',
    padding: SC_PAD,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
    height: 62,
    paddingBottom: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  sublabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
    fontWeight: '500',
  },
  label: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  count: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SC_GAP,
  },
  cell: {
    width: SC_ART,
    height: SC_CELL_H,
  },
  artWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  art: {
    width: SC_ART,
    height: SC_ART,
    borderRadius: 8,
  },
  artPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  /* 즐겨찾기 Apple Music 스타일 */
  collageRow: {
    flex: 1,
    flexDirection: 'row',
  },
  collageCell: {
    flex: 1,
  },
  likedBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 18,
  },
  likedLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  /* 빈 상태 - 중앙 */
  emptyCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  emptyPlaylist: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  emptyCenterTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  emptyCenterSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
  },
});

/* ── 스타일 ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* 홈 헤더 */
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  homeTitle: { fontSize: 30, fontWeight: '800', color: '#fff' },
  vocabBtn: { alignItems: 'center', gap: 2 },
  vocabBtnLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  /* 섹션 */
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 20, fontWeight: '800', color: '#fff',
    paddingHorizontal: spacing.lg, marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.lg, marginBottom: 12,
  },
  sectionNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, marginBottom: 12,
  },
  hListPad: { paddingHorizontal: spacing.lg, gap: 12 },

  libEmpty: { paddingHorizontal: spacing.lg, paddingVertical: 8 },
  libEmptyText: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },

  /* 최근 재생 */
  recentCard: { width: RECENT_SZ },
  recentArtWrap: { position: 'relative', marginBottom: 7 },
  recentArt: {
    width: RECENT_SZ, height: RECENT_SZ,
    borderRadius: 10,
  },
  recentOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  recentName: { fontSize: 13, fontWeight: '500', color: '#fff', marginBottom: 2 },
  recentArtist: { fontSize: 11, color: colors.textTertiary },

  /* 스테이션 배너 */
  stationCard: {
    marginHorizontal: spacing.lg,
    height: 90, borderRadius: 16, overflow: 'hidden',
  },
  stationRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, gap: 16,
  },
  stationLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 3 },
  stationTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  /* 보관함 헤더 */
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  listHeaderSub: { fontSize: 14, color: colors.textTertiary },

  /* 앨범 드롭다운 섹션 */
  dropSection: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dropHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 12,
  },
  dropArt: { width: 56, height: 56, borderRadius: 10 },
  dropInfo: { flex: 1 },
  dropAlbumName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 3 },
  dropAlbumMeta: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  dropChevron: { transform: [{ rotate: '90deg' }] },
  dropChevronOpen: { transform: [{ rotate: '-90deg' }] },

  dropBody: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  dropTrackRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropTrackRowLast: { borderBottomWidth: 0 },
  dropTrackRowActive: { backgroundColor: 'rgba(252,60,68,0.07)' },
  dropTrackNum: {
    width: 22, fontSize: 12, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', fontWeight: '500',
  },
  dropTrackInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dropTrackName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#fff' },
  dropTrackDur: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  dropLikeBtn: { width: 28, alignItems: 'center' },
  dropDeleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 2,
  },
  libEditHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, marginBottom: 12,
  },
  libEditBtn: {
    fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.6)',
  },
  libEditBtnActive: {
    color: colors.primary,
  },

  /* 트랙 행 */
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    gap: 10,
  },
  trackRowActive: { backgroundColor: 'rgba(252,60,68,0.07)' },
  trackArt: { width: 48, height: 48, borderRadius: 8 },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 15, fontWeight: '500', color: '#fff', marginBottom: 3 },
  trackArtist: { fontSize: 12, color: colors.textTertiary },
  likeBtn: { width: 30, alignItems: 'center' },
  trackRight: { width: 34, alignItems: 'flex-end' },
  duration: { fontSize: 12, color: colors.textTertiary },

  /* 플레이리스트 카드 */
  playlistCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  /* 빈 상태 */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500', color: colors.textSecondary },
  emptyHint: { fontSize: 13, color: colors.textTertiary },
});
