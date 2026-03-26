import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Icon, { IconName } from './Icon';
import { colors } from '../theme';

export type TabId = 'home' | 'library' | 'liked' | 'search' | 'quiz' | 'vocab' | 'settings';

const TABS: { id: TabId; icon: IconName; activeIcon: IconName; label: string }[] = [
  { id: 'home',    icon: 'home',          activeIcon: 'home-fill',    label: '홈' },
  { id: 'library', icon: 'musical-notes', activeIcon: 'musical-notes', label: '보관함' },
  { id: 'liked',   icon: 'heart',         activeIcon: 'heart-fill',   label: '즐겨찾기' },
  { id: 'search',  icon: 'search',        activeIcon: 'search',       label: '검색' },
  { id: 'quiz',    icon: 'star',          activeIcon: 'star-fill',    label: '퀴즈' },
];

export const TAB_BAR_H = 60;

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabBar({ active, onChange }: Props) {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={72} tint="dark" style={styles.bar}>
        {TABS.map(({ id, icon, activeIcon, label }) => {
          const isActive = active === id;
          return (
            <TouchableOpacity
              key={id}
              style={styles.tab}
              onPress={() => onChange(id)}
              activeOpacity={0.7}
            >
              <Icon
                name={isActive ? activeIcon : icon}
                size={24}
                color={isActive ? colors.primary : 'rgba(255,255,255,0.45)'}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_H,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
