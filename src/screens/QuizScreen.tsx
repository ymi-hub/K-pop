import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { getSavedWords, SavedWord } from '../services/vocabStorage';
import Icon from '../components/Icon';
import { TAB_BAR_H } from '../components/TabBar';
import { MINI_PLAYER_H } from '../components/MiniPlayer';

interface Props {
  onBack: () => void;
  hasMiniPlayer?: boolean;
}

type QuizType = 'ko-to-en' | 'en-to-ko';

interface QuizQuestion {
  type: QuizType;
  prompt: string;
  correct: string;
  options: string[];
  pronunciation: string;
  songName: string;
}

function playSound(type: 'correct' | 'wrong') {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    if (type === 'correct') {
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.2);
      });
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
}

function buildQuestions(words: SavedWord[]): QuizQuestion[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const count = Math.min(10, shuffled.length);
  const selected = shuffled.slice(0, count);

  return selected.map(w => {
    const type: QuizType = Math.random() < 0.5 ? 'ko-to-en' : 'en-to-ko';
    const correct = type === 'ko-to-en' ? w.word : w.koreanMeaning;
    const prompt = type === 'ko-to-en' ? w.koreanMeaning : w.word;

    const others = words.filter(x => x.word !== w.word);
    const wrongPool = [...others].sort(() => Math.random() - 0.5).slice(0, 2);
    const wrongAnswers = wrongPool.map(x => type === 'ko-to-en' ? x.word : x.koreanMeaning);

    const options = [correct, ...wrongAnswers].sort(() => Math.random() - 0.5);

    return { type, prompt, correct, options, pronunciation: w.pronunciation, songName: w.songName };
  });
}

