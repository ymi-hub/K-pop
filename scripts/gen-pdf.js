// 기능정의서 PDF 생성 스크립트
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 55, right: 55 },
  info: { Title: 'K-pop English 기능정의서', Author: 'K-pop English Team' },
});

const out = path.join(__dirname, '..', 'K-pop 기능정의서.pdf');
doc.pipe(fs.createWriteStream(out));

// ── 폰트 설정 (한글 지원)
const fontPath = 'C:/Windows/Fonts/malgun.ttf';
const boldFontPath = 'C:/Windows/Fonts/malgunbd.ttf';
const hasBold = fs.existsSync(boldFontPath);

doc.registerFont('KR', fontPath);
doc.registerFont('KR-Bold', hasBold ? boldFontPath : fontPath);

const W = doc.page.width - 110; // 여백 제외 폭

function h1(text) {
  doc.moveDown(0.6)
     .font('KR-Bold').fontSize(16).fillColor('#1a1a2e')
     .text(text, { underline: false });
  doc.moveDown(0.2);
  doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor('#FC3C44').lineWidth(1.5).stroke();
  doc.moveDown(0.4);
}

function h2(text) {
  doc.moveDown(0.5)
     .font('KR-Bold').fontSize(12).fillColor('#FC3C44')
     .text(text);
  doc.moveDown(0.2);
}

function h3(text) {
  doc.moveDown(0.3)
     .font('KR-Bold').fontSize(10.5).fillColor('#333')
     .text(text);
  doc.moveDown(0.1);
}

function body(text, indent = 0) {
  doc.font('KR').fontSize(9.5).fillColor('#222')
     .text(text, { indent: indent * 10, lineGap: 2 });
}

function rule() {
  doc.moveDown(0.3);
  doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
  doc.moveDown(0.3);
}

// ═══════════════════════ 표지 ═══════════════════════
doc.font('KR-Bold').fontSize(28).fillColor('#FC3C44')
   .text('K-pop English', { align: 'center' });
doc.moveDown(0.3);
doc.font('KR-Bold').fontSize(20).fillColor('#1a1a2e')
   .text('기능정의서', { align: 'center' });
doc.moveDown(0.5);
doc.font('KR').fontSize(11).fillColor('#888')
   .text('작성일: 2026-03-27', { align: 'center' });
doc.moveDown(2);
doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor('#FC3C44').lineWidth(2).stroke();
doc.moveDown(2);

// ═══════════════════════ 1. 개요 ═══════════════════════
h1('1. 프로젝트 개요');
const overview = [
  ['앱명', 'K-pop English (K-pop 영어 학습 앱)'],
  ['플랫폼', 'React Native (Expo SDK 55) → Web Only (react-native-web)'],
  ['배포', 'Firebase Hosting  https://k-pop-e9f48.web.app'],
  ['인증', 'Firebase Auth (Google 로그인 — signInWithRedirect)'],
  ['DB', 'Firestore (로그인 시 실시간 동기화) / localStorage (비로그인)'],
  ['음원', 'iTunes 30초 미리보기 (즉시 재생) + YouTube IFrame (전체 곡)'],
];
overview.forEach(([k, v]) => {
  doc.font('KR-Bold').fontSize(9.5).fillColor('#555')
     .text(`${k}:`, { continued: true })
     .font('KR').fillColor('#222')
     .text(`  ${v}`, { lineGap: 3 });
});

// ═══════════════════════ 2. 화면 구성 ═══════════════════════
h1('2. 화면 구성 / 메뉴 구조');

h2('2-1. 루트 화면 라우팅 (App.tsx screen 상태)');
[
  "screen = 'home'    → HomeScreen (탭바 포함)",
  "screen = 'vocab'   → VocabListScreen (단어장 전체 목록)",
  "screen = 'album'   → AlbumDetailScreen (앨범 상세 — 선택된 앨범 곡목록)",
  "screen = 'search'  → SearchScreen (음악 검색 + 플레이리스트 저장)",
].forEach(t => body('• ' + t, 1));

