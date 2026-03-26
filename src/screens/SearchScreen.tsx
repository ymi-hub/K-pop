import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, TextInput, ActivityIndicator, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import Icon from '../components/Icon';
import { TAB_BAR_H } from '../components/TabBar';
import { searchYouTube } from '../services/youtubeSearch';
import { getLyrics } from '../services/lyrics';
import {
  addToPlaylist, removeFromPlaylist,
  cacheLyrics, getCachedLyrics, loadPlaylist,
} from '../services/playlistStorage';
import { ytCache } from '../data/btsSongs';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  onPlayTrack: (track: Track) => void;
  onPlaylistChange: () => void;
}

interface MusicResult {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
}

interface AlbumGroup {
  key: string;       // artist::album 고유 키
  album: string;
  artist: string;
  albumArt: string;
  tracks: MusicResult[];
}

// ── iTunes 결과 파싱 ──────────────────────────────────
function parseItunesData(data: any): MusicResult[] {
  const items: any[] = data?.results ?? [];
  return items.map(r => ({
    id: `itunes_${r.trackId}`,
    name: r.trackName ?? '',
    artist: r.artistName ?? '',
    album: r.collectionName ?? '',
    albumArt: r.artworkUrl100?.replace('100x100bb', '600x600bb') ?? '',
    durationMs: r.trackTimeMillis ?? 0,
  }));
}

