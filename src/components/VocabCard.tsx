import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { VocabEntry } from '../types';
import { colors, spacing, borderRadius } from '../theme';
import { saveWord, isWordSaved } from '../services/vocabStorage';
import Icon from './Icon';

interface Props {
  vocab: VocabEntry;
  songName: string;
  onClose: () => void;
}

const difficultyColor = {
  easy: '#30D158',
  medium: '#FFD60A',
  hard: '#FC3C44',
};

export default function VocabCard({ vocab, songName, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(200)).current;
  const [saved, setSaved] = useState(() => isWordSaved(vocab.word));

  useEffect(() => {
    slideAnim.setValue(200);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
    setSaved(isWordSaved(vocab.word));
  }, [vocab.word]);

  const handleSave = () => {
    saveWord(vocab, songName);
    setSaved(true);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <BlurView intensity={85} tint="dark" style={styles.blur}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.wordRow}>
            <Text style={styles.word}>{vocab.word}</Text>
            <View style={[styles.badge, { backgroundColor: difficultyColor[vocab.difficulty] + '33' }]}>
              <Text style={[styles.badgeText, { color: difficultyColor[vocab.difficulty] }]}>
                {vocab.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {/* 단어장 저장 버튼 */}
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, saved && styles.saveBtnDone]}
              disabled={saved}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={saved ? 'bookmark-fill' : 'bookmark'}
                size={20}
                color={saved ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.saveBtnText, saved && { color: colors.primary }]}>
                {saved ? '저장됨' : '단어장'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 발음 */}
        {vocab.pronunciation ? (
          <Text style={styles.pronunciation}>{vocab.pronunciation}</Text>
        ) : null}

        {/* 한국어 번역 - 강조 */}
        {vocab.koreanMeaning ? (
          <View style={styles.koreanBox}>
            <Text style={styles.koreanLabel}>한국어</Text>
            <Text style={styles.koreanMeaning}>{vocab.koreanMeaning}</Text>
          </View>
        ) : null}

        {/* 영어 뜻 */}
        {vocab.meaning ? (
          <View style={styles.meaningBox}>
            <Text style={styles.meaningLabel}>English</Text>
            <Text style={styles.meaning}>{vocab.meaning}</Text>
          </View>
        ) : null}

        {/* 예문 */}
        {vocab.example ? (
          <View style={styles.exampleBox}>
            <Text style={styles.example}>{vocab.example}</Text>
          </View>
        ) : null}
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
    borderColor: 'rgba(255,255,255,0.12)',
  },
  blur: { padding: spacing.lg, gap: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: 24, fontWeight: '400', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  saveBtnDone: { backgroundColor: 'rgba(252,60,68,0.12)' },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  pronunciation: { fontSize: 15, color: colors.primary, fontStyle: 'italic' },
  koreanBox: {
    backgroundColor: 'rgba(252,60,68,0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(252,60,68,0.25)',
  },
  koreanLabel: {
    fontSize: 11, color: colors.primary, fontWeight: '700',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  koreanMeaning: { fontSize: 24, fontWeight: '400', color: colors.text, lineHeight: 32 },
  meaningBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: borderRadius.md, padding: spacing.md },
  meaningLabel: {
    fontSize: 11, color: colors.textTertiary, fontWeight: '600',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  meaning: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  exampleBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.sm, borderRadius: borderRadius.sm,
  },
  example: { flex: 1, fontSize: 13, color: colors.textTertiary, fontStyle: 'italic', lineHeight: 18 },
});
