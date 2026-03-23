import { SPOTIFY_CONFIG } from '../config/spotify';

// Spotify PKCE OAuth (웹용)
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// 웹 배포 환경에서의 Redirect URI
const WEB_REDIRECT_URI = 'https://k-pop-e9f48.web.app/';

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
      localStorage.setItem('spotify_token', data.access_token);
      localStorage.setItem('spotify_token_expiry',
        String(Date.now() + data.expires_in * 1000));
      sessionStorage.removeItem('spotify_code_verifier');
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
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