h2('2-2. 플레이어 오버레이 (PlayerScreen)');
body('• 항상 App.tsx 루트에 절대위치로 렌더링', 1);
body('• playerExpanded = true  → 풀스크린 슬라이드 업', 1);
body('• playerExpanded = false → 미니 플레이어 수축 (Animated.spring)', 1);

h2('2-3. 하단 탭바 (HomeScreen 내부 tab 상태)');
[
  "tab = 'home'     → 홈 탭",
  "tab = 'library'  → 나의 보관함 탭 (LibraryTab)",
  "tab = 'search'   → 검색 탭 (SearchScreen 이동)",
  "tab = 'quiz'     → QuizScreen",
].forEach(t => body('• ' + t, 1));

h2('2-4. HomeScreen 내부 서브 페이지');
[
  "showRecent = true         → RecentScreen (최근 재생 전체 목록)",
  "showLibPage = 'liked'     → 즐겨찾기 전체 목록 (LibraryGridPage)",
  "showLibPage = 'playlist'  → 플레이리스트 전체 목록 (LibraryGridPage)",
  "showLibrary = true        → LibraryTab (나의 보관함)",
].forEach(t => body('• ' + t, 1));

// ═══════════════════════ 3. 각 화면 상세 ═══════════════════════
h1('3. 각 화면 상세 기능');

h2('3-1. 홈 화면 (HomeScreen)');
h3('상단 영역');
body('• Google 로그인 배너 (비로그인) / 사용자 이름 + 실시간 동기화 표시 (로그인)', 1);
body('• 헤더: "K-POP ENGLISH / POP ENGLISH" + 단어장 버튼 (AB 아이콘)', 1);
body('• 검색바 → 터치 시 SearchScreen 이동', 1);

h3('나의 보관함 섹션');
body('• 즐겨찾기 카드 + 플레이리스트 카드 → 가로 스와이프 (snapToInterval)', 1);
body('• 즐겨찾기 카드 (고정 너비 270px)', 1);
body('  - 배경: 최신 1~4곡 앨범아트 분할 표시, 없으면 gradient', 2);
body('  - 하단: "★ 즐겨찾기 / N곡"  →  터치: showLibPage = \'liked\'', 2);
body('• 플레이리스트 카드 (가로 auto = 가용 너비 전체)', 1);
body('  - 상단: "저장된 음악 / 플레이리스트 / N앨범 · N곡"', 2);
body('  - 본문: 앨범 이미지 5열×2행 (최대 10앨범, 앨범별 1장)', 2);
body('  - 이미지 크기 자동 = (카드너비 − 패딩 − 간격×4) / 5', 2);
body('  - 터치: showLibPage = \'playlist\'', 2);

h3('최근 재생한 음악 섹션 (기록 없으면 숨김)');
body('• 수평 스크롤 카드 / 섹션 타이틀 터치 → RecentScreen', 1);

h3('추천 앨범 · 전체 앨범 섹션');
body('• iTunes 인기 앨범 / 카드 터치 → AlbumDetailScreen', 1);
body('• "전체 보기" → AllAlbumsScreen', 1);

h2('3-2. 나의 보관함 탭 (LibraryTab)');
body('• 플레이리스트: AlbumDropdownList (앨범별 그룹 드롭다운)', 1);
body('  - 1곡 앨범: 앨범아트 + 곡명 + 재생시간 플랫 행', 2);
body('  - 2곡 이상: 헤더 탭 → 펼침/접힘 (LayoutAnimation)', 2);
body('• 편집 버튼 → 곡별 X 삭제', 1);
body('• Firestore 변경 시 kpop_playlist_synced 이벤트로 자동 갱신', 1);
body('• 즐겨찾기: 별 표시 곡 목록 → 터치 시 재생', 1);

