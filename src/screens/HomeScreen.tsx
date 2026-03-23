import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { Track } from '../types';

interface Props {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (track: Track) => void;
}

export default function HomeScreen({ tracks, currentTrack, isPlaying, onSelectTrack }: Props) {
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
          <Text style={styles.albumName} numberOfLines={1}>
            {item.album}
          </Text>
        </View>

        <View style={styles.trackRight}>
          {isActive && isPlaying ? (
            <Ionicons name="equalizer" size={20} color={colors.primary} />
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

      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>K-pop English</Text>
          <Text style={styles.title}>BTS 전체 곡</Text>
        </View>
        <View style={styles.headerIcon}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.appIcon}
            contentFit="cover"
          />
        </View>
      </View>

      {/* 트랙 리스트 */}
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderTrack}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Spotify에 로그인하면{'\n'}BTS 전체 곡이 표시됩니다</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  subtitle: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  appIcon: {
    width: 44,
    height: 44,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  trackItemActive: {
    backgroundColor: 'rgba(252,60,68,0.08)',
  },
  trackArt: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  trackNameActive: {
    color: colors.primary,
  },
  albumName: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  trackRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  duration: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 15,
    lineHeight: 22,
  },
});
