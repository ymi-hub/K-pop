// 기능정의서 PDF 생성 스크립트
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 55, right: 55 },
  info: { Title: 'K-pop English 기능정의서', Author: 'K-pop English Team' },
});

const projectPdf = path.join(__dirname, '..', 'K-pop 기능정의서.pdf');
const desktopPdf = path.join('C:/Users/webji/OneDrive/바탕 화면', 'K-pop 기능정의서.pdf');

// 두 경로에 동시 저장
const streams = [
  fs.createWriteStream(projectPdf),
  fs.createWriteStream(desktopPdf),
];
streams.forEach(s => doc.pipe(s));

// ── 폰트 (한글)
const fontPath  = 'C:/Windows/Fonts/malgun.ttf';
const boldPath  = 'C:/Windows/Fonts/malgunbd.ttf';
const hasBold   = fs.existsSync(boldPath);
doc.registerFont('KR',      fontPath);
doc.registerFont('KR-Bold', hasBold ? boldPath : fontPath);

const W = doc.page.width - 110;

function h1(text) {
  doc.moveDown(0.7)
     .font('KR-Bold').fontSize(15).fillColor('#1a1a2e').text(text);
  doc.moveDown(0.2);
  doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor('#FC3C44').lineWidth(1.5).stroke();
  doc.moveDown(0.4);
}
function h2(text) {
  doc.moveDown(0.5).font('KR-Bold').fontSize(11.5).fillColor('#FC3C44').text(text);
  doc.moveDown(0.15);
}
function h3(text) {
  doc.moveDown(0.3).font('KR-Bold').fontSize(10).fillColor('#444').text(text);
  doc.moveDown(0.1);
}
function body(text, indent = 0) {
  doc.font('KR').fontSize(9.5).fillColor('#222')
     .text(text, { indent: indent * 10, lineGap: 2 });
}
function rule() {
  doc.moveDown(0.3);
  doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
  doc.moveDown(0.3);
}

// ═══════════ 표지 ═══════════
doc.font('KR-Bold').fontSize(30).fillColor('#FC3C44').text('K-pop English', { align: 'center' });
doc.moveDown(0.3);
doc.font('KR-Bold').fontSize(22).fillColor('#1a1a2e').text('기능정의서', { align: 'center' });
doc.moveDown(0.5);
doc.font('KR').fontSize(11).fillColor('#888').text('작성일: 2026-03-27  |  ver 1.2', { align: 'center' });
doc.moveDown(2);
doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor('#FC3C44').lineWidth(2).stroke();
doc.moveDown(2);

// ═══════════ 1. 개요 ═══════════
h1('1. 프로젝트 개요');
const overview = [
  ['앱명',    'K-pop English (K-pop 영어 학습 앱)'],
  ['플랫폼',  'React Native (Expo SDK 55) → Web Only (react-native-web)'],
  ['배포',    'Firebase Hosting  https://k-pop-e9f48.web.app'],
  ['인증',    'Firebase Auth (Google 로그인 — signInWithRedirect)'],
  ['DB',      'Firestore (로그인 시 실시간 동기화) / localStorage (비로그인)'],
  ['음원',    'iTunes 30초 미리보기 즉시 재생 + YouTube IFrame 전체 곡'],
];
overview.forEach(([k, v]) => {
  doc.font('KR-Bold').fontSize(9.5).fillColor('#555').text(`${k}: `, { continued: true })
     .font('KR').fillColor('#222').text(v, { lineGap: 3 });
});

// ═══════════ 2. 화면 구성 ═══════════
h1('2. 화면 구성 / 메뉴 구조');

h2('2-1. 루트 화면 라우팅 (App.tsx)');
["screen = 'home'    → HomeScreen (탭바 포함)",
 "screen = 'vocab'   → VocabListScreen (단어장 전체 목록)",
 "screen = 'album'   → AlbumDetailScreen (앨범 상세)",
 "screen = 'search'  → SearchScreen (음악 검색 + 플레이리스트 저장)"]
  .forEach(t => body('• ' + t, 1));

