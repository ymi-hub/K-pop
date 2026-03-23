import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { VocabEntry } from '../types';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  vocab: VocabEntry;
  onClose: () => void;
}

const difficultyColor = {
  easy: '#30D158',
  medium: '#FFD60A',
  hard: '#FC3C44',
};

export default function VocabCard({ vocab, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [vocab]);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.wordRow}>
            <Text style={styles.word}>{vocab.word}</Text>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: difficultyColor[vocab.difficulty] + '33' },
              ]}
            >
              <Text style={[styles.difficulty, { color: difficultyColor[vocab.difficulty] }]}>
                {vocab.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* 발음 */}
        {vocab.pronunciation && (
          <Text style={styles.pronunciation}>{vocab.pronunciation}</Text>
        )}

        {/* 뜻 */}
        <Text style={styles.meaning}>{vocab.meaning}</Text>

        {/* 예문 */}
        {vocab.example && (
          <View style={styles.exampleContainer}>
            <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.example}>{vocab.example}</Text>
          </View>
        )}
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 160,
    left: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blur: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  word: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  difficulty: {
    fontSize: 10,
    fontWeight: '700',
  },
  pronunciation: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  meaning: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  exampleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  example: {
    flex: 1,
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
