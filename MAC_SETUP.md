# Mac에서 K-pop English 이어 작업하기

## 1. 사전 준비 (처음 한 번만)

### Node.js 설치
```bash
# Homebrew가 없으면 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node
```

### Firebase CLI 설치
```bash
npm install -g firebase-tools
firebase login
```

### Claude Code 설치
```bash
npm install -g @anthropic-ai/claude-code
```

---

## 2. 프로젝트 클론 (처음 한 번만)

```bash
cd ~
git clone https://github.com/ymi-hub/K-pop.git
cd K-pop
npm install
```

---

## 3. .env 파일 생성 (처음 한 번만 — git에 없음)

```bash
cat > ~/.../K-pop/.env << 'EOF'
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBPM4W4DyxuRPKusKf5VgJwl0oIjPFWEhc
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=k-pop-e9f48.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=k-pop-e9f48
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=k-pop-e9f48.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=843335185954
EXPO_PUBLIC_FIREBASE_APP_ID=1:843335185954:web:73cf32d90532373fe9bc7b
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-T7MN478EQN
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=f85d6a3d6abf4654bc7622df28c55da1
EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSyARi9YRLTagPA-sJ-LzPb6wCXnSjP3sXK8
EOF
```

> ⚠️ 위 명령어의 `~/.../K-pop/` 부분을 실제 클론 경로로 바꾸세요.
> 예: `~/K-pop/.env`

---

## 4. 매번 작업 시작할 때

```bash
cd ~/K-pop       # 클론한 경로로 이동
git pull         # 최신 코드 동기화
claude           # Claude Code 실행
```

---

## 5. 빌드 & 배포

```bash
# 빌드
npx expo export --platform web

# Firebase 배포
firebase deploy --only hosting
```

배포 URL: https://k-pop-e9f48.web.app

---

## 6. 현재 프로젝트 상태 (2026-03-28 기준, commit: 32bfd2e)

| 기능 | 상태 |
|---|---|
| 음악 재생 | ✅ iTunes 미리보기 즉시 재생 → YouTube 전체 곡 자동 전환 |
| 볼륨 제어 | ✅ 슬라이더 hit area 수정, play/stop 시 볼륨 안정화 |
| 가사 보기 | ✅ onLayout 실측 기반 정확한 중앙 정렬 스크롤 |
| 가사 번역 | ✅ 두 번 탭 → 한국어 번역 + 영단어 칩 (overflow 수정) |
| 단어장 | ✅ Firestore 동기화, 퀴즈 연동 |
| 퀴즈 | ✅ 저장 단어 기반 4지선다 |
| 검색 | ✅ iTunes KR+US, OST 검색 정상화 |
| 플레이리스트 저장 | ✅ 검색 → 저장 → Firestore 자동 동기화 |
| 실시간 동기화 | ✅ 기기 간 즐겨찾기·단어장·최근재생·플레이리스트 |
| 홈 플레이리스트 카드 | ✅ 최신순 열 단위 배치, 최대 10앨범, 가로 동적 |
| 플레이어 슬라이드 | ✅ 스와이프 다운 → 미니 플레이어 |

## 7. 주요 파일 위치

| 역할 | 파일 |
|---|---|
| 전체 상태 관리 | `App.tsx` |
| 홈 화면 | `src/screens/HomeScreen.tsx` |
| 플레이어 | `src/screens/PlayerScreen.tsx` |
| 검색 | `src/screens/SearchScreen.tsx` |
| 가사 뷰 | `src/components/LyricsView.tsx` |
| YouTube 플레이어 | `src/services/youtubePlayer.ts` |
| iTunes 플레이어 | `src/services/audioPlayer.ts` |
| Firestore 동기화 | `src/services/syncService.ts` |
| 플레이리스트 저장 | `src/services/playlistStorage.ts` |
| PDF 생성 스크립트 | `scripts/gen-pdf.js` |

## 8. 기능정의서 PDF 재생성

```bash
cd ~/K-pop
node scripts/gen-pdf.js
# → K-pop 기능정의서.pdf 생성 (프로젝트 폴더 + 바탕화면)
```
> Mac 바탕화면 경로는 `scripts/gen-pdf.js` 안의 `desktopPdf` 경로를
> `/Users/사용자명/Desktop/K-pop 기능정의서.pdf` 로 수정하세요.
