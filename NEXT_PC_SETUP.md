# 내일 다른 PC에서 바로 시작하기

## ✅ 시작 전 한 줄 명령어 (K-pop 폴더에서 실행)

```bash
git pull origin master
```

그게 전부입니다. 바로 작업 시작하면 됩니다.

---

## 📦 배포할 때

```bash
npx expo export --platform web && npx --yes firebase-tools deploy --only hosting
```

배포 확인: https://k-pop-e9f48.web.app

---

## 🗂 프로젝트 현황 (2026-03-26 기준, commit: de62e37)

| 기능 | 상태 |
|---|---|
| 검색 | ✅ iTunes API, iOS CORS 해결, 중복 제거 |
| 퀴즈 | ✅ Duolingo 스타일, 사운드, 타이머 |
| 가사 | ✅ 더블탭 번역, 단어 뜻 보기 |
| 플레이어 | ✅ 깜박임 제거, 좋아요 토글 |
| 단어장 | ✅ ‹ 홈 버튼, 퀴즈 연동 |
| 홈 | ✅ 즐겨찾기 최신순, 플레이리스트 포함 |
| 볼륨 | ✅ 마지막 볼륨 저장/복원 |
| 탭바 | ✅ 홈/보관함/즐겨찾기/검색/퀴즈 |

## 🔑 주요 상수

- `TAB_BAR_H = 60` — `src/components/TabBar.tsx`
- `MINI_PLAYER_H = 66` — `src/components/MiniPlayer.tsx`

## 💾 localStorage 키

| 키 | 내용 |
|---|---|
| `kpop_volume` | 마지막 볼륨 (0~100) |
| `kpop_liked_ids` | 좋아요 곡 ID (최신순) |
| `kpop_my_playlist` | 저장된 플레이리스트 |
| `kpop_saved_words` | 저장된 단어장 |