h2('3-3. 검색 화면 (SearchScreen)');
h3('검색 방식');
body('• iTunes KR (country=KR&lang=ko_KR) + US 순차 조회 → 중복 제거 합산', 1);
body('• 결과 없으면 lrclib.net 폴백', 1);

h3('검색 결과');
body('• 앨범별 그룹화 (AlbumGroup) — 헤더 + 곡 목록', 1);
body('• 곡별: 앨범아트 / 곡명 / 아티스트 / 재생시간 / ▶ 재생 / + 저장', 1);
body('• 앨범 일괄 추가 버튼 (그룹 헤더 우측)', 1);

h3('플레이리스트 저장');
body('• + 버튼 → YouTube 검색 (캐시→API) + 가사 캐시 → addToPlaylist()', 1);
body('• 이미 저장 시 + → X, 재터치 시 삭제', 1);
body('• Firestore 자동 동기화 (로그인 시 setFirestorePlaylistSaver 연동)', 1);

h2('3-4. 플레이어 (PlayerScreen)');
h3('재생 모드 전환');
body('• 곡 선택 시 즉시 iTunes 미리보기 재생 (audioPlayer)', 1);
body('• YouTube 검색 완료 후 YouTube 전환 (audioPause → ytLoadVideo)', 1);
body('• playerModeRef: \'audio\' | \'youtube\'', 1);

h3('일반 플레이어 UI');
body('• 앨범아트 (재생 시 scale 1.0 / 정지 시 0.88 spring 애니메이션)', 1);
body('• 진행바 scrubbing / 재생·정지·이전·다음·셔플·반복(off/one/all)', 1);
body('• 볼륨 슬라이더: ytSetVolume + audioSetVolume 동시 적용, localStorage 저장', 1);
body('• 하단 툴바: 가사보기 / 싱크 오프셋 −/0/+ / 대기열', 1);

h3('가사 모드');
body('• 가사 전체화면 (fade+slide 전환)', 1);
body('• 현재 라인 단어별 하이라이트 / 자동 스크롤 (뷰 중앙 정렬)', 1);
body('• 한 번 탭: 싱크 오프셋 조정', 1);
body('• 두 번 탭: 번역 카드 (원문 + 한국어 + 영단어 칩)', 1);
body('  - 번역 카드는 lyricsView 레벨 렌더링 (overflow:hidden 영향 없음)', 2);
body('• 단어 칩 탭 → VocabCard → 단어장 저장', 1);

h2('3-5. 단어장 / 퀴즈 / 앨범 상세');
body('• VocabListScreen: 저장 단어 목록 (Firestore users/{uid}/data/vocab)', 1);
body('• QuizScreen: 저장 단어 기반 4지선다 퀴즈', 1);
body('• AlbumDetailScreen: 앨범 전체 곡 목록, 전체/랜덤 재생', 1);

// ═══════════════════════ 4. 데이터 동기화 ═══════════════════════
h1('4. 데이터 저장 / 동기화');

h2('4-1. 저장 항목');
// 표 대신 구조체로 표현
const dataItems = [
  ['즐겨찾기', 'localStorage', 'users/{uid}.likedIds (onSnapshot)'],
  ['단어장', 'localStorage', 'users/{uid}/data/vocab (onSnapshot)'],
  ['최근 재생', 'localStorage', 'users/{uid}/data/recent (최대 20곡)'],
  ['플레이리스트', 'localStorage', 'users/{uid}/data/playlist'],
  ['YouTube 캐시', 'localStorage (7일 TTL)', '없음 (기기별)'],
  ['가사 캐시', 'localStorage', '없음'],
];
dataItems.forEach(([item, offline, online]) => {
  doc.moveDown(0.15);
  doc.font('KR-Bold').fontSize(9.5).fillColor('#333')
     .text(`${item}`, 65, doc.y, { continued: true, width: 80 });
  doc.font('KR').fillColor('#666')
     .text(`비로그인: ${offline}`, { continued: true, width: 180 });
  doc.font('KR').fillColor('#222')
     .text(`로그인: ${online}`, { lineGap: 1 });
});

