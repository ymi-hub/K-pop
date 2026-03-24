import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPOTIFY_CONFIG } from '../config/spotify';

// Spotify PKCE OAuth
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Redirect URI (웹 환경 전용)
// Spotify Developer Dashboard에 반드시 등록해야 함
// 로컬 개발: http://localhost:19006/
// 프로덕션: https://yourdomain.com/
const WEB_REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/`
  : 'http://localhost:19006/';

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function initiateSpotifyLogin(): Promise<void> {
  if (Platform.OS !== 'web') {
    console.warn('Spotify login is currently only supported on web');
    return;
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: 'code',
    redirect_uri: WEB_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SPOTIFY_CONFIG.scopes.join(' '),
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function handleSpotifyCallback(code: string): Promise<string | null> {
  const verifier = sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) return null;

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: WEB_REDIRECT_URI,
        code_verifier: verifier,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      // 토큰을 AsyncStorage에 저장
      await AsyncStorage.setItem('spotify_token', data.access_token);
      await AsyncStorage.setItem(
        'spotify_token_expiry',
        String(Date.now() + data.expires_in * 1000)
      );
      sessionStorage.removeItem('spotify_code_verifier');
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getStoredToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('spotify_token');
    const expiry = await AsyncStorage.getItem('spotify_token_expiry');
    
    if (!token || !expiry) return null;
    
    if (Date.now() > parseInt(expiry)) {
      await AsyncStorage.removeItem('spotify_token');
      await AsyncStorage.removeItem('spotify_token_expiry');
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem('spotify_token');
    await AsyncStorage.removeItem('spotify_token_expiry');
  } catch {
    // ignore
  }
}
