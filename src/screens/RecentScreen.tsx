import React from 'react';
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
import { colors, spacing } from '../theme';
import { Track } from '../types';
import MiniPlayer from '../components/MiniPlayer';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - spacing.lg * 2 - CARD_GAP) / 2;

interface RecentAlbum {
  albumName: string;
  albumArt: string;
  artist: string;
  tracks: Track[];
}

interface Props {
  recentTracks: Track[];           // 최근 재생 트랙 (앨범 대표곡)
  allTracks: Track[];              // BTS 전체 트랙 (앨범 트랙 조회용)
  currentTrack: Track | null;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onOpenAlbum: (name: string, art: string, albumTracks: Track[]) => void;
  onOpenPlayer: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onBack: () => void;
}

export default function RecentScreen({
  recentTracks, allTracks,
  currentTrack, isPlaying, currentMs, durationMs,
  onOpenAlbum, onOpenPlayer, onPlayPause, onNext, onBack,
}: Props) {
  // 앨범 단위로 그룹화 (순서 유지)
  const recentAlbums: RecentAlbum[] = recentTracks.map((t) => {
    const albumTracks = allTracks.filter((tr) => tr.album === t.album);
    return {
      albumName: t.album,
      albumArt: t.albumArt,
      artist: t.artists[0] ?? '',
      tracks: albumTracks.length > 0 ? albumTracks : [t],
    };
  });

  const renderItem = ({ item, index }: { item: RecentAlbum; index: number }) => {
    const isLeft = index % 2 === 0;
    return (
      <TouchableOpacity
        style={[styles.card, isLeft ? styles.cardLeft : styles.cardRight]}
        onPress={() => onOpenAlbum(item.albumName, item.albumArt, item.tracks)}
        activeOpacity={0.82}
      >
        <Image source={{ uri: item.albumArt }} style={styles.cardArt} contentFit="cover" />
        <Text style={styles.cardName} numberOfLines={2}>{item.albumName}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{item.artist}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>최근 재생한 음악</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={recentAlbums}
        keyExtractor={(item) => item.albumName}
        renderItem={renderItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: currentTrack ? 110 : 40, paddingTop: 8 }}
        columnWrapperStyle={{ gap: CARD_GAP, marginBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>최근 재생한 음악이 없습니다</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backBtn: { width: 44, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: '#000', lineHeight: 34 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#000' },

  card: { width: CARD_WIDTH },
  cardLeft: {},
  cardRight: {},
  cardArt: {
    width: CARD_WIDTH, height: CARD_WIDTH,
    borderRadius: 10,
  },
  cardName: {
    fontSize: 14, fontWeight: '600', color: '#000',
    marginTop: 7, lineHeight: 19,
  },
  cardArtist: {
    fontSize: 13, color: 'rgba(0,0,0,0.45)', marginTop: 2,
  },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: 'rgba(0,0,0,0.4)' },
});
