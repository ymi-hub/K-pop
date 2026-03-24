# K-pop English 🎵

BTS 가사로 배우는 영어 학습 앱 - React Native + Expo

## ✨ 주요 기능

- 🎵 **BTS 전체 곡 스트리밍** - Spotify API 연동
- 📖 **실시간 가사 싱크** - lrclib.net API 사용
- 📚 **영어 단어 학습** - 가사 속 단어 클릭 시 사전 검색
- 🎧 **크로스 플랫폼 재생** - iOS/Android/Web 지원
- 🔐 **Spotify 인증** - OAuth 2.0 PKCE 플로우

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 Spotify Client ID 입력
```

### 2. Spotify 설정

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 접속
2. 앱 생성 후 Client ID 복사
3. `.env` 파일에 입력:
   ```bash
   EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
   ```
4. Redirect URIs 등록:
   ```
   http://localhost:19006/
   http://localhost:3000/
   ```

### 3. 앱 실행

```bash
# 웹 버전 (권장)
npm run web

# iOS 에뮬레이터
npm run ios

# Android 에뮬레이터
npm run android
```

## 📱 사용 방법

1. **Spotify 로그인** - "Spotify로 시작하기" 버튼 클릭
2. **곡 선택** - BTS 곡 목록에서 선택
3. **가사 학습** - 실시간 가사 싱크로 영어 학습
4. **단어 검색** - 가사 속 단어 탭하여 뜻 확인

## 🛠️ 기술 스택

- **Frontend**: React Native 0.83.2, Expo ~55.0.8
- **Backend**: Spotify Web API, lrclib.net, Free Dictionary API
- **Storage**: AsyncStorage (크로스 플랫폼)
- **Audio**: expo-av (크로스 플랫폼 오디오)
- **Auth**: Spotify OAuth 2.0 PKCE
- **Language**: TypeScript

## 📋 제한사항

- **30초 미리듣기**: Spotify API 정책으로 전곡 재생 불가
- **웹 우선**: Spotify 로그인은 웹 환경에서만 지원
- **Premium 필요**: 전곡 듣기는 Spotify Premium 계정 필요

## 🔧 개발 환경

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn
- Expo CLI
- Spotify Developer 계정

### 권장 환경
- macOS (iOS 개발용)
- VS Code + React Native Extension Pack

## 📁 프로젝트 구조

```
src/
├── components/          # 재사용 컴포넌트
│   ├── LyricsView.tsx   # 가사 표시 컴포넌트
│   ├── PlayerControls.tsx # 플레이어 컨트롤
│   ├── VocabCard.tsx    # 단어 카드
│   └── ...
├── screens/            # 화면 컴포넌트
│   ├── HomeScreen.tsx  # 메인 화면
│   ├── PlayerScreen.tsx # 플레이어 화면
│   └── LoginScreen.tsx # 로그인 화면
├── services/           # API 및 비즈니스 로직
│   ├── spotify.ts      # Spotify API
│   ├── spotifyAuth.ts  # Spotify 인증
│   ├── lyrics.ts       # 가사 API
│   └── ...
├── config/             # 설정 파일
│   ├── spotify.ts      # Spotify 설정
│   └── firebase.ts     # Firebase 설정
├── theme/              # 디자인 토큰
└── types/              # TypeScript 타입
```

## 🤝 기여하기

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 감사의 말

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [lrclib.net](https://lrclib.net/) - 무료 가사 API
- [Free Dictionary API](https://dictionaryapi.dev/) - 무료 사전 API
- [Expo](https://expo.dev/) - React Native 플랫폼

---

**🎵 BTS 팬 여러분, 영어 학습 화이팅! 💪**</content>
<parameter name="filePath">/Users/youngmikim/claude/K-pop/README.md