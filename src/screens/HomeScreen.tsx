import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';
import MiniPlayer from '../components/MiniPlayer';

interface Props {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onSelectTrack: (track: Track) => void;
  onOpenPlayer: () => void;
  onVocabPress: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  loadError?: string | null;
}

export default function HomeScreen({
  tracks, currentTrack, isPlaying, currentMs, durationMs,
  onSelectTrack, onOpenPlayer, onVocabPress, onPlayPause, onNext, loadError,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return tracks;
    const q = query.toLowerCase();
    return tracks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.artists.join(' ').toLowerCase().includes(q)
    );
  }, [tracks, query]);

  const renderTrack = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.trackItem, isActive && styles.trackItemActive]}
        onPress={() => onSelectTrack(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.albumArt }} style={styles.trackArt} contentFit="cover" />
        <View style={styles.trackInfo}>
          <Text style={[styles.trackName, isActive && styles.trackNameActive]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.albumName} numberOfLines={1}>{item.album}</Text>
        </View>
        <View style={styles.trackRight}>
          {isActive && isPlaying ? (
            <Ionicons name="musical-note" size={18} color={colors.primary} />
          ) : (
            <Text style={styles.duration}>
              {Math.floor(item.durationMs / 60000)}:{String(Math.floor((item.durationMs % 60000) / 1000)).padStart(2, '0')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>K-pop English</Text>
          <Text style={styles.title}>BTS 전체 곡</Text>
        </View>
        <TouchableOpacity style={styles.vocabBtn} onPress={onVocabPress}>
          <Ionicons name="book" size={16} color={colors.primary} />
          <Text style={styles.vocabBtnText}>단어장</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="곡 이름 또는 아티스트 검색"
          placeholderTextColor="rgba(255,255,255,0.35)"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Track list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTrack}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: currentTrack ? 100 : 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={loadError ? 'warning-outline' : query ? 'search-outline' : 'musical-notes-outline'}
              size={48}
              color={loadError ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.emptyText, loadError && { color: colors.primary }]}>
              {loadError ?? (query ? '검색 결과가 없습니다' : 'BTS 곡을 불러오는 중...\n잠시 기다려주세요')}
            </Text>
            {loadError && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  if (typeof localStorage !== 'undefined') localStorage.clear();
                  if (typeof window !== 'undefined') window.location.href = '/';
                }}
              >
                <Text style={styles.retryText}>다시 로그인</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Mini player */}
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  subtitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2 },
  vocabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(252,60,68,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(252,60,68,0.3)',
  },
  vocabBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    paddingVertical: 0,
  },

  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  trackItemActive: { backgroundColor: 'rgba(252,60,68,0.08)' },
  trackArt: { width: 50, height: 50, borderRadius: borderRadius.sm },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 16, fontWeight: '500', color: colors.text },
  trackNameActive: { color: colors.primary },
  albumName: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  trackRight: { width: 44, alignItems: 'flex-end' },
  duration: { fontSize: 12, color: colors.textTertiary },

  empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: {
    textAlign: 'center', color: colors.textTertiary, fontSize: 15, lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
