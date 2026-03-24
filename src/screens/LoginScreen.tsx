import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { initiateSpotifyLogin } from '../services/spotifyAuth';
import { colors, spacing, borderRadius } from '../theme';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const handleLoginPress = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        '웹에서만 이용 가능',
        'Spotify 로그인은 현재 웹 환경에서만 지원됩니다. 브라우저에서 접속해주세요.'
      );
      return;
    }
    initiateSpotifyLogin();
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460', '#000000']}
      style={styles.container}
    >
      {/* 로고 영역 */}
      <View style={styles.logoArea}>
        <View style={styles.iconCircle}>
          <Ionicons name="musical-notes" size={64} color={colors.primary} />
        </View>
        <Text style={styles.appName}>K-pop English</Text>
        <Text style={styles.tagline}>BTS 가사로 배우는 영어</Text>
      </View>

      {/* 기능 소개 */}
      <View style={styles.features}>
        {[
          { icon: 'musical-note', text: 'BTS 전체 곡 스트리밍' },
          { icon: 'text', text: '실시간 가사 싱크' },
          { icon: 'book', text: '가사 속 영어 단어 즉시 검색' },
        ].map((item, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={item.icon as any} size={20} color={colors.primary} />
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Spotify 로그인 버튼 */}
      <View style={styles.loginArea}>
        <TouchableOpacity style={styles.spotifyBtn} onPress={handleLoginPress}>
          <Ionicons name="logo-github" size={24} color="#000" />
          <Text style={styles.spotifyBtnText}>Spotify로 시작하기</Text>
        </TouchableOpacity>
        <Text style={styles.notice}>
          Spotify 계정이 필요합니다{'\n'}
          무료 계정은 30초 미리듣기만 제공됩니다
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    minHeight: height,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(252,60,68,0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  features: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  loginArea: {
    alignItems: 'center',
    gap: spacing.md,
  },
  spotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1DB954',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    width: '100%',
  },
  spotifyBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  notice: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
