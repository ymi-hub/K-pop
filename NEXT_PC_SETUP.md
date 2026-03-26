# 다른 PC에서 시작하는 방법

## 1. 저장소 클론 (처음 사용하는 PC)

```bash
git clone https://github.com/ymi-hub/K-pop.git
cd K-pop
npm install
```

## 2. 이미 클론된 PC라면

```bash
cd K-pop
git pull origin master
npm install
```

## 3. 개발 서버 실행

```bash
npx expo start --web
```

브라우저에서 http://localhost:8081 접속

## 4. 빌드 & 배포

```bash
# 빌드
npx expo export --platform web

# Firebase 배포
npx --yes firebase-tools deploy --only hosting
```

배포 후 확인: https://k-pop-e9f48.web.app

---

## 현재 구현된 기능 (2026-03-26 기준)

- **검색** — iTunes API, iOS CORS 해결 (credentials:omit), 중복 제거, 단일 곡 플랫 뷰
- **퀴즈** — Duolingo 스타일, 사운드 효과, 30초 타이머
- **가사** — 더블탭 번역, 단어 탭으로 뜻 보기
- **플레이어** — 깜박임 제거, 좋아요 토글
- **홈** — 즐겨찾기 최신순, 플레이리스트 곡 포함
- **볼륨** — 마지막 볼륨 저장/복원
- **탭바** — 홈 / 보관함 / 즐겨찾기 / 검색 / 퀴즈

## 주요 파일 구조

```
K-pop/
├── App.tsx                          # 전체 라우팅 및 상태 관리
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx           # 홈/보관함/즐겨찾기
│   │   ├── SearchScreen.tsx         # 검색
│   │   ├── PlayerScreen.tsx         # 전체화면 플레이어
│   │   ├── QuizScreen.tsx           # 퀴즈
│   │   ├── VocabListScreen.tsx      # 단어장
│   │   ├── PlaylistScreen.tsx       # 플레이리스트
│   │   └── SettingsScreen.tsx       # 설정
│   ├── components/
│   │   ├── MiniPlayer.tsx           # 미니 플레이어 (MINI_PLAYER_H=66)
│   │   ├── TabBar.tsx               # 하단 탭바 (TAB_BAR_H=60)
│   │   ├── LyricsView.tsx           # 가사 뷰
│   │   └── Icon.tsx                 # SVG 아이콘
│   └── services/
│       ├── youtubePlayer.ts         # YouTube IFrame API
│       ├── youtubeSearch.ts         # YouTube 검색
│       ├── playlistStorage.ts       # 플레이리스트 저장
│       └── vocabStorage.ts          # 단어장 저장
└── firebase.json                    # Firebase 설정 (캐시 헤더 포함)
```

## localStorage 키

| 키 | 내용 |
|---|---|
| `kpop_volume` | 마지막 볼륨 (0~100) |
| `kpop_liked_ids` | 좋아요한 곡 ID 배열 (최신순) |
| `kpop_my_playlist` | 저장된 플레이리스트 |
| `kpop_saved_words` | 저장된 단어장 |
