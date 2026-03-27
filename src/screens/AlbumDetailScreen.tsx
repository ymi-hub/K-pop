import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Track } from '../types';
import { colors, spacing, borderRadius } from '../theme';
import { MINI_PLAYER_H } from '../components/MiniPlayer';

const { width } = Dimensions.get('window');
const ART_SIZE = width * 0.7;

function fmt(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface Props {
  album: { name: string; art: string; tracks: Track[] };
  currentTrack: Track | null;
  isPlaying: boolean;
  onBack: () => void;
  onSelectTrack: (track: Track) => void;
  onPlayAll: () => void;
  onShuffleAll: () => void;
}

export default function AlbumDetailScreen({
  album,
  currentTrack,
  isPlaying,
  onBack,
  onSelectTrack,
  onPlayAll,
  onShuffleAll,
}: Props) {
  const artistName = album.tracks[0]?.artists.join(', ') ?? '';

  const ListHeader = () => (
    <View style={styles.header}>
      {/* 뒤로 버튼 */}
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      {/* 앨범 아트 */}
      <View style={styles.artContainer}>
        <Image
          source={{ uri: album.art }}
          style={styles.albumArt}
          contentFit="cover"
        />
      </View>

      {/* 앨범 정보 */}
      <View style={styles.albumInfo}>
        <Text style={styles.albumName} numberOfLines={2}>{album.name}</Text>
        <Text style={styles.artistName}>{artistName}</Text>
        <Text style={styles.trackCount}>{album.tracks.length}곡</Text>
      </View>

      {/* 재생 버튼 */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.playBtn} onPress={onPlayAll} activeOpacity={0.8}>
          <Text style={styles.playBtnText}>▶  재생</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shuffleBtn} onPress={onShuffleAll} activeOpacity={0.8}>
          <Text style={styles.shuffleBtnText}>↝  임의 재생</Text>
        </TouchableOpacity>
      </View>

      {/* 구분선 */}
      <View style={styles.divider} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={album.tracks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: MINI_PLAYER_H + 24 }}
        renderItem={({ item, index }) => {
          const active = currentTrack?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.trackRow, active && styles.trackRowActive]}
              onPress={() => onSelectTrack(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.trackNum, active && { color: colors.primary }]}>
                {active && isPlaying ? '▶' : index + 1}
              </Text>
              <View style={styles.trackInfo}>
                <Text style={[styles.trackName, active && { color: colors.primary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {item.artists.join(', ')}
                </Text>
              </View>
              <Text style={styles.duration}>{fmt(item.durationMs)}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* 헤더 섹션 */
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },

  /* 뒤로 버튼 */
  backBtn: {
    alignSelf: 'flex-start',
    marginLeft: spacing.lg,
    marginBottom: 12,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 34,
    color: colors.primary,
    lineHeight: 36,
    fontWeight: '300',
  },

  /* 앨범 아트 */
  artContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 24,
  },
  albumArt: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: borderRadius.lg,
  },

  /* 앨범 정보 */
  albumInfo: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
    marginBottom: 20,
  },
  albumName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackCount: {
    fontSize: 13,
    color: colors.textTertiary,
  },

  /* 재생 버튼 */
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.lg,
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  playBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  playBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  shuffleBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shuffleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  /* 구분선 */
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: spacing.lg,
    marginBottom: 8,
  },

  /* 트랙 행 */
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  trackRowActive: {
    backgroundColor: 'rgba(252,60,68,0.07)',
  },
  trackNum: {
    width: 26,
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    fontWeight: '500',
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  duration: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