h2('2-2. 플레이어 오버레이 (PlayerScreen)');
body('• 항상 절대위치로 렌더링 (모든 화면 위)', 1);
body('• playerExpanded = true  → 풀스크린 슬라이드 업', 1);
body('• playerExpanded = false → 미니 플레이어 수축 (Animated.spring)', 1);

h2('2-3. 하단 탭바 (HomeScreen)');
["tab = 'home'     → 홈",
 "tab = 'library'  → 나의 보관함 (LibraryTab)",
 "tab = 'search'   → 검색 (SearchScreen)",
 "tab = 'quiz'     → 퀴즈 (QuizScreen)"]
  .forEach(t => body('• ' + t, 1));

h2('2-4. HomeScreen 서브 페이지');
["showRecent = true         → 최근 재생 전체 목록 (RecentScreen)",
 "showLibPage = 'liked'     → 즐겨찾기 전체 목록 (LibraryGridPage)",
 "showLibPage = 'playlist'  → 플레이리스트 전체 목록",
 "showLibrary = true        → 나의 보관함 탭 (LibraryTab)"]
  .forEach(t => body('• ' + t, 1));

// ═══════════ 3. 각 화면 상세 ═══════════
h1('3. 각 화면 상세 기능');

h2('3-1. 홈 화면');
h3('상단');
body('• Google 로그인 배너 (비로그인) / 사용자 이름 + 실시간 동기화 표시 (로그인)', 1);
body('• 헤더: "K-POP ENGLISH / POP ENGLISH" + 단어장 버튼', 1);
body('• 검색바 터치 → SearchScreen', 1);

h3('나의 보관함 섹션');
body('• 즐겨찾기 카드 + 플레이리스트 카드 — 가로 스와이프 (snapToInterval)', 1);
body('• 즐겨찾기 카드 (고정 너비 270px)', 1);
body('  - 배경: 최신 1~4곡 앨범아트 분할, 없으면 gradient', 2);
body('  - "★ 즐겨찾기 / N곡"  →  터치: showLibPage = \'liked\'', 2);
body('• 플레이리스트 카드 (가로 동적 — 앨범 수에 따라 자동 조절)', 1);
body('  - 이미지 72×72px 고정, 2행×최대 5열 = 최대 10앨범', 2);
body('  - 배치 순서: 최신순, 열 단위 (위1→아래2→위3→아래4...)', 2);
body('  - 앨범 수별 열 수: 1~2개=1열 / 3~4=2열 / 5~6=3열 / 7~8=4열 / 9~10=5열', 2);
body('  - 카드 너비 = 열수 × 72 + 간격 + 패딩 (자동 계산)', 2);
body('  - 상단: "N앨범 · N곡"  →  터치: showLibPage = \'playlist\'', 2);

h3('최근 재생한 음악 (기록 없으면 숨김)');
body('• 수평 스크롤 / 섹션 타이틀 터치 → RecentScreen', 1);

h3('추천 앨범 · 전체 앨범');
body('• iTunes 인기 앨범 / 카드 터치 → AlbumDetailScreen', 1);
body('• "전체 보기" → AllAlbumsScreen', 1);

h2('3-2. 나의 보관함 탭 (LibraryTab)');
body('• 플레이리스트: AlbumDropdownList (앨범별 그룹 드롭다운)', 1);
body('  - 1곡 앨범: 앨범아트 + 곡명 + 재생시간 플랫 행', 2);
body('  - 2곡 이상: 헤더 탭 → 펼침/접힘', 2);
body('• 편집 버튼 → 곡별 X 삭제', 1);
body('• Firestore 변경 시 kpop_playlist_synced 이벤트 → 자동 갱신', 1);
body('• 즐겨찾기: 별 표시 곡 목록', 1);

