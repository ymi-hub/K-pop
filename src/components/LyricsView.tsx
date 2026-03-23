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

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineIndex > 0) {
      const y = currentLineIndex * 72 - height * 0.25;
      scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
    }
  }, [currentLineIndex]);

  // Double-tap → translate whole line
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

  // Long press → word definition (first English word)
  const handleLineLongPress = async (line: LyricLine) => {
    const words = line.words.map((w) => w.text.replace(/[^a-zA-Z]/g, '')).filter((w) => w.length >= 2);
    if (words.length === 0) return;
    const vocab = await getWordDefinition(words[0]);
    if (vocab) onWordPress(vocab);
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
      <View style={{ height: height * 0.1 }} />

      {/* Usage hint */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>두 번 탭 → 번역  ·  꾹 누르기 → 단어 뜻</Text>
      </View>

      {lyrics.map((line, lineIdx) => {
        const isActive = lineIdx === currentLineIndex;
        const isPast = lineIdx < currentLineIndex;
        const isTranslated = translatedIdx === lineIdx;

        // Collect English words for chips
        const englishWords = line.words
          .map((w) => w.text.replace(/[^a-zA-Z]/g, ''))
          .filter((w) => w.length >= 2);

        return (
          <TouchableOpacity
            key={lineIdx}
            style={[styles.lineWrapper, isTranslated && styles.lineWrapperHighlight]}
            onPress={() => handleLineTap(line, lineIdx)}
            onLongPress={() => handleLineLongPress(line)}
            delayLongPress={400}
            activeOpacity={0.85}
          >
            {/* ── Lyric text with word-level karaoke on active line ── */}
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
              <Text
                style={[
                  styles.lineText,
                  isPast && styles.lineTextPast,
                ]}
              >
                {line.text}
              </Text>
            )}

            {/* ── Translation box ── */}
            {isTranslated && (
              <View style={styles.translationBox}>
                {translating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text style={styles.translationText}>{translatedText}</Text>
                    {englishWords.length > 0 && (
                      <View style={styles.wordChips}>
                        {englishWords.map((word, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.wordChip}
                            onPress={async () => {
                              const vocab = await getWordDefinition(word);
                              if (vocab) onWordPress(vocab);
                            }}
                          >
                            <Text style={styles.wordChipText}>{word}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={{ height: height * 0.3 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { fontSize: 16, color: colors.textTertiary },

  hint: { marginBottom: 20, paddingHorizontal: 4 },
  hintText: { fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },

  lineWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    marginHorizontal: -10,
    marginBottom: 2,
  },
  lineWrapperHighlight: { backgroundColor: 'rgba(255,255,255,0.06)' },

  /* Non-active lines */
  lineText: {
    fontSize: 19,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.28)',
    lineHeight: 30,
  },
  lineTextPast: { color: 'rgba(255,255,255,0.48)' },

  /* Active line container */
  lineTextActive: {
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 36,
  },

  /* Word-level karaoke within active line */
  wordBase: { fontSize: 23, fontWeight: '800' },
  wordPast: { color: 'rgba(255,255,255,0.92)' },
  wordCurrent: { color: '#FFFFFF' },
  wordFuture: { color: 'rgba(255,255,255,0.32)' },

  /* Translation */
  translationBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(252,60,68,0.10)',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: 10,
  },
  translationText: {
    fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 22,
  },
  wordChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  wordChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
});
