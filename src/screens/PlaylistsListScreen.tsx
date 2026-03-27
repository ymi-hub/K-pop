import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import MiniPlayer from '../components/MiniPlayer';
import { Playlist, deletePlaylist, getPlaylists } from '../services/playlistStorage';

interface Props {
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onOpenPlaylist: (pl: Playlist) => void;
  onOpenPlayer: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onBack: () => void;
  onPlaylistsChange: (pls: Playlist[]) => void;
}

export default function PlaylistsListScreen({
  playlists: initialPlaylists,
  currentTrack, isPlaying, currentMs, durationMs,
  onOpenPlaylist, onOpenPlayer, onPlayPause, onNext,
  onBack, onPlaylistsChange,
}: Props) {
  const [playlists, setPlaylists] = useState(initialPlaylists);

  const handleDelete = (pl: Playlist) => {
    Alert.alert('삭제', `"${pl.name}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => {
          deletePlaylist(pl.id);
          const updated = getPlaylists();
          setPlaylists(updated);
          onPlaylistsChange(updated);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Playlist }) => {
    const arts = item.tracks.slice(0, 4).map((t) => t.albumArt);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onOpenPlaylist(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.75}
      >
        {/* 2×2 아트 그리드 */}
        <View style={styles.artGrid}>
          {[0, 1, 2, 3].map((i) => (
            arts[i]
              ? <Image key={i} source={{ uri: arts[i] }} style={styles.artCell} contentFit="cover" />
              : <View key={i} style={[styles.artCell, styles.artEmpty]} />
          ))}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.count}>{item.tracks.length}곡</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>플레이리스트</Text>
        <Text style={styles.headerCount}>{playlists.length}개</Text>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: currentTrack ? 110 : 40, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>저장된 플레이리스트가 없습니다</Text>
          </View>
        }
      />

      {currentTrack && (
        <MiniPlayer
          track={currentTrack} isPlaying={isPlaying}
          currentMs={currentMs} durationMs={durationMs}
          onPress={onOpenPlayer} onPlayPause={onPlayPause} onNext={onNext}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },
  headerCount: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12, gap: 14,
  },
  artGrid: {
    width: 60, height: 60, borderRadius: 10,
    flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden',
  },
  artCell: { width: '50%', height: '50%' },
  artEmpty: { backgroundColor: 'rgba(255,255,255,0.08)' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#fff' },
  count: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  chevron: { fontSize: 24, color: 'rgba(255,255,255,0.3)', lineHeight: 28 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.35)' },
});
