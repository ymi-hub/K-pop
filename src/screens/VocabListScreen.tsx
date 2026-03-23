import React, { useState, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { getSavedWords, updateWord, deleteWord, SavedWord } from '../services/vocabStorage';

interface Props {
  onBack: () => void;
}

const difficultyColor = {
  easy: '#30D158',
  medium: '#FFD60A',
  hard: '#FC3C44',
};

export default function VocabListScreen({ onBack }: Props) {
  const [words, setWords] = useState<SavedWord[]>(() => getSavedWords());
  const [editTarget, setEditTarget] = useState<SavedWord | null>(null);
  const [editKorean, setEditKorean] = useState('');
  const [editMeaning, setEditMeaning] = useState('');

  const reload = () => setWords(getSavedWords());

  const handleDelete = useCallback((word: string) => {
    if (typeof window !== 'undefined') {
      if (window.confirm(`"${word}" 단어를 삭제할까요?`)) {
        deleteWord(word);
        reload();
      }
    }
  }, []);

  const handleEditOpen = (item: SavedWord) => {
    setEditTarget(item);
    setEditKorean(item.koreanMeaning ?? '');
    setEditMeaning(item.meaning ?? '');
  };

  const handleEditSave = () => {
    if (!editTarget) return;
    updateWord(editTarget.word, {
      koreanMeaning: editKorean,
      meaning: editMeaning,
    });
    setEditTarget(null);
    reload();
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
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.word)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="#FF453A" />
          </TouchableOpacity>
        </View>
      </View>

      {item.pronunciation ? (
        <Text style={styles.pronunciation}>{item.pronunciation}</Text>
      ) : null}

      {item.koreanMeaning ? (
        <Text style={styles.korean}>{item.koreanMeaning}</Text>
      ) : null}

      {item.meaning ? (
        <Text style={styles.meaning}>{item.meaning}</Text>
      ) : null}

      <Text style={styles.songName}>
        <Ionicons name="musical-note" size={11} color={colors.textTertiary} /> {item.songName}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>단어장</Text>
          <Text style={styles.subtitle}>{words.length}개 저장됨</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {words.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyText}>저장된 단어가 없습니다{'\n'}가사에서 단어를 터치해 저장하세요</Text>
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
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditTarget(null)}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleEditSave}
              >
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
  title: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', marginTop: 2 },
  list: { padding: spacing.md, gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
  pronunciation: { fontSize: 15, color: colors.primary, fontStyle: 'italic' },
  korean: { fontSize: 20, fontWeight: '700', color: colors.text },
  meaning: { fontSize: 16, color: colors.textSecondary, lineHeight: 24 },
  songName: { fontSize: 13, color: colors.textTertiary, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 15, color: colors.textTertiary, textAlign: 'center', lineHeight: 22 },
  // 모달
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
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
  modalBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: borderRadius.full, alignItems: 'center',
  },
  cancelBtn: { backgroundColor: colors.surfaceSecondary },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveBtn: { backgroundColor: colors.primary },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
