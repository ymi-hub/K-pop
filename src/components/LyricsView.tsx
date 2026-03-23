import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { getWordDefinition } from '../services/lyrics';
import { LyricLine, VocabEntry } from '../types';
import { colors, spacing } from '../theme';

interface Props {
  lyrics: LyricLine[];
  currentLineIndex: number;
  currentMs: number;
  onWordPress: (vocab: VocabEntry) => void;
}

export default function LyricsView({ lyrics, currentLineIndex, currentMs, onWordPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  // 현재 가사 라인으로 자동 스크롤
  useEffect(() => {
    if (currentLineIndex > 1) {
      scrollRef.current?.scrollTo({
        y: currentLineIndex * 52,
        animated: true,
      });
    }
  }, [currentLineIndex]);

  const handleWordPress = async (word: string) => {
    const vocab = await getWordDefinition(word);
    if (vocab) onWordPress(vocab);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {lyrics.map((line, lineIdx) => {
        const isActive = lineIdx === currentLineIndex;
        const isPast = lineIdx < currentLineIndex;

        return (
          <View key={lineIdx} style={styles.line}>
            {line.words.map((word, wordIdx) => (
              <TouchableOpacity
                key={wordIdx}
                onPress={() => handleWordPress(word.text)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.word,
                    isActive && styles.wordActive,
                    isPast && styles.wordPast,
                  ]}
                >
                  {word.text}{' '}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
      <View style={{ height: 200 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 6,
  },
  word: {
    fontSize: 16,
    color: colors.textTertiary,
    fontWeight: '500',
    lineHeight: 28,
  },
  wordActive: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
  },
  wordPast: {
    color: 'rgba(255,255,255,0.35)',
  },
});
