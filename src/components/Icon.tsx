/**
 * SVG 아이콘 컴포넌트 — data URI 방식, 추가 패키지 불필요
 * Apple Music / SF Symbols 스타일
 */
import React from 'react';
import { Image } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';

export type IconName =
  | 'chevron-down' | 'chevron-right' | 'chevron-left'
  | 'ellipsis'
  | 'heart' | 'heart-fill'
  | 'play' | 'pause'
  | 'backward' | 'forward'
  | 'shuffle' | 'repeat' | 'repeat-1'
  | 'volume-low' | 'volume-high'
  | 'lyrics' | 'airplay' | 'queue'
  | 'musical-note' | 'musical-notes'
  | 'book' | 'close' | 'bookmark' | 'bookmark-fill'
  | 'home' | 'home-fill' | 'grid' | 'search' | 'person'
  | 'settings'
  | 'star' | 'star-fill';

/* ── SVG 문자열 생성기 (color 파라미터로 색 교체) ── */
const ICONS: Record<IconName, (c: string) => string> = {
  'chevron-down': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'chevron-right': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'chevron-left': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'ellipsis': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="${c}"/><circle cx="12" cy="12" r="1.6" fill="${c}"/><circle cx="19" cy="12" r="1.6" fill="${c}"/></svg>`,
  'heart': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  'heart-fill': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="${c}"/></svg>`,
  'play': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 4.75C6 4.06 6.77 3.64 7.34 4.02l12.38 7.25c.54.31.54 1.12 0 1.44L7.34 19.96C6.77 20.35 6 19.93 6 19.24V4.75z" fill="${c}"/></svg>`,
  'pause': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="5" y="4" width="4.5" height="16" rx="1.5" fill="${c}"/><rect x="14.5" y="4" width="4.5" height="16" rx="1.5" fill="${c}"/></svg>`,
  'backward': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 5L9 12l10 7V5z" fill="${c}"/><rect x="5" y="5" width="2.5" height="14" rx="1.2" fill="${c}"/></svg>`,
  'forward': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 5l10 7-10 7V5z" fill="${c}"/><rect x="16.5" y="5" width="2.5" height="14" rx="1.2" fill="${c}"/></svg>`,
  'shuffle': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="20" x2="21" y2="3" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="21 16 21 21 16 21" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="15" y1="15" x2="21" y2="21" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="4" x2="9" y2="9" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'repeat': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 23 3 19 7 15" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'repeat-1': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 23 3 19 7 15" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="14.5" font-size="5.5" fill="${c}" font-family="system-ui" font-weight="800" text-anchor="middle">1</text></svg>`,
  'volume-low': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="${c}"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
  'volume-high': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="${c}"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
  'lyrics': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="9" y1="10" x2="15" y2="10" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/><line x1="9" y1="13" x2="13" y2="13" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  'airplay': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polygon points="12 15 17 21 7 21" fill="${c}"/></svg>`,
  'queue': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" stroke="${c}" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="21" y2="12" stroke="${c}" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="18" x2="21" y2="18" stroke="${c}" stroke-width="2" stroke-linecap="round"/><circle cx="3.5" cy="6" r="1.5" fill="${c}"/><circle cx="3.5" cy="12" r="1.5" fill="${c}"/><circle cx="3.5" cy="18" r="1.5" fill="${c}"/></svg>`,
  'musical-note': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="${c}"/><circle cx="18" cy="16" r="3" fill="${c}"/></svg>`,
  'musical-notes': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="${c}" stroke-width="2"/><circle cx="18" cy="16" r="3" fill="none" stroke="${c}" stroke-width="2"/></svg>`,
  'book': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'close': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  'bookmark': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'bookmark-fill': (c) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'home': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M9 21V12h6v9" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/></svg>`,
  'home-fill': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" fill="${c}"/><path d="M9 21V12h6v9" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round" opacity="0.3"/></svg>`,
  'grid': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="${c}"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="${c}"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="${c}"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="${c}"/></svg>`,
  'search': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="${c}" stroke-width="2"/><line x1="16.5" y1="16.5" x2="22" y2="22" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  'person': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="${c}"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="${c}" opacity="0.85"/></svg>`,
  'settings': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="${c}" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'star': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'star-fill': (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="${c}"/></svg>`,
};

/* ── Icon 컴포넌트 ── */
interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

export default function Icon({ name, size = 24, color = '#fff', style }: IconProps) {
  const builder = ICONS[name] ?? ICONS['musical-note'];
  const svg = builder(color);
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
    />
  );
}
