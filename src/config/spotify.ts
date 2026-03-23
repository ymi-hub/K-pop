// Spotify API 설정
// https://developer.spotify.com/dashboard 에서 앱 생성 후 값을 교체하세요
export const SPOTIFY_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '',
  redirectUri: 'kpop-english://spotify-callback',
  scopes: [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-library-read',
    'user-read-playback-state',
    'user-modify-playback-state',
  ],
};

// BTS 아티스트 ID (Spotify)
export const BTS_ARTIST_ID = '3Nrfpe0tUJi4K4DXYWgMUX';
