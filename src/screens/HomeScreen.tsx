import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import MiniPlayer from '../components/MiniPlayer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = width * 0.38; // 가로 스크롤: 한번에 ~2.5장 보임

interface Props {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  likedTrackIds: Set<string>;
  onSelectTrack: (track: Track) => void;
  onOpenPlayer: () => void;
  onVocabPress: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  loadError?: string | null;
}

interface Album {
  name: string;
  art: string;
  tracks: Track[];
}

export default function HomeScreen({
  tracks, currentTrack, isPlaying, currentMs, durationMs, likedTrackIds,
  onSelectTrack, onOpenPlayer, onVocabPress, onPlayPause, onNext, loadError,
}: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  const searchQuery = searchInput.trim().toLowerCase();
  const displayTracks = searchQuery
    ? tracks.filter((t) =>
        t.name.toLowerCase().includes(searchQuery) ||
        t.artists.some((a) => a.toLowerCase().includes(searchQuery)) ||
        t.album.toLowerCase().includes(searchQuery)
      )
    : tracks;

  const albums = useMemo((): Album[] => {
    const map = new Map<string, Album>();
    for (const t of displayTracks) {
      if (!map.has(t.album)) {
        map.set(t.album, { name: t.album, art: t.albumArt, tracks: [] });
      }
      map.get(t.album)!.tracks.push(t);
    }
    return Array.from(map.values());
  }, [displayTracks]);

  // 최신 5개 앨범 (기본 BTS일 때만 노출)
  const featuredAlbums = useMemo(() => albums.slice(0, 5), [albums]);

  // 즐겨찾기 트랙 (좋아요 누른 순서 유지)
  const likedTracks = useMemo(
    () => tracks.filter((t) => likedTrackIds.has(t.id)),
    [tracks, likedTrackIds]
  );

  const clearSearch = () => {
    setSearchInput('');
    setExpandedAlbums(new Set());
  };

  const toggleAlbum = (albumName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumName)) next.delete(albumName); else next.add(albumName);
      return next;
    });
  };

  const renderTrack = (item: Track) => {
    const isActive = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.trackItem, isActive && styles.trackItemActive]}
        onPress={() => onSelectTrack(item)}
        activeOpacity={0.7}
      >
        {/* 아트 썸네일 (아이콘 대체) */}
        <Image source={{ uri: item.albumArt }} style={styles.trackThumb} contentFit="cover" />
        <View style={styles.trackInfo}>
          <Text style={[styles.trackName, isActive && styles.trackNameActive]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.trackSub} numberOfLines={1}>{item.artists.join(', ')}</Text>
        </View>
        <View style={styles.trackRight}>
          {isActive && isPlaying
            ? <Text style={styles.playingBadge}>▶ 재생중</Text>
            : <Text style={styles.duration}>
                {Math.floor(item.durationMs / 60000)}:{String(Math.floor((item.durationMs % 60000) / 1000)).padStart(2, '0')}
              </Text>
          }
        </View>
      </TouchableOpacity>
    );
  };

  const renderAlbum = ({ item }: { item: Album }) => {
    const isExpanded = expandedAlbums.has(item.name);
    const hasActive = item.tracks.some((t) => t.id === currentTrack?.id);
    return (
      <View style={styles.albumWrapper}>
        {/* ── 앨범 헤더 카드 ── */}
        <TouchableOpacity
          style={[styles.albumHeaderCard, hasActive && styles.albumHeaderCardActive]}
          onPress={() => toggleAlbum(item.name)}
          activeOpacity={0.75}
        >
          <Image source={{ uri: item.art }} style={styles.albumArt} contentFit="cover" />
          <View style={styles.albumInfo}>
            <Text style={[styles.albumName, hasActive && { color: colors.primary }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.albumCount}>{item.tracks.length}곡</Text>
          </View>
          <Text style={[styles.chevron, hasActive && { color: colors.primary }]}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {/* ── 트랙 목록 카드 (분리된 카드) ── */}
        {isExpanded && (
          <View style={styles.trackListCard}>
            {item.tracks.map(renderTrack)}
          </View>
        )}
      </View>
    );
  };

  // FlatList 스크롤 헤더 (검색창 제외 — TextInput이 여기 있으면 리렌더마다 remount되어 포커스 손실)
  const scrollHeader = (
    <>
      {/* ── 즐겨찾기 (검색 전에만) ── */}
      {!searchQuery && likedTracks.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={styles.sectionLabel}>★ 즐겨찾기</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRow}
          >
            {likedTracks.map((track) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.favCard, isActive && styles.favCardActive]}
                  onPress={() => onSelectTrack(track)}
                  activeOpacity={0.8}
                >
                  <View style={styles.favArtWrap}>
                    <Image source={{ uri: track.albumArt }} style={styles.favArt} contentFit="cover" />
                    <View style={styles.favStarBadge}>
                      <Text style={styles.favStarText}>★</Text>
                    </View>
                  </View>
                  <Text style={[styles.featuredName, isActive && { color: colors.primary }]} numberOfLines={2}>
                    {track.name}
                  </Text>
                  <Text style={styles.featuredCount} numberOfLines={1}>{track.artists[0]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── 최신 앨범 5개 가로 스크롤 (검색 전에만) ── */}
      {!searchQuery && featuredAlbums.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={styles.sectionLabel}>최신 앨범</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRow}
          >
            {featuredAlbums.map((album) => (
              <TouchableOpacity
                key={album.name}
                style={styles.featuredCard}
                onPress={() => onSelectTrack(album.tracks[0])}
                activeOpacity={0.8}
              >
                <Image source={{ uri: album.art }} style={styles.featuredArt} contentFit="cover" />
                <Text style={styles.featuredName} numberOfLines={2}>{album.name}</Text>
                <Text style={styles.featuredCount}>{album.tracks.length}곡</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── 단어장 버튼 ── */}
      {!searchQuery && (
        <TouchableOpacity style={styles.vocabCard} onPress={onVocabPress} activeOpacity={0.8}>
          <Text style={styles.vocabCardIcon}>📖</Text>
          <View style={styles.vocabCardInfo}>
            <Text style={styles.vocabCardTitle}>단어장</Text>
            <Text style={styles.vocabCardSub}>저장한 영어 단어 보기 · 편집</Text>
          </View>
          <Text style={styles.vocabCardArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── 전체 앨범 섹션 레이블 ── */}
      <Text style={styles.sectionLabel}>
        {searchQuery ? `"${searchInput.trim()}" 검색 결과` : '전체 앨범'}
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── 헤더 + 검색창 (FlatList 밖에 고정 — remount 방지) ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>K-pop English</Text>
          <Text style={styles.title}>{searchQuery || 'POP ENGLISH'}</Text>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="아티스트 · 노래 · 앨범 검색"
          placeholderTextColor="rgba(255,255,255,0.35)"
          returnKeyType="search"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
          data={albums}
          keyExtractor={(item) => item.name}
          renderItem={renderAlbum}
          ListHeaderComponent={scrollHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: currentTrack ? 110 : 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>
                {searchQuery ? '🔍' : loadError ? '⚠️' : '🎵'}
              </Text>
              <Text style={[styles.emptyText, loadError && { color: colors.primary }]}>
                {searchQuery
                  ? `"${searchInput.trim()}" 검색 결과가 없습니다`
                  : loadError ?? 'BTS 곡을 불러오는 중...\n잠시 기다려주세요'}
              </Text>
              {loadError && !searchQuery && (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    if (typeof localStorage !== 'undefined') localStorage.clear();
                    if (typeof window !== 'undefined') window.location.href = '/';
                  }}
                >
                  <Text style={styles.retryText}>다시 시도</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

      {currentTrack && (
        <MiniPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          currentMs={currentMs}
          durationMs={durationMs}
          onPress={onOpenPlayer}
          onPlayPause={onPlayPause}
          onNext={onNext}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* ── 헤더 ── */
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 12, color: colors.primary, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 2 },

  /* ── 검색 ── */
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingHorizontal: 16, height: 52, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 17, color: '#fff', paddingVertical: 0 },
  clearBtn: { fontSize: 14, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 4 },

  /* ── 최신 앨범 featured ── */
  featuredSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: spacing.lg, marginBottom: 12, marginTop: 4,
  },
  featuredRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.lg,
    gap: 10,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featuredArt: {
    width: '100%',
    aspectRatio: 1,
  },
  featuredName: {
    fontSize: 13, fontWeight: '700', color: '#fff',
    paddingHorizontal: 8, paddingTop: 8, lineHeight: 18,
  },
  featuredCount: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 8, paddingBottom: 8, marginTop: 2,
  },

  /* ── 즐겨찾기 카드 ── */
  favCard: {
    width: FEATURED_CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  favCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(252,60,68,0.08)',
  },
  favArtWrap: { position: 'relative' },
  favArt: { width: '100%', aspectRatio: 1 },
  favStarBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  favStarText: { fontSize: 13, color: '#FFD60A' },

  /* ── 단어장 카드 버튼 ── */
  vocabCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(252,60,68,0.1)',
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.md, gap: 14,
    borderWidth: 1, borderColor: 'rgba(252,60,68,0.25)',
  },
  vocabCardIcon: { fontSize: 32 },
  vocabCardInfo: { flex: 1 },
  vocabCardTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  vocabCardSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  vocabCardArrow: { fontSize: 28, color: 'rgba(255,255,255,0.3)', lineHeight: 32 },

  /* ── 앨범 wrapper ── */
  albumWrapper: {
    marginHorizontal: spacing.lg,
    marginBottom: 14,
    gap: 6,
  },

  /* 앨범 헤더 카드 (독립 카드) */
  albumHeaderCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 14,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  albumHeaderCardActive: {
    backgroundColor: 'rgba(252,60,68,0.12)',
    borderColor: 'rgba(252,60,68,0.3)',
  },
  albumArt: { width: 64, height: 64, borderRadius: 12 },
  albumInfo: { flex: 1 },
  albumName: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },
  albumCount: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  chevron: { fontSize: 14, color: 'rgba(255,255,255,0.5)', width: 22, textAlign: 'center' },

  /* 트랙 목록 카드 (독립 카드) */
  trackListCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    paddingVertical: 4,
  },

  /* ── 트랙 ── */
  trackItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  trackItemActive: { backgroundColor: 'rgba(252,60,68,0.08)' },
  trackThumb: { width: 40, height: 40, borderRadius: 6 },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 16, fontWeight: '500', color: '#fff' },
  trackNameActive: { color: colors.primary },
  trackSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  trackRight: { alignItems: 'flex-end' },
  duration: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  playingBadge: { fontSize: 11, fontWeight: '700', color: colors.primary },

  /* ── 빈 화면 ── */
  empty: { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyIcon: { fontSize: 48 },
  emptyText: { textAlign: 'center', color: colors.textTertiary, fontSize: 16, lineHeight: 24 },
  retryBtn: {
    marginTop: 8, backgroundColor: colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
