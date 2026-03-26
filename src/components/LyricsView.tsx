import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { getWordDefinition, translateToKorean } from '../services/lyrics';
import { LyricLine, VocabEntry } from '../types';
import { colors, spacing, borderRadius } from '../theme';

const { height } = Dimensions.get('window');

interface Props {
  lyrics: LyricLine[];
  currentLineIndex: number;
  currentMs: number;
  onWordPress: (vocab: VocabEntry) => void;
  onLineSyncPress?: (lineStartMs: number) => void;
}

export default function LyricsView({ lyrics, currentLineIndex, currentMs, onWordPress, onLineSyncPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [translatedIdx, setTranslatedIdx] = useState<number | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const pendingRef = useRef<{
    idx: number;
    line: LyricLine;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    if (currentLineIndex > 0) {
      const y = currentLineIndex * 76 - height * 0.25;
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
      } else {
        setTranslatedIdx(idx); setTranslatedText(''); setTranslating(true);
        translateToKorean(line.text).then(r => {
          setTranslatedText(r); setTranslating(false);
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
      if (translatedIdx !== null) { setTranslatedIdx(null); setTranslatedText(''); }
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
  };

  if (lyrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>가사를 불러오는 중...</Text>
      </View>
    );
  }

  const translatedLine = translatedIdx !== null ? lyrics[translatedIdx] : null;
  const englishWords = translatedLine
    ? translatedLine.words.map(w => w.text.replace(/[^a-zA-Z]/g, '')).filter(w => w.length >= 2)
    : [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TouchableWithoutFeedback onPress={closeTranslation}>
          <View style={{ height: height * 0.08 }} />
        </TouchableWithoutFeedback>

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

        <TouchableWithoutFeedback onPress={closeTranslation}>
          <View style={{ height: height * 0.3 }} />
        </TouchableWithoutFeedback>
      </ScrollView>

      {/* ── 번역 오버레이 — 가사 영역 중앙에 고정 ── */}
      {translatedIdx !== null && (
        <TouchableWithoutFeedback onPress={closeTranslation}>
          <View style={styles.overlayBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.translationCard}>
                {translating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text style={styles.translationKorean}>{translatedText}</Text>
                    {englishWords.length > 0 && (
                      <View style={styles.chipRow}>
                        {englishWords.map((word, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.chip}
                            onPress={async () => {
                              const vocab = await getWordDefinition(word);
                              if (vocab) onWordPress(vocab);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.chipText}>{word}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <TouchableOpacity onPress={closeTranslation} style={styles.closeBtn}>
                      <Text style={styles.closeBtnText}>닫기</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
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
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.25)',
    lineHeight: 32,
  },
  lineTextPast: { color: 'rgba(255,255,255,0.45)' },

  lineTextActive: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 38,
  },
  wordBase: { fontSize: 24, fontWeight: '800' },
  wordPast: { color: 'rgba(255,255,255,0.9)' },
  wordCurrent: { color: '#FFFFFF' },
  wordFuture: { color: 'rgba(255,255,255,0.28)' },

  /* ── 번역 오버레이 ── */
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  translationCard: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  translationKorean: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
    textAlign: 'center',
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },

  closeBtn: {
    marginTop: 2,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
});
