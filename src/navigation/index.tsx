import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

// 실제 사용할 스크린들은 App.tsx에서 state로 관리
export default function Navigation({ children }: { children: React.ReactNode }) {
  return (
    <NavigationContainer theme={{
      dark: true,
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    }}>
      {children}
    </NavigationContainer>
  );
}
