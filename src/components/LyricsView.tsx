import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { getWordDefinition, translateToKorean } from '../services/lyrics';
import { LyricLine, VocabEntry } from '../types';
import { colors, spacing, borderRadius } from '../theme';

const { height } = Dimensions.get('window');

/* ── VocabCard 스타일 번역 카드 ── */
function TranslationCard({ originalText, translatedText, translating, englishWords, onClose, onWordPress }: {
  originalText: string;
  translatedText: string;
  translating: boolean;
  englishWords: string[];
  onClose: () => void;
  onWordPress: (vocab: VocabEntry) => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    slideAnim.setValue(300);
    Animated.spring(slideAnim, {
      toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[tcStyles.container, { transform: [{ translateY: slideAnim }] }]}>
      <BlurView intensity={85} tint="dark" style={tcStyles.blur}>
        {/* 헤더 */}
        <Text style={tcStyles.headerLabel}>번역</Text>

        {translating ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
        ) : (
          <>
            {/* 원문 */}
            <View style={tcStyles.originalBox}>
              <Text style={tcStyles.boxLabel}>ORIGINAL</Text>
              <Text style={tcStyles.originalText}>{originalText}</Text>
            </View>

            {/* 한국어 번역 */}
            <View style={tcStyles.koreanBox}>
              <Text style={tcStyles.boxLabel}>한국어</Text>
              <Text style={tcStyles.koreanText}>{translatedText}</Text>
            </View>

            {/* 단어 칩 */}
            {englishWords.length > 0 && (
              <View style={tcStyles.chipRow}>
                {englishWords.map((word, i) => (
                  <TouchableOpacity
                    key={i}
                    style={tcStyles.chip}
                    onPress={async () => {
                      const vocab = await getWordDefinition(word);
                      if (vocab) onWordPress(vocab);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={tcStyles.chipText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 닫기 버튼 — 하단 중앙 */}
            <TouchableOpacity onPress={onClose} style={tcStyles.closeBtn} activeOpacity={0.7}>
              <Text style={tcStyles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </>
        )}
      </BlurView>
    </Animated.View>
  );
}

const tcStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  blur: { padding: spacing.lg, paddingTop: 20, gap: 10 },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  originalBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  koreanBox: {
    backgroundColor: 'rgba(252,60,68,0.12)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(252,60,68,0.25)',
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  originalText: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 26,
  },
  koreanText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(252,60,68,0.15)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.primary,
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
});

export interface TranslationCardProps {
  originalText: string;
  translatedText: string;
  translating: boolean;
  englishWords: string[];
  onClose: () => void;
  onWordPress: (vocab: VocabEntry) => void;
}

interface Props {
  lyrics: LyricLine[];
  currentLineIndex: number;
  currentMs: number;
  onWordPress: (vocab: VocabEntry) => void;
  onLineSyncPress?: (lineStartMs: number) => void;
  onTranslationChange?: (data: TranslationCardProps | null) => void;
}

export { TranslationCard };

export default function LyricsView({ lyrics, currentLineIndex, currentMs, onWordPress, onLineSyncPress, onTranslationChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollHeightRef = useRef(height * 0.4);
  const [translatedIdx, setTranslatedIdx] = useState<number | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const pendingRef = useRef<{
    idx: number;
    line: LyricLine;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  // 실제 행 높이: paddingVertical(10*2) + lineHeight(44) + marginBottom(4) = 68px
  const ROW_H = 68;

  useEffect(() => {
    if (currentLineIndex >= 0) {
      // 상단 여백(hint + padding) 약 56px
      const topOffset = 56;
      const lineY = topOffset + currentLineIndex * ROW_H;
      // 현재 행이 스크롤 뷰 중앙에 오도록
      const y = lineY - scrollHeightRef.current / 2 + ROW_H / 2;
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }
  }, [currentLineIndex]);

  const handleLineTap = (line: LyricLine, idx: number) => {
    // 같은 줄을 두 번 탭 → 더블 탭 (번역)
    if (pendingRef.current?.idx === idx) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
      if (translatedIdx === idx) {
        setTranslatedIdx(null); setTranslatedText('');
        onTranslationChange?.(null);
      } else {
        setTranslatedIdx(idx); setTranslatedText(''); setTranslating(true);
        const words = line.words.map(w => w.text.replace(/[^a-zA-Z]/g, '')).filter(w => w.length >= 2);
        onTranslationChange?.({ originalText: line.text, translatedText: '', translating: true, englishWords: words, onClose: closeTranslation, onWordPress });
        translateToKorean(line.text).then(r => {
          setTranslatedText(r); setTranslating(false);
          onTranslationChange?.({ originalText: line.text, translatedText: r, translating: false, englishWords: words, onClose: closeTranslation, onWordPress });
        });
      }
      return;
    }

    // 다른 줄 탭 시 기존 대기 취소
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }

    // 280ms 대기 후 단일 탭 처리
    const timer = setTimeout(() => {
      pendingRef.current = null;
      if (translatedIdx !== null) { setTranslatedIdx(null); setTranslatedText(''); onTranslationChange?.(null); }
      onLineSyncPress?.(line.startMs);
    }, 280);

    pendingRef.current = { idx, line, timer };
  };

  const closeTranslation = () => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    }
    setTranslatedIdx(null); setTranslatedText('');
    onTranslationChange?.(null);
  };

  if (lyrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>가사를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onLayout={e => { scrollHeightRef.current = e.nativeEvent.layout.height; }}
      >
        <TouchableOpacity onPress={closeTranslation} activeOpacity={1} style={{ height: height * 0.08 }} />

        <Text style={styles.hint}>탭: 싱크 맞추기 · 두 번 탭: 번역 · 단어 탭: 뜻</Text>

        {lyrics.map((line, lineIdx) => {
          const isActive = lineIdx === currentLineIndex;
          const isPast = lineIdx < currentLineIndex;

          return (
            <View key={lineIdx} style={styles.lineBlock}>
              <TouchableOpacity
                style={[styles.lineWrapper, isActive && styles.lineWrapperActive]}
                onPress={() => handleLineTap(line, lineIdx)}
                activeOpacity={0.75}
              >
                {isActive ? (
                  <Text style={styles.lineTextActive}>
                    {line.words.map((word, wi) => {
                      const pastWord = currentMs > word.endMs;
                      const currentWord = currentMs >= word.startMs && currentMs <= word.endMs;
                      return (
                        <Text
                          key={wi}
                          style={[
                            styles.wordBase,
                            pastWord && styles.wordPast,
                            currentWord && styles.wordCurrent,
                            !pastWord && !currentWord && styles.wordFuture,
                          ]}
                        >
                          {word.text}{wi < line.words.length - 1 ? ' ' : ''}
                        </Text>
                      );
                    })}
                  </Text>
                ) : (
                  <Text style={[styles.lineText, isPast && styles.lineTextPast]}>
                    {line.text}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity onPress={closeTranslation} activeOpacity={1} style={{ height: height * 0.3 }} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: colors.textTertiary },

  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.18)',
    textAlign: 'center',
    marginBottom: 24,
  },

  lineBlock: { marginBottom: 4 },

  lineWrapper: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
  },
  lineWrapperActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  lineText: {
    fontSize: 32,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.25)',
    lineHeight: 44,
  },
  lineTextPast: { color: 'rgba(255,255,255,0.45)' },

  lineTextActive: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 44,
  },
  wordBase: { fontSize: 32, fontWeight: '800' },
  wordPast: { color: 'rgba(255,255,255,0.9)' },
  wordCurrent: { color: '#FFFFFF' },
  wordFuture: { color: 'rgba(255,255,255,0.28)' },

});
