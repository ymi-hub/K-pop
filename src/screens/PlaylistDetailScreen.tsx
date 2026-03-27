import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import MiniPlayer from '../components/MiniPlayer';
import { Playlist, savePlaylist } from '../services/playlistStorage';

const { width } = Dimensions.get('window');
const ART_SIZE = width * 0.52;

interface Props {
  playlist: Playlist;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onSelectTrack: (track: Track, queue: Track[]) => void;
  onOpenPlayer: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (updated: Playlist) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

export default function PlaylistDetailScreen({
  playlist: initialPlaylist,
  currentTrack, isPlaying, currentMs, durationMs,
  onSelectTrack, onOpenPlayer, onPlayPause, onNext,
  onBack, onUpdate, onDelete, readOnly = false,
}: Props) {
  const [playlist, setPlaylist]   = useState(initialPlaylist);
  const [editMode, setEditMode]   = useState(false);
  const [tracks, setTracks]       = useState(initialPlaylist.tracks);
  const [showMenu, setShowMenu]   = useState(false);

  const handleSave = () => {
    const updated: Playlist = { ...playlist, tracks };
    savePlaylist(updated);
    setPlaylist(updated);
    onUpdate(updated);
    setEditMode(false);
  };

  const handleCancel = () => {
    setTracks(playlist.tracks);
    setEditMode(false);
  };

  const handleDeleteTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDeletePlaylist = () => {
    if (typeof window !== 'undefined') {
      if (window.confirm(`"${playlist.name}"을(를) 삭제할까요?`)) onDelete();
    }
  };

  const handleShufflePlay = () => {
    if (!tracks.length) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    onSelectTrack(shuffled[0], shuffled);
  };

  // Apple Music 앨범 상세: 앨범아트 모자이크 (4장 그리드 or 단일)
  const artImages: string[] = readOnly
    ? [tracks[0]?.albumArt ?? ''] // 앨범은 단일 아트
    : tracks.slice(0, 4).map((t) => t.albumArt).filter(Boolean);

  const renderTrack = ({ item, index }: { item: Track; index: number }) => {
    const isActive = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.trackRow, isActive && styles.trackRowActive]}
        onPress={() => !editMode && onSelectTrack(item, tracks)}
        activeOpacity={editMode ? 1 : 0.7}
      >
        {!editMode && (
          <Text style={[styles.trackIndex, isActive && { color: colors.primary }]}>
            {isActive && isPlaying ? '▶' : index + 1}
          </Text>
        )}
        <View style={styles.trackInfo}>
          <Text style={[styles.trackName, isActive && styles.trackNameActive]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artists.join(', ')}</Text>
        </View>
        <Text style={styles.trackDuration}>
          {Math.floor(item.durationMs / 60000)}:{String(Math.floor((item.durationMs % 60000) / 1000)).padStart(2, '0')}
        </Text>
        {editMode && (
          <TouchableOpacity onPress={() => handleDeleteTrack(item.id)} style={styles.deleteBtn} activeOpacity={0.7}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <>
      {/* ── Apple Music 스타일 앨범아트 헤더 ── */}
      <View style={styles.artSection}>
        {readOnly ? (
          // 앨범: 대형 단일 아트
          <Image
            source={{ uri: artImages[0] }}
            style={styles.artSingle}
            contentFit="cover"
          />
        ) : (
          // 플레이리스트: 2×2 모자이크
          <View style={styles.artMosaic}>
            {[0,1,2,3].map((i) => (
              artImages[i]
                ? <Image key={i} source={{ uri: artImages[i] }} style={styles.artMosaicCell} contentFit="cover" />
                : <View key={i} style={[styles.artMosaicCell, { backgroundColor: '#1a1a2e' }]} />
            ))}
          </View>
        )}
      </View>

      {/* ── 타이틀 + 액션 ── */}
      <View style={styles.infoSection}>
        <Text style={styles.playlistTitle} numberOfLines={2}>{playlist.name}</Text>
        {readOnly && tracks[0] && (
          <Text style={styles.artistLabel}>{tracks[0].artists[0]}</Text>
        )}
        <Text style={styles.trackCount}>{tracks.length}곡</Text>

        {!editMode && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => tracks.length > 0 && onSelectTrack(tracks[0], tracks)}
              activeOpacity={0.82}
            >
              {/* @ts-ignore */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <Text style={styles.playBtnText}>재생</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shuffleBtn}
              onPress={handleShufflePlay}
              activeOpacity={0.82}
            >
              {/* @ts-ignore */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
              </svg>
              <Text style={styles.shuffleBtnText}>임의 재생</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 구분선 */}
      <View style={styles.divider} />
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 내비 바 */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={editMode ? handleCancel : onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.navRight}>
          {editMode ? (
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>완료</Text>
            </TouchableOpacity>
          ) : !readOnly ? (
            <TouchableOpacity onPress={() => setShowMenu((v) => !v)} style={styles.moreBtn} activeOpacity={0.7}>
              <Text style={styles.moreBtnText}>...</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 드롭다운 메뉴 */}
      {showMenu && (
        <>
          <TouchableOpacity style={styles.menuBackdrop} onPress={() => setShowMenu(false)} activeOpacity={1} />
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setShowMenu(false); setEditMode(true); }}
              activeOpacity={0.75}
            >
              <Text style={styles.dropdownItemText}>편집</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setShowMenu(false); handleDeletePlaylist(); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.dropdownItemText, { color: '#FF453A' }]}>삭제</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderTrack}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: currentTrack ? 110 : 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {editMode ? '모든 곡이 삭제되었습니다' : '곡이 없습니다'}
            </Text>
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

  /* 내비 바 */
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 4,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 30, color: '#fff', lineHeight: 34 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  moreBtnText: { fontSize: 20, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, lineHeight: 24 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.primary, borderRadius: borderRadius.full },
  saveBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  dropdownMenu: {
    position: 'absolute', top: 52, right: 16,
    backgroundColor: '#2C2C2E', borderRadius: 12, minWidth: 130, zIndex: 60,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 18, paddingVertical: 14 },
  dropdownItemText: { fontSize: 15, color: '#fff', fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  /* 앨범아트 섹션 */
  artSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  artSingle: {
    width: ART_SIZE, height: ART_SIZE, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6, shadowRadius: 20,
  },
  artMosaic: {
    width: ART_SIZE, height: ART_SIZE, borderRadius: 16,
    overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap',
  },
  artMosaicCell: { width: '50%', height: '50%' },

  /* 타이틀 */
  infoSection: { paddingHorizontal: spacing.lg, paddingBottom: 16 },
  playlistTitle: { fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32 },
  artistLabel: { fontSize: 16, color: colors.primary, fontWeight: '600', marginTop: 4 },
  trackCount: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, marginBottom: 18 },

  /* 액션 바 */
  actionBar: { flexDirection: 'row', gap: 12 },
  playBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, gap: 8,
  },
  playBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  shuffleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(252,60,68,0.12)', borderRadius: 14, paddingVertical: 13, gap: 8,
    borderWidth: 1, borderColor: 'rgba(252,60,68,0.3)',
  },
  shuffleBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: spacing.lg, marginBottom: 4 },

  /* 트랙 행 */
  trackRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 12,
  },
  trackRowActive: { backgroundColor: 'rgba(252,60,68,0.07)' },
  trackIndex: { width: 24, fontSize: 14, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  trackNameActive: { color: colors.primary },
  trackArtist: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  trackDuration: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,60,60,0.15)', borderWidth: 1, borderColor: 'rgba(255,60,60,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 13, color: '#FF453A', fontWeight: '700' },

  /* 빈 상태 */
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
});
