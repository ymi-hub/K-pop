import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
}

export default function LyricsView({ lyrics, currentLineIndex, currentMs, onWordPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [translatedIdx, setTranslatedIdx] = useState<number | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const lastTapRef = useRef<{ idx: number; time: number } | null>(null);

  useEffect(() => {
    if (currentLineIndex > 0) {
      const y = currentLineIndex * 76 - height * 0.25;
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }
  }, [currentLineIndex]);

  const handleLineTap = async (line: LyricLine, idx: number) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.idx === idx && now - last.time < 400) {
      lastTapRef.current = null;
      if (translatedIdx === idx) {
        setTranslatedIdx(null); setTranslatedText(''); return;
      }
      setTranslatedIdx(idx); setTranslatedText(''); setTranslating(true);
      const result = await translateToKorean(line.text);
      setTranslatedText(result); setTranslating(false);
    } else {
      lastTapRef.current = { idx, time: now };
    }
  };

  if (lyrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>가사를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={{ height: height * 0.08 }} />

      <Text style={styles.hint}>두 번 탭하면 번역 · 단어 탭하면 뜻</Text>

      {lyrics.map((line, lineIdx) => {
        const isActive = lineIdx === currentLineIndex;
        const isPast = lineIdx < currentLineIndex;
        const isTranslated = translatedIdx === lineIdx;

        const englishWords = line.words
          .map((w) => w.text.replace(/[^a-zA-Z]/g, ''))
          .filter((w) => w.length >= 2);

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

            {/* ── Duolingo-style translation card ── */}
            {isTranslated && (
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
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: height * 0.3 }} />
    </ScrollView>
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

  /* ── Translation card (Duolingo style) ── */
  translationCard: {
    marginTop: 6,
    marginHorizontal: 4,
    backgroundColor: '#1C1C1E',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  translationKorean: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 30,
    textAlign: 'center',
  },

  /* word chips */
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
});