// ── iTunes Search ────────────────────────────────────
// credentials:'omit' — iOS에서 Apple ID 쿠키 자동 첨부로 인한 CORS 오류 방지
async function searchItunes(query: string): Promise<MusicResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=50&country=us`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { credentials: 'omit', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    return parseItunesData(await res.json());
  } catch {
    return [];
  }
}

// ── lrclib Search (폴백) ─────────────────────────────
async function searchLrcLib(query: string): Promise<MusicResult[]> {
  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data: any[] = await res.json();
    return data.slice(0, 50).map(r => ({
      id: `lrc_${r.id}`,
      name: r.trackName ?? '',
      artist: r.artistName ?? '',
      album: r.albumName ?? '',
      albumArt: '',
      durationMs: Math.round((r.duration ?? 0) * 1000),
    }));
  } catch { return []; }
}

// 이름 정규화: 소문자 + 특수문자 제거 (한글 포함)
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[\s\-_',.!?()\[\]]/g, '').replace(/[^a-z0-9가-힣]/g, '');
}

// iTunes 곡이 lrclib 결과에 매칭되는지 확인
function hasLyricsMatch(name: string, lrcNames: string[]): boolean {
  const n = normalizeName(name);
  if (!n) return false;
  return lrcNames.some(ln => {
    if (!ln) return false;
    return ln === n || (n.length > 3 && ln.includes(n)) || (ln.length > 3 && n.includes(ln));
  });
}

// lrclib 조회 (타임아웃 3초)
async function fetchLrcNames(query: string): Promise<string[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
      { credentials: 'omit', signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const data: any[] = await res.json();
    return data.slice(0, 100).map(r => normalizeName(r.trackName ?? ''));
  } catch {
    return [];
  }
}

// 곡명에서 괄호/대시 이후 버전 표기 제거 (feat, remix, ver, edit 등)
function baseTrackName(name: string): string {
  return normalizeName(name.replace(/[\(\-].*$/i, '').trim());
}

// 곡명(버전 무시) + 아티스트 기준 중복 제거 (첫 번째 등장 우선)
function deduplicateTracks(results: MusicResult[]): MusicResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${baseTrackName(r.name)}::${normalizeName(r.artist)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchMusic(query: string): Promise<MusicResult[]> {
  // iTunes + lrclib 병렬 조회
  const [itunes, lrcNames] = await Promise.all([
    searchItunes(query),
    fetchLrcNames(query),
  ]);

  // 이미지 있는 곡만 추림 + 중복 제거
  const withImage = deduplicateTracks(itunes.filter(r => !!r.albumArt));
  if (withImage.length === 0) return [];

  // lrclib 결과 없으면 이미지 있는 곡 전체 반환
  if (lrcNames.length === 0) return withImage;

  // lrclib에 매칭되는 곡 우선, 없으면 이미지 있는 전체 반환
  const matched = withImage.filter(r => hasLyricsMatch(r.name, lrcNames));
  return matched.length > 0 ? matched : withImage;
}

// ── 앨범별 그룹화 ─────────────────────────────────────
function groupByAlbum(results: MusicResult[]): AlbumGroup[] {
  const map = new Map<string, AlbumGroup>();
  for (const r of results) {
    const albumName = r.album.trim() || '알 수 없는 앨범';
    // 앨범명도 normalizeName으로 정규화 → 표기 차이 중복 앨범 통합
    const key = `${normalizeName(r.artist)}::${normalizeName(albumName)}`;
    if (!map.has(key)) {
      map.set(key, { key, album: albumName, artist: r.artist, albumArt: r.albumArt, tracks: [] });
    }
    const g = map.get(key)!;
    g.tracks.push(r);
    if (!g.albumArt && r.albumArt) g.albumArt = r.albumArt;
  }
  return Array.from(map.values());
}

function resultToTrack(r: MusicResult): Track {
  return {
    id: r.id, name: r.name, artists: [r.artist],
    album: r.album, albumArt: r.albumArt, durationMs: r.durationMs,
    previewUrl: null, spotifyUri: '',
  };
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function SearchScreen({ onPlayTrack, onPlaylistChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [inPlaylistIds, setInPlaylistIds] = useState<Set<string>>(
    () => new Set(loadPlaylist().map(t => t.id))
  );
  const [addingId, setAddingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = useMemo(() => groupByAlbum(results), [results]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const items = await searchMusic(q);
      setResults(items);
      // 기본: 첫 번째 앨범만 펼침
      const gs = groupByAlbum(items);
      setExpanded(gs.length > 0 ? new Set([gs[0].key]) : new Set());
      setSearching(false);
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const toggleExpand = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handlePlay = async (r: MusicResult) => {
    const track = resultToTrack(r);
    setPlayingId(r.id);
    try {
      if (!ytCache.has(r.id)) {
        const yt = await searchYouTube(r.name, r.artist);
        if (yt) ytCache.set(r.id, yt);
      }
      onPlayTrack(track);
    } finally { setPlayingId(null); }
  };

  const handleAdd = async (r: MusicResult) => {
    const track = resultToTrack(r);
    if (inPlaylistIds.has(r.id)) {
      removeFromPlaylist(r.id);
      setInPlaylistIds(prev => { const n = new Set(prev); n.delete(r.id); return n; });
      onPlaylistChange();
      return;
    }
    setAddingId(r.id);
    try {
      let videoId: string | undefined = ytCache.get(r.id)?.videoId;
      if (!videoId) {
        const yt = await searchYouTube(r.name, r.artist);
        if (yt) { ytCache.set(r.id, yt); videoId = yt.videoId; }
      }
      if (!getCachedLyrics(r.id)) {
        const lyricsArr = await getLyrics(r.name, r.artist, r.durationMs || undefined);
        if (lyricsArr.length > 0) cacheLyrics(r.id, JSON.stringify(lyricsArr));
      }
      addToPlaylist(track, videoId);
      setInPlaylistIds(prev => new Set([...prev, r.id]));
      setJustAdded(prev => ({ ...prev, [r.id]: true }));
      onPlaylistChange();
      setTimeout(() => setJustAdded(prev => { const n = { ...prev }; delete n[r.id]; return n; }), 2000);
    } finally { setAddingId(null); }
  };

  // 앨범의 모든 곡 일괄 추가
  const handleAddAlbum = async (group: AlbumGroup) => {
    const toAdd = group.tracks.filter(r => !inPlaylistIds.has(r.id));
    if (toAdd.length === 0) return;
    for (const r of toAdd) await handleAdd(r);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>검색</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={[styles.input, { outlineStyle: 'none' } as any]}
            placeholder="곡명, 아티스트, 앨범 검색..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searching
            ? <ActivityIndicator size="small" color={colors.primary} />
            : query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={14} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
        </View>
      </View>

      {/* 빈 상태 안내 */}
      {query.trim().length === 0 && (
        <View style={styles.placeholder}>
          <Icon name="search" size={52} color="rgba(255,255,255,0.1)" />
          <Text style={styles.placeholderText}>곡명이나 아티스트를 입력하세요</Text>
          <Text style={styles.placeholderHint}>앨범별로 묶어서 보여드립니다</Text>
        </View>
      )}

      {/* 결과 수 */}
      {groups.length > 0 && (
        <Text style={styles.resultMeta}>
          앨범 {groups.length}개 · 곡 {results.length}개
        </Text>
      )}

      {/* 앨범 그룹 리스트 */}
      <FlatList
        data={groups}
        keyExtractor={g => g.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_H + 80 }}
        ListEmptyComponent={
          !searching && query.trim().length >= 2
            ? <View style={styles.noResult}><Text style={styles.noResultText}>검색 결과가 없습니다</Text></View>
            : null
        }
        renderItem={({ item: group }) => {
          // ── 단일 곡: 드롭다운 없이 바로 표시 ──
          if (group.tracks.length === 1) {
            const r = group.tracks[0];
            const inList = inPlaylistIds.has(r.id);
            const isAdding = addingId === r.id;
            const isPlayLoading = playingId === r.id;
            const added = justAdded[r.id];
            return (
              <TouchableOpacity
                style={styles.singleRow}
                onPress={() => handlePlay(r)}
                activeOpacity={0.75}
              >
                {r.albumArt ? (
                  <Image source={{ uri: r.albumArt }} style={styles.singleArt} contentFit="cover" />
                ) : (
                  <View style={[styles.singleArt, styles.albumArtPlaceholder]}>
                    <Icon name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <View style={styles.singleInfo}>
                  <Text style={styles.singleName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.singleArtist} numberOfLines={1}>{r.artist}</Text>
                </View>
                {isPlayLoading
                  ? <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                  : null}
                <TouchableOpacity
                  onPress={() => handleAdd(r)}
                  style={[styles.addBtn, inList && styles.addBtnIn]}
                  disabled={isAdding}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isAdding
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Text style={[styles.addBtnText, inList && styles.addBtnInText]}>
                        {added ? '✓' : inList ? '−' : '+'}
                      </Text>
                  }
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }

          // ── 다중 곡: 드롭다운 ──
          const isOpen = expanded.has(group.key);
          const allInList = group.tracks.every(r => inPlaylistIds.has(r.id));

          return (
            <View style={styles.albumSection}>
              {/* ── 앨범 헤더 (드롭다운 토글) ── */}
              <TouchableOpacity
                style={styles.albumHeader}
                onPress={() => toggleExpand(group.key)}
                activeOpacity={0.75}
              >
                {group.albumArt ? (
                  <Image source={{ uri: group.albumArt }} style={styles.albumArt} contentFit="cover" />
                ) : (
                  <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
                    <Icon name="musical-note" size={22} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <View style={styles.albumInfo}>
                  <Text style={styles.albumName} numberOfLines={1}>{group.album}</Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>{group.artist}</Text>
                  <Text style={styles.albumCount}>{group.tracks.length}곡</Text>
                </View>
                {/* 일괄 추가 버튼 */}
                <TouchableOpacity
                  style={[styles.albumAddBtn, allInList && styles.albumAddBtnIn]}
                  onPress={() => handleAddAlbum(group)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.albumAddText, allInList && styles.albumAddTextIn]}>
                    {allInList ? '✓' : '+ 전체'}
                  </Text>
                </TouchableOpacity>
                {/* 펼치기/접기 화살표 */}
                <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                  <Icon name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
                </View>
              </TouchableOpacity>

              {/* ── 트랙 목록 (펼쳐질 때만) ── */}
              {isOpen && (
                <View style={styles.trackList}>
                  {group.tracks.map((r, idx) => {
                    const inList = inPlaylistIds.has(r.id);
                    const isAdding = addingId === r.id;
                    const isPlayLoading = playingId === r.id;
                    const added = justAdded[r.id];
                    return (
                      <View key={r.id} style={[styles.trackRow, idx === group.tracks.length - 1 && styles.trackRowLast]}>
                        <Text style={styles.trackNum}>{idx + 1}</Text>
                        <TouchableOpacity style={styles.trackInfo} onPress={() => handlePlay(r)} activeOpacity={0.7}>
                          <Text style={styles.trackName} numberOfLines={1}>{r.name}</Text>
                          {r.durationMs > 0 && (
                            <Text style={styles.trackDur}>{fmt(r.durationMs)}</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.playBtn}
                          onPress={() => handlePlay(r)}
                          disabled={isPlayLoading}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                          {isPlayLoading
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <Icon name="play" size={14} color="rgba(255,255,255,0.5)" />
                          }
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleAdd(r)}
                          style={[styles.addBtn, inList && styles.addBtnIn]}
                          disabled={isAdding}
                        >
                          {isAdding
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <Text style={[styles.addBtnText, inList && styles.addBtnInText]}>
                                {added ? '✓' : inList ? '−' : '+'}
                              </Text>
                          }
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff' },

  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14, paddingVertical: 11,
    gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  input: { flex: 1, fontSize: 15, color: '#fff' } as any,

  resultMeta: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)',
    paddingHorizontal: spacing.lg, marginBottom: 6,
  },

  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40,
  },
  placeholderText: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  placeholderHint: { fontSize: 13, color: 'rgba(255,255,255,0.22)', textAlign: 'center' },

  noResult: { padding: 40, alignItems: 'center' },
  noResultText: { fontSize: 14, color: 'rgba(255,255,255,0.35)' },

  /* ── 앨범 섹션 ── */
  /* ── 단일 곡 행 ── */
  singleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: 8,
    padding: 10, gap: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  singleArt: { width: 52, height: 52, borderRadius: 10 },
  singleInfo: { flex: 1 },
  singleName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 3 },
  singleArtist: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  albumSection: {
    marginHorizontal: spacing.lg,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  albumHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 12,
  },
  albumArt: { width: 58, height: 58, borderRadius: 10 },
  albumArtPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  albumInfo: { flex: 1 },
  albumName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  albumArtist: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  albumCount: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  albumAddBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  albumAddBtnIn: { backgroundColor: 'rgba(252,60,68,0.18)', borderColor: colors.primary },
  albumAddText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  albumAddTextIn: { color: colors.primary },

  chevron: { transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },

  /* ── 트랙 목록 ── */
  trackList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  trackRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  trackRowLast: { borderBottomWidth: 0 },
  trackNum: {
    width: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', fontWeight: '500',
  },
  trackInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#fff' },
  trackDur: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },

  playBtn: { width: 28, alignItems: 'center' },

  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnIn: { backgroundColor: 'rgba(252,60,68,0.18)', borderColor: colors.primary },
  addBtnText: { fontSize: 18, fontWeight: '300', color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  addBtnInText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});
