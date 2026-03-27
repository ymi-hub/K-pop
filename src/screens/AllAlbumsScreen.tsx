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
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import MiniPlayer from '../components/MiniPlayer';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - spacing.lg * 2 - CARD_GAP) / 2;

interface Album {
  name: string;
  art: string;
  tracks: Track[];
}

interface Props {
  albums: Album[];
  hiddenAlbums: Set<string>;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onOpenAlbum: (name: string, art: string, tracks: Track[]) => void;
  onOpenPlayer: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onBack: () => void;
  onHideAlbums: (hidden: Set<string>) => void;
}

export default function AllAlbumsScreen({
  albums, hiddenAlbums,
  currentTrack, isPlaying, currentMs, durationMs,
  onOpenAlbum, onOpenPlayer, onPlayPause, onNext, onBack,
  onHideAlbums,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [localHidden, setLocalHidden] = useState<Set<string>>(new Set(hiddenAlbums));
  const [showMenu, setShowMenu] = useState(false);

  const visibleAlbums = albums.filter((a) => !localHidden.has(a.name));

  const handleHide = (albumName: string) => {
    setLocalHidden((prev) => new Set([...prev, albumName]));
  };

  const handleSave = () => {
    onHideAlbums(localHidden);
    setEditMode(false);
  };

  const handleCancel = () => {
    setLocalHidden(new Set(hiddenAlbums));
    setEditMode(false);
  };

  const handleRestore = () => {
    setShowMenu(false);
    setLocalHidden(new Set());
    onHideAlbums(new Set());
  };

  const renderItem = ({ item, index }: { item: Album; index: number }) => (
    <TouchableOpacity
      style={[styles.card, index % 2 === 0 ? styles.cardLeft : styles.cardRight]}
      onPress={() => !editMode && onOpenAlbum(item.name, item.art, item.tracks)}
      activeOpacity={editMode ? 1 : 0.82}
    >
      <View style={styles.cardArtWrap}>
        <Image source={{ uri: item.art }} style={styles.cardArt} contentFit="cover" />
        {editMode && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleHide(item.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.cardCount}>{item.tracks.length}곡</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={editMode ? handleCancel : onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>전체 앨범</Text>

        <View style={styles.headerRight}>
          {editMode ? (
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>완료</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setShowMenu((v) => !v)}
              style={styles.moreBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.moreBtnText}>...</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 드롭다운 메뉴 */}
      {showMenu && (
        <>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setShowMenu(false); setEditMode(true); }}
              activeOpacity={0.75}
            >
              <Text style={styles.dropdownItemText}>편집</Text>
            </TouchableOpacity>
            {localHidden.size > 0 && (
              <>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleRestore}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dropdownItemText, { color: '#FF453A' }]}>
                    삭제 ({localHidden.size}개 숨김 해제)
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}

      {/* 편집 모드 안내 */}
      {editMode && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>✕ 버튼을 눌러 앨범을 숨길 수 있습니다</Text>
        </View>
      )}

      <FlatList
        data={visibleAlbums}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: currentTrack ? 110 : 40,
          paddingTop: 12,
        }}
        columnWrapperStyle={{ gap: CARD_GAP, marginBottom: 22 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {editMode ? '모든 앨범이 숨겨졌습니다' : '앨범이 없습니다'}
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

  /* ── 헤더 ── */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: '#fff', lineHeight: 34 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff' },
  headerRight: { width: 36, alignItems: 'flex-end' },
  moreBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  moreBtnText: { fontSize: 18, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, lineHeight: 22 },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: colors.primary, borderRadius: 20,
  },
  saveBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  /* ── 드롭다운 ── */
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  dropdownMenu: {
    position: 'absolute', top: 56, right: 16,
    backgroundColor: '#2C2C2E', borderRadius: 12,
    minWidth: 200, zIndex: 60,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 18, paddingVertical: 14 },
  dropdownItemText: { fontSize: 15, color: '#fff', fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  /* ── 편집 안내 배너 ── */
  editBanner: {
    backgroundColor: 'rgba(252,60,68,0.1)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(252,60,68,0.2)',
    paddingVertical: 10, paddingHorizontal: spacing.lg,
  },
  editBannerText: { fontSize: 13, color: colors.primary, fontWeight: '500' },

  /* ── 카드 ── */
  card: { width: CARD_WIDTH },
  cardLeft: {},
  cardRight: {},
  cardArtWrap: { position: 'relative' },
  cardArt: {
    width: CARD_WIDTH, height: CARD_WIDTH,
    borderRadius: 12,
  },
  deleteBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  cardName: {
    fontSize: 13, fontWeight: '600', color: '#fff',
    marginTop: 8, lineHeight: 18,
  },
  cardCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  /* ── 빈 상태 ── */
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
});
