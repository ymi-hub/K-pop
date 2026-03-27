import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
  Image,
} from 'react-native';
import { User } from 'firebase/auth';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  onBack: () => void;
  user?: User | null;
  authLoading?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function SettingsScreen({ onBack, user, authLoading, onLogin, onLogout }: Props) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 동기화</Text>
          {user ? (
            <View>
              <View style={styles.accountRow}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{user.displayName?.[0] ?? '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName} numberOfLines={1}>{user.displayName}</Text>
                  <View style={styles.syncRow}>
                    <View style={styles.syncDot} />
                    <Text style={styles.syncLabel}>모든 기기 실시간 동기화 중</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={onLogin}
              disabled={authLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>
                {authLoading ? '로그인 중...' : 'Google로 로그인 — 모든 기기 동기화'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>외관</Text>
          <View style={styles.setting}>
            <Text style={styles.settingLabel}>다크 모드</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={darkMode ? '#fff' : colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>재생</Text>
          <View style={styles.setting}>
            <Text style={styles.settingLabel}>자동 재생</Text>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={autoPlay ? '#fff' : colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.setting}>
            <Text style={styles.settingLabel}>푸시 알림</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notifications ? '#fff' : colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.info}>
            <Text style={styles.infoText}>버전: 1.0.0</Text>
            <Text style={styles.infoText}>K-pop English</Text>
            <Text style={styles.infoText}>BTS 가사로 배우는 영어</Text>
          </View>
        </View>
      </View>
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
  backIcon: { fontSize: 36, color: colors.text, lineHeight: 40 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  content: { flex: 1, padding: spacing.md },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLabel: { fontSize: 16, color: colors.text },
  info: { gap: spacing.sm },
  infoText: { fontSize: 14, color: colors.textSecondary },

  // 계정 동기화
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FC3C44', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  accountName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#30D158' },
  syncLabel: { fontSize: 12, color: '#30D158', fontWeight: '600' },
  logoutBtn: {
    paddingVertical: 10, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  logoutText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.lg, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  googleIcon: { fontSize: 16, fontWeight: '900', color: '#4285F4', width: 24, textAlign: 'center' },
  googleText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', flex: 1 },
});