h2('4-2. 첫 로그인 데이터 보호');
body('• Firestore 값이 비어 있으면 localStorage 데이터를 Firestore에 업로드', 1);
body('• Firestore에 데이터가 있으면 Firestore → localStorage 덮어쓰기', 1);

h2('4-3. 실시간 동기화');
body('• onSnapshot으로 다른 기기 변경사항 즉시 반영', 1);
body('• kpop_playlist_synced 커스텀 이벤트로 각 화면 컴포넌트에 갱신 알림', 1);

// ═══════════════════════ 5. 음악 재생 흐름 ═══════════════════════
h1('5. 음악 검색 / 재생 흐름');

h2('5-1. 검색 흐름');
body('iTunes KR API → iTunes US API → 중복 제거 → 앨범 그룹화 → 결과 표시', 1);
body('결과 0건 시 → lrclib.net 폴백', 1);

h2('5-2. 재생 흐름 (playTrack)');
[
  '1. playerModeRef = \'audio\'',
  '2. audioLoadAndPlay(previewUrl)  ← 즉시 재생, 저장 볼륨 자동 적용',
  '3. searchYouTube(track, artist)  ← localStorage 캐시 → API → Invidious 폴백',
  '4. videoId 확보 시: ytLoadVideo(videoId)',
  '5. YT_STATE.PLAYING: ytUnMute() + audioPause()',
].forEach(t => body(t, 1));

h2('5-3. 볼륨 제어');
body('• VolumeBar 슬라이더 → ytSetVolume(v) + audioSetVolume(v) 동시 호출', 1);
body('• audioLoadAndPlay() 호출 시 localStorage \'kpop_volume\' 자동 적용', 1);

// ═══════════════════════ 6. 플레이리스트 저장 흐름 ═══════════════════════
h1('6. 플레이리스트 저장 흐름');

[
  '1. 검색 결과에서 + 버튼 탭',
  '2. YouTube 검색 (캐시 → API) — videoId 확보',
  '3. 가사 검색 (lrclib.net) → localStorage 캐시 저장',
  '4. addToPlaylist(track, videoId)',
  '   → localStorage \'kpop_my_playlist\' 저장',
  '   → _firestoreSaver?.(items) — 로그인 시 Firestore 자동 동기화',
  '5. 검색 화면 아이콘: + → X (재터치 시 삭제)',
].forEach(t => body(t, 1));

doc.moveDown(0.4);
h2('보관함 표시');
body('• LibraryTab: AlbumDropdownList (앨범별 그룹 드롭다운, 편집/삭제)', 1);
body('• 홈 카드: 앨범 이미지 5열×2행, 최대 10앨범 (앨범별 1장, 중복 제거)', 1);
body('  카운트: "N앨범 · N곡" (전체 저장 곡 수 기준)', 2);

// ═══════════════════════ 끝 ═══════════════════════
doc.addPage();
doc.font('KR-Bold').fontSize(13).fillColor('#FC3C44')
   .text('변경 이력', { align: 'left' });
doc.moveDown(0.3);
rule();
const history = [
  ['2026-03-27', '초기 기능정의서 작성 (PDF 변환)'],
  ['', '번역 카드 위치 수정 (lyricsView 레벨 렌더링)'],
  ['', '플레이리스트 카드 5열×2행 (최대 10앨범, 가로 auto)'],
  ['', '볼륨 제어: audioPlayer + ytPlayer 동시 적용'],
  ['', '크로스 디바이스 실시간 동기화 (Firestore onSnapshot)'],
  ['', '첫 로그인 localStorage → Firestore 자동 업로드'],
];
history.forEach(([date, desc]) => {
  doc.font('KR-Bold').fontSize(9).fillColor('#888')
     .text(date || ' ', 55, doc.y, { continued: true, width: 90 });
  doc.font('KR').fontSize(9).fillColor('#333')
     .text(desc, { lineGap: 3 });
});

doc.end();
console.log('PDF 생성 완료:', out);
