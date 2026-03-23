import { SPOTIFY_CONFIG } from '../config/spotify';

// Spotify Implicit Grant (서버 요청 없이 토큰 즉시 수신)
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const WEB_REDIRECT_URI = 'https://k-pop-e9f48.web.app/';

export function initiateSpotifyLogin(): void {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: 'token',
    redirect_uri: WEB_REDIRECT_URI,
    scope: SPOTIFY_CONFIG.scopes.join(' '),
    show_dialog: 'false',
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

// Implicit Grant는 URL 해시(#)로 토큰 반환
export function parseTokenFromHash(): string | null {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (token) {
    localStorage.setItem('spotify_token', token);
    localStorage.setItem('spotify_token_expiry',
      String(Date.now() + parseInt(expiresIn ?? '3600') * 1000));
    return token;
  }
  return null;
}

// 기존 handleSpotifyCallback은 더 이상 사용 안 함
export async function handleSpotifyCallback(_code: string): Promise<string | null> {
  return null;
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem('spotify_token');
  const expiry = localStorage.getItem('spotify_token_expiry');
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expiry');
    return null;
  }
  return token;
}

export function clearToken(): void {
  localStorage.removeItem('spotify_token');
  localStorage.removeItem('spotify_token_expiry');
}