h2('3-3. 검색 화면 (SearchScreen)');
h3('검색 방식');
body('• iTunes KR (country=KR&lang=ko_KR) + US 순차 조회 → 중복 제거 합산', 1);
body('• 결과 없으면 lrclib.net 폴백 / lrclib 필터 제거 (OST 검색 정상화)', 1);

h3('검색 결과');
body('• 앨범별 그룹화 — 헤더 + 곡 목록 + 앨범 일괄 추가 버튼', 1);
body('• 곡별: 앨범아트 / 곡명 / 아티스트 / 재생시간 / ▶ 재생 / + 저장', 1);

h3('플레이리스트 저장');
body('• + 버튼 → YouTube 검색 + 가사 캐시 → addToPlaylist()', 1);
body('• 이미 저장 시 + → X, 재터치 시 삭제', 1);
body('• Firestore 자동 동기화 (setFirestorePlaylistSaver 패턴)', 1);

h2('3-4. 플레이어 (PlayerScreen)');
h3('재생 모드');
body('• iTunes 미리보기 즉시 재생 (audioPlayer) → YouTube 전환 (playerModeRef)', 1);

h3('일반 플레이어 UI');
body('• 앨범아트 scale 애니메이션 (재생 1.0 / 정지 0.88)', 1);
body('• 진행바 scrubbing / 셔플 / 이전·다음 / 반복(off/one/all)', 1);
body('• 볼륨 슬라이더: ytSetVolume + audioSetVolume 동시 적용', 1);
body('  - localStorage \'kpop_volume\' 저장, 재생 시 자동 복원', 2);

h3('가사 모드');
body('• 가사 전체화면 fade+slide 전환', 1);
body('• 현재 라인 단어별 하이라이트 / 자동 스크롤 (ScrollView 실제 높이 측정 → 중앙 정렬)', 1);
body('• 한 번 탭: 싱크 오프셋 조정 / 두 번 탭: 번역 카드', 1);
body('• 번역 카드: lyricsView 레벨 렌더링 (overflow:hidden 영향 없음)', 1);
body('  - 원문 + 한국어 번역 + 영단어 칩 → VocabCard → 단어장 저장', 2);
body('• 하단: compact 컨트롤 (진행바 + 재생)', 1);

h2('3-5. 단어장 / 퀴즈 / 앨범');
body('• VocabListScreen: Firestore users/{uid}/data/vocab', 1);
body('• QuizScreen: 저장 단어 기반 4지선다', 1);
body('• AlbumDetailScreen: 전체/랜덤 재생', 1);

// ═══════════ 4. 데이터 동기화 ═══════════
h1('4. 데이터 저장 / 동기화');

h2('4-1. 저장 항목');
const dataItems = [
  ['즐겨찾기',    'localStorage',          'users/{uid}.likedIds (onSnapshot)'],
  ['단어장',      'localStorage',          'users/{uid}/data/vocab (onSnapshot)'],
  ['최근 재생',   'localStorage',          'users/{uid}/data/recent (최대 20곡)'],
  ['플레이리스트','localStorage',          'users/{uid}/data/playlist'],
  ['YouTube 캐시','localStorage (7일 TTL)','없음 (기기별)'],
  ['가사 캐시',   'localStorage',          '없음'],
];
dataItems.forEach(([item, offline, online]) => {
  doc.moveDown(0.1);
  doc.font('KR-Bold').fontSize(9.5).fillColor('#333')
     .text(`${item}`, 65, doc.y, { continued: true, width: 85 });
  doc.font('KR').fontSize(9.5).fillColor('#666')
     .text(`비로그인: ${offline}`, { continued: true, width: 175 });
  doc.font('KR').fillColor('#222')
     .text(`로그인: ${online}`, { lineGap: 1 });
});

