import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, borderRadius } from '../theme';
import { getSavedWords, updateWord, deleteWord, SavedWord } from '../services/vocabStorage';
import { subscribeVocab, saveVocab } from '../services/syncService';
import { mergeFromFirestore } from '../services/vocabStorage';
import { Track } from '../types';

interface Props {
  onBack: () => void;
  uid: string | null;
  tracks: Track[];
  onQuizPress?: () => void;
}

const difficultyColor = {
  easy: '#30D158',
  medium: '#FFD60A',
  hard: '#FC3C44',
};

export default function VocabListScreen({ onBack, uid, tracks, onQuizPress }: Props) {
  const [words, setWords] = useState<SavedWord[]>(() => getSavedWords());
  const [editTarget, setEditTarget] = useState<SavedWord | null>(null);
  const [editKorean, setEditKorean] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // 로그인 상태면 Firestore 실시간 구독
  useEffect(() => {
    if (!uid) { setWords(getSavedWords()); return; }

    // 먼저 로컬과 병합
    mergeFromFirestore(getSavedWords(), uid).then(setWords);

    const unsub = subscribeVocab(uid, (remoteWords) => {
      if (remoteWords.length > 0) setWords(remoteWords);
    });
    return unsub;
  }, [uid]);

  const handleStartQuiz = () => {
    if (words.length < 3) {
      alert('퀴즈를 하려면 최소 3개의 단어가 필요합니다.');
      return;
    }
    setQuizMode(true);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setShowAnswer(false);
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (correct) setQuizScore(prev => prev + 1);
    setShowAnswer(true);
  };

  const handleNextQuiz = () => {
    if (currentQuizIndex < words.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // 퀴즈 종료
      alert(`퀴즈 완료! 점수: ${quizScore}/${words.length}`);
      setQuizMode(false);
    }
  };

  const handleDelete = useCallback((word: string) => {
    if (typeof window !== 'undefined') {
      if (window.confirm(`"${word}" 단어를 삭제할까요?`)) {
        deleteWord(word, uid).then(reload);
      }
    }
  }, [uid]);

  const handleEditOpen = (item: SavedWord) => {
    setEditTarget(item);
    setEditKorean(item.koreanMeaning ?? '');
    setEditMeaning(item.meaning ?? '');
  };

  const handleEditSave = () => {
    if (!editTarget) return;
    updateWord(editTarget.word, { koreanMeaning: editKorean, meaning: editMeaning }, uid)
      .then(reload);
    setEditTarget(null);
  };

  const getAlbumArt = (songName: string) => {
    const track = tracks.find(t => t.name === songName);
    return track?.albumArt || 'https://via.placeholder.com/60x60/333/fff?text=?';
  };

  const renderItem = ({ item }: { item: SavedWord }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{item.word}</Text>
          <View style={[styles.badge, { backgroundColor: difficultyColor[item.difficulty] + '22' }]}>
            <Text style={[styles.badgeText, { color: difficultyColor[item.difficulty] }]}>
              {item.difficulty.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleEditOpen(item)} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.word)} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {item.pronunciation ? <Text style={styles.pronunciation}>{item.pronunciation}</Text> : null}
      {item.koreanMeaning ? <Text style={styles.korean}>{item.koreanMeaning}</Text> : null}
      {item.meaning ? <Text style={styles.meaning}>{item.meaning}</Text> : null}

      <View style={styles.songRow}>
        <Image source={{ uri: getAlbumArt(item.songName) }} style={styles.albumArt} />
        <Text style={styles.songName}>♪ {item.songName}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>단어장</Text>
          <Text style={styles.subtitle}>
            {words.length}개 저장됨{uid ? ' · 동기화 중' : ''}
          </Text>
        </View>
        {words.length >= 3 && !quizMode && (
          <TouchableOpacity onPress={onQuizPress ?? handleStartQuiz} style={styles.quizBtn}>
            <Text style={styles.quizBtnText}>퀴즈</Text>
          </TouchableOpacity>
        )}
      </View>

      {words.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyText}>저장된 단어가 없습니다{'\n'}가사에서 단어를 터치해 저장하세요</Text>
        </View>
      ) : quizMode ? (
        <View style={styles.quizContainer}>
          <View style={styles.quizHeader}>
            <Text style={styles.quizProgress}>
              {currentQuizIndex + 1} / {words.length}
            </Text>
            <Text style={styles.quizScore}>
              점수: {quizScore}
            </Text>
          </View>
          
          <View style={styles.quizCard}>
            <Text style={styles.quizWord}>{words[currentQuizIndex].word}</Text>
            {showAnswer ? (
              <View style={styles.quizAnswer}>
                <Text style={styles.quizMeaning}>{words[currentQuizIndex].koreanMeaning}</Text>
                <Text style={styles.quizEnglish}>{words[currentQuizIndex].meaning}</Text>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNextQuiz}>
                  <Text style={styles.nextBtnText}>
                    {currentQuizIndex < words.length - 1 ? '다음' : '완료'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.quizOptions}>
                <TouchableOpacity
                  style={styles.optionBtn}
                  onPress={() => handleQuizAnswer(true)}
                >
                  <Text style={styles.optionText}>알고 있어요</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionBtn}
                  onPress={() => handleQuizAnswer(false)}
                >
                  <Text style={styles.optionText}>모르겠어요</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <TouchableOpacity style={styles.quizExit} onPress={() => setQuizMode(false)}>
            <Text style={styles.quizExitText}>퀴즈 종료</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(item) => item.word + item.savedAt}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 편집 모달 */}
      <Modal visible={!!editTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>"{editTarget?.word}" 수정</Text>

            <Text style={styles.inputLabel}>한국어 뜻</Text>
            <TextInput
              style={styles.input}
              value={editKorean}
              onChangeText={setEditKorean}
              placeholder="한국어 번역"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.inputLabel}>영어 뜻</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editMeaning}
              onChangeText={setEditMeaning}
              placeholder="English definition"
              placeholderTextColor={colors.textTertiary}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditTarget(null)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleEditSave}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, alignItems: 'center' },
  quizBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
  },
  quizBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  quizContainer: { flex: 1, padding: spacing.md },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  quizProgress: { fontSize: 16, fontWeight: '600', color: colors.text },
  quizScore: { fontSize: 16, fontWeight: '600', color: colors.primary },
  quizCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quizWord: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  quizOptions: { width: '100%', gap: spacing.md },
  optionBtn: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionText: { fontSize: 18, fontWeight: '600', color: colors.text },
  quizAnswer: { width: '100%', alignItems: 'center' },
  quizMeaning: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  quizEnglish: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  quizExit: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  quizExitText: { color: colors.textTertiary, fontSize: 14 },
  list: { padding: spacing.md, gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: 24, fontWeight: '800', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  actionIcon: { fontSize: 16 },
  pronunciation: { fontSize: 15, color: colors.primary, fontStyle: 'italic' },
  korean: { fontSize: 20, fontWeight: '700', color: colors.text },
  meaning: { fontSize: 16, color: colors.textSecondary, lineHeight: 24 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  albumArt: { width: 32, height: 32, borderRadius: 4 },
  songName: { fontSize: 13, color: colors.textTertiary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 15, color: colors.textTertiary, textAlign: 'center', lineHeight: 22 },
  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  inputLabel: { fontSize: 13, color: colors.textTertiary, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: borderRadius.full, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.surfaceSecondary },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveBtn: { backgroundColor: colors.primary },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
