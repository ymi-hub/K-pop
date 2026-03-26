import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import Icon from '../components/Icon';
import { TAB_BAR_H } from '../components/TabBar';
import { loadPlaylist, removeFromPlaylist, PlaylistItem } from '../services/playlistStorage';

interface Props {
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (track: Track) => void;
  onBack: () => void;
  onPlaylistChange: () => void;
}

function fmt(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlaylistScreen({ currentTrack, isPlaying, onSelectTrack, onBack, onPlaylistChange }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [items, setItems] = useState<PlaylistItem[]>(() => loadPlaylist());

  const handleRemove = (id: string) => {
    removeFromPlaylist(id);
    setItems(prev => prev.filter(t => t.id !== id));
    onPlaylistChange();
  };

  const handleSelectTrack = (item: PlaylistItem) => {
    if (editMode) return;
    // PlaylistItem is compatible with Track
    onSelectTrack(item as unknown as Track);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{top:10,bottom:10,left:10,right:10}}>
          <Icon name="chevron-down" size={20} color={colors.primary} style={{transform:[{rotate:'90deg'}]}} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>내 플레이리스트</Text>
        <TouchableOpacity
          onPress={() => setEditMode(v => !v)}
          style={styles.editBtn}
        >
          <Text style={[styles.editBtnText, editMode && { color: colors.primary }]}>
            {editMode ? '완료' : '편집'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 전체 재생 버튼 */}
      {items.length > 0 && !editMode && (
        <TouchableOpacity
          style={styles.playAllBtn}
          onPress={() => items.length > 0 && handleSelectTrack(items[0])}
        >
          <Icon name="play" size={16} color="#fff" />
          <Text style={styles.playAllText}>전체 재생 ({items.length}곡)</Text>
        </TouchableOpacity>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="musical-note" size={52} color={colors.textTertiary} />
          <Text style={styles.emptyText}>플레이리스트가 비어있습니다</Text>
          <Text style={styles.emptyHint}>검색에서 곡을 추가해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_H + 80 }}
          renderItem={({ item }) => {
            const active = currentTrack?.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.row, active && styles.rowActive]}
                onPress={() => handleSelectTrack(item)}
                activeOpacity={editMode ? 1 : 0.75}
              >
                <Image source={{ uri: item.albumArt }} style={styles.art} contentFit="cover" />
                <View style={styles.info}>
                  <Text style={[styles.name, active && { color: colors.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {item.artists.join(', ')} · {fmt(item.durationMs)}
                  </Text>
                </View>
                {active && isPlaying && !editMode && (
                  <Icon name="musical-note" size={16} color={colors.primary} />
                )}
                {editMode && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemove(item.id)}
                    hitSlop={{top:8,bottom:8,left:8,right:8}}
                  >
                    <Icon name="close" size={16} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff' },
  editBtn: { width: 60, alignItems: 'flex-end' },
  editBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  playAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.lg, marginBottom: 12,
    backgroundColor: colors.primary,
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  playAllText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 10, gap: 12,
  },
  rowActive: { backgroundColor: 'rgba(252,60,68,0.07)' },
  art: { width: 50, height: 50, borderRadius: 8 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: '#fff', marginBottom: 3 },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,68,68,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  emptyHint: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
});
