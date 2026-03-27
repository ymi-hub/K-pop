# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Deploy

```bash
# Web build (output → dist/)
npx expo export --platform web

# Deploy to Firebase Hosting (https://k-pop-e9f48.web.app)
firebase deploy --only hosting

# Local dev server
npx expo start --web
```

No test suite exists. There is no lint script in package.json.

## Environment Variables

All secrets live in `.env` (not committed). Prefix: `EXPO_PUBLIC_` (Expo injects into client bundle).

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_YOUTUBE_API_KEY` | YouTube Data API v3 — 10,000 units/day quota; search costs 100 units each |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase project `k-pop-e9f48` config |

## Architecture

**Platform**: React Native (Expo SDK 55) compiled to **web only** via `react-native-web`. No native iOS/Android builds are used or tested.

**App.tsx is the single source of truth** for all playback state and screen routing. There is no navigation library — screens are conditionally rendered based on a `Screen` string state (`'home' | 'player' | 'vocab' | 'playlist' | 'playlists' | 'album' | 'recent' | 'allAlbums'`). Each screen receives callbacks from App.tsx; screens do not hold playback state.

### Dual-Player Audio Architecture

Two audio players run in parallel. `playerModeRef` (`'audio' | 'youtube'`) determines which is active at any moment:

1. **`audioPlayer.ts`** — HTML `<audio>` element. Plays iTunes 30-second preview URLs immediately on user gesture (no autoplay restrictions). Used as instant fallback.

2. **`youtubePlayer.ts`** — YouTube IFrame API. Plays full songs. Initialized once via `initYouTubeAPI()` + `setYTCallback()`. Each new song calls `ytLoadVideo(videoId)` which **destroys and recreates** the player with `autoplay:1, mute:1` (Chrome muted autoplay policy). A `MutationObserver` injects `allow="autoplay; encrypted-media; fullscreen"` onto the iframe the moment YT creates it — this must happen before the iframe src loads, not in `onReady`. On `YT_STATE.PLAYING`, `ytUnMute()` restores volume and `audioPause()` stops the iTunes fallback.

**Playback flow in `playTrack()`**:
1. Set `playerModeRef = 'audio'`, call `audioLoadAndPlay(previewUrl)` — synchronous, guaranteed to work
2. `await searchYouTube(track, artist)` — async; checks localStorage cache first (7-day TTL), then YouTube Data API with `videoEmbeddable: 'true'` filter, then Invidious instances as quota fallback
3. If videoId found: set `playerModeRef = 'youtube'`, call `ytLoadVideo(videoId)`
4. `audioPause()` is called inside the `YT_STATE.PLAYING` handler — **not** before — so iTunes keeps playing if YouTube fails

### Data Flow

- **Track catalog**: iTunes Search API (`itunes.ts`) — fetches BTS songs from `itunes.apple.com/search`
- **Lyrics**: lrclib.net (`lyrics.ts`) — free, no API key, synced LRC format; words are time-interpolated per lyric line
- **Vocab definitions**: Free Dictionary API + Google Translate (unofficial) / MyMemory fallback (`lyrics.ts` → `getWordDefinition`)
- **Liked tracks**: localStorage (logged out) or Firestore `users/{uid}.likedIds` (logged in, real-time via `onSnapshot`)
- **Playlists**: localStorage only (`playlistStorage.ts`)
- **YouTube search cache**: localStorage key `kpop_yt_cache`, 7-day TTL per track

### Firestore Schema

```
users/{uid}
  likedIds: string[]          # track IDs
  /data/vocab
    words: SavedWord[]
```

### Theme

All colors/spacing come from `src/theme/index.ts`. Primary accent is `#FC3C44` (Apple Music red). Design target is Apple Music dark UI.