h2('4-2. 첫 로그인 데이터 보호');
body('• Firestore 비어 있으면 → localStorage 데이터를 Firestore에 업로드', 1);
body('• Firestore에 데이터 있으면 → Firestore로 덮어쓰기 (실시간 동기화)', 1);

// ═══════════ 5. 재생 흐름 ═══════════
h1('5. 음악 검색 / 재생 흐름');

h2('5-1. 검색');
body('iTunes KR → iTunes US → 중복 제거 → 앨범 그룹화 → 결과 표시', 1);
body('결과 0건 → lrclib.net 폴백', 1);

h2('5-2. playTrack() 흐름');
['1. playerModeRef = \'audio\'',
 '2. audioLoadAndPlay(previewUrl)  — 즉시 재생, 저장 볼륨 자동 적용',
 '3. searchYouTube()  — localStorage 캐시 → YouTube API → Invidious 폴백',
 '4. videoId 확보 시 → ytLoadVideo(videoId)',
 '5. YT_STATE.PLAYING → ytUnMute() + audioPause()']
  .forEach(t => body(t, 1));

h2('5-3. 볼륨');
body('• 슬라이더 변경 → ytSetVolume(v) + audioSetVolume(v) 동시 호출', 1);
body('• audioLoadAndPlay() 호출 시 localStorage \'kpop_volume\' 자동 적용', 1);

// ═══════════ 6. 플레이리스트 저장 ═══════════
h1('6. 플레이리스트 저장 흐름');
['1. 검색 결과에서 + 버튼 탭',
 '2. YouTube 검색 (캐시 → API) — videoId 확보',
 '3. 가사 검색 (lrclib.net) → localStorage 캐시',
 '4. addToPlaylist(track, videoId)',
 '   → localStorage \'kpop_my_playlist\' 저장',
 '   → _firestoreSaver?.(items) — 로그인 시 Firestore 자동 동기화',
 '5. 아이콘 + → X (재터치 시 삭제)']
  .forEach(t => body(t, 1));

doc.moveDown(0.4);
h2('보관함 표시');
body('• LibraryTab: AlbumDropdownList (앨범별 드롭다운, 편집/삭제)', 1);
body('• 홈 카드: 2행 × 최대 5열, 최신순 열 단위 배치, 가로 동적 (최대 10앨범)', 1);

// ═══════════ 변경 이력 ═══════════
doc.addPage();
doc.font('KR-Bold').fontSize(13).fillColor('#FC3C44').text('변경 이력');
doc.moveDown(0.3);
rule();
const history = [
  ['2026-03-27', 'v1.0  초기 기능정의서 작성'],
  ['',           '크로스 디바이스 실시간 동기화 (Firestore onSnapshot)'],
  ['',           '첫 로그인 localStorage → Firestore 자동 업로드'],
  ['',           '볼륨 제어: audioPlayer + ytPlayer 동시 적용'],
  ['',           '가사 번역 카드: lyricsView 레벨 렌더링 (위치 수정)'],
  ['',           '가사 자동 스크롤: 현재 라인 중앙 정렬'],
  ['',           'v1.1  플레이리스트 카드 5열×2행 (최대 10앨범, 가로 auto)'],
  ['',           'v1.2  플레이리스트 카드 열 단위 배치 (최신순 위→아래→옆)'],
  ['',           '      앨범 수에 따라 카드 가로 자동 조절 (1~5열 동적)'],
];
history.forEach(([date, desc]) => {
  doc.font('KR-Bold').fontSize(9).fillColor('#999')
     .text(date || '', 55, doc.y, { continued: true, width: 90 });
  doc.font('KR').fontSize(9).fillColor('#333')
     .text(desc, { lineGap: 4 });
});

doc.end();

Promise.all(streams.map(s => new Promise(r => s.on('finish', r)))).then(() => {
  console.log('✓ 프로젝트:', projectPdf);
  console.log('✓ 데스크탑:', desktopPdf);
});