export default function QuizScreen({ onBack, hasMiniPlayer }: Props) {
  const bottomInset = TAB_BAR_H + (hasMiniPlayer ? MINI_PLAYER_H + 8 : 0) + 16;
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<'quiz' | 'answered' | 'result'>('quiz');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasEnoughWords, setHasEnoughWords] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initQuiz = useCallback(() => {
    const words = getSavedWords();
    if (words.length < 3) {
      setHasEnoughWords(false);
      return;
    }
    setHasEnoughWords(true);
    const qs = buildQuestions(words);
    setQuestions(qs);
    setCurrentIdx(0);
    setSelected(null);
    setQuizState('quiz');
    setScore(0);
    setTimeLeft(30);
  }, []);

  useEffect(() => {
    initQuiz();
  }, [initQuiz]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback((forcedAnswer?: string | null) => {
    stopTimer();
    const question = questions[currentIdx];
    if (!question) return;
    const answer = forcedAnswer !== undefined ? forcedAnswer : selected;
    const isCorrect = answer === question.correct;
    playSound(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore(prev => prev + 1);
    setQuizState('answered');
  }, [questions, currentIdx, selected, stopTimer]);

  useEffect(() => {
    if (quizState !== 'quiz' || questions.length === 0) return;

    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          handleConfirm(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => stopTimer();
  }, [currentIdx, quizState, questions.length]);

  const handleContinue = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      setQuizState('result');
    } else {
      setCurrentIdx(nextIdx);
      setSelected(null);
      setQuizState('quiz');
    }
  }, [currentIdx, questions.length]);

  if (!hasEnoughWords) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>단어가 부족해요</Text>
          <Text style={styles.emptyDesc}>
            퀴즈를 시작하려면 최소 3개의 단어를 저장해야 해요.{'\n'}
            노래 가사에서 단어를 저장해보세요!
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (quizState === 'result') {
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const encouragement = pct >= 80 ? '훌륭해요! 🌟' : pct >= 60 ? '잘 했어요! 👏' : '더 연습해봐요! 💪';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={[styles.resultContainer, { paddingBottom: bottomInset }]}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>퀴즈 완료!</Text>
          <Text style={styles.resultScore}>
            {score} / {total}
          </Text>
          <Text style={styles.resultPct}>{pct}%</Text>
          <Text style={styles.resultEncouragement}>{encouragement}</Text>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={initQuiz}>
              <Text style={styles.retryButtonText}>다시 하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.vocabButton} onPress={onBack}>
              <Text style={styles.vocabButtonText}>단어 보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      </SafeAreaView>
    );
  }

  const question = questions[currentIdx];
  const total = questions.length;
  const isAnswered = quizState === 'answered';
  const isCorrectAnswer = selected === question.correct;

  const timerColor =
    timeLeft <= 5 ? '#FF3B30' : timeLeft <= 10 ? '#FF9500' : colors.primary;

  const getOptionStyle = (option: string) => {
    if (!isAnswered) {
      if (selected === option) {
        return [styles.optionButton, styles.optionSelected];
      }
      return styles.optionButton;
    }
    if (option === question.correct) {
      return [styles.optionButton, styles.optionCorrect];
    }
    if (option === selected && option !== question.correct) {
      return [styles.optionButton, styles.optionWrong];
    }
    return styles.optionButton;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="close" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(currentIdx / total) * 100}%` },
            ]}
          />
        </View>
        <View style={[styles.timerBadge, { borderColor: timerColor }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}</Text>
        </View>
      </View>

      {/* Question Label */}
      <Text style={styles.questionLabel}>
        {question.type === 'ko-to-en'
          ? '올바른 영어 단어를 선택하세요'
          : '올바른 번역을 선택하세요'}
      </Text>

      {/* Character + Speech Bubble */}
      <View style={styles.characterArea}>
        <Text style={styles.character}>🐰</Text>
        <View style={styles.speechBubble}>
          <Text style={styles.promptText}>{question.prompt}</Text>
          {question.type === 'en-to-ko' && question.pronunciation ? (
            <Text style={styles.pronunciationText}>{question.pronunciation}</Text>
          ) : null}
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, idx) => (
          <TouchableOpacity
            key={`${option}-${idx}`}
            style={getOptionStyle(option)}
            onPress={() => {
              if (!isAnswered) setSelected(option);
            }}
            activeOpacity={isAnswered ? 1 : 0.7}
            disabled={isAnswered}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Area */}
      <View style={[styles.bottomArea, { paddingBottom: bottomInset }]}>
        {quizState === 'quiz' ? (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              selected ? styles.confirmButtonEnabled : styles.confirmButtonDisabled,
            ]}
            onPress={() => handleConfirm(undefined)}
            disabled={!selected}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.confirmButtonText,
                { color: selected ? '#fff' : 'rgba(255,255,255,0.3)' },
              ]}
            >
              확인
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.feedbackRow}>
              <View
                style={[
                  styles.feedbackIcon,
                  { backgroundColor: isCorrectAnswer ? 'rgba(48,209,88,0.2)' : 'rgba(255,59,48,0.2)' },
                ]}
              >
                <Text style={[styles.feedbackIconText, { color: isCorrectAnswer ? '#30D158' : '#FF3B30' }]}>
                  {isCorrectAnswer ? '✓' : '✗'}
                </Text>
              </View>
              <Text
                style={[
                  styles.feedbackMessage,
                  { color: isCorrectAnswer ? '#30D158' : '#FF3B30' },
                ]}
              >
                {isCorrectAnswer
                  ? '정답이에요! 🎉'
                  : `정답은 "${question.correct}"이에요`}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: isCorrectAnswer ? '#30D158' : '#FF3B30' },
              ]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>계속</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Result screen
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 24,
  },
  resultScore: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  resultPct: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  resultEncouragement: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 48,
  },
  resultButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  vocabButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vocabButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // Quiz header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  timerBadge: {
    minWidth: 52,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Question label
  questionLabel: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },

  // Character + bubble
  characterArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 40,
    gap: 12,
  },
  character: {
    fontSize: 90,
    lineHeight: 96,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  promptText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  pronunciationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 6,
  },

  // Options
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'flex-end',
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(252,60,68,0.1)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(48,209,88,0.2)',
    borderColor: '#30D158',
  },
  optionWrong: {
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderColor: '#FF3B30',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Bottom area
  bottomArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirmButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonEnabled: {
    backgroundColor: colors.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  feedbackIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackIconText: {
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackMessage: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
