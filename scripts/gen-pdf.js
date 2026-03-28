// K-pop English 기능정의서 PDF 생성
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: { Title: 'K-pop English 기능정의서', Author: 'K-pop English' },
});

const projectPdf = path.join(__dirname, '..', 'K-pop 기능정의서.pdf');
const desktopPdf = 'C:/Users/webji/OneDrive/바탕 화면/K-pop 기능정의서.pdf';
const streams = [fs.createWriteStream(projectPdf), fs.createWriteStream(desktopPdf)];
streams.forEach(s => doc.pipe(s));

// ── 폰트
doc.registerFont('KR',      'C:/Windows/Fonts/malgun.ttf');
doc.registerFont('KR-Bold', fs.existsSync('C:/Windows/Fonts/malgunbd.ttf')
  ? 'C:/Windows/Fonts/malgunbd.ttf' : 'C:/Windows/Fonts/malgun.ttf');

const PW = doc.page.width - 100; // 사용 가능 너비
const ML = 50; // 왼쪽 여백

// ── 헬퍼
const line = (color = '#FC3C44', w = 1.5) => {
  doc.moveTo(ML, doc.y).lineTo(ML + PW, doc.y).strokeColor(color).lineWidth(w).stroke();
};
const vspace = (n = 0.4) => doc.moveDown(n);

function pageTitle(title) {
  doc.font('KR-Bold').fontSize(13).fillColor('#FC3C44').text(title, ML);
  vspace(0.2); line(); vspace(0.35);
}
function section(text) {
  vspace(0.5);
  doc.font('KR-Bold').fontSize(11).fillColor('#1a1a2e').text(text, ML);
  vspace(0.15);
}
function sub(text) {
  vspace(0.2);
  doc.font('KR-Bold').fontSize(9.5).fillColor('#FC3C44').text(text, ML);
  vspace(0.1);
}
function body(text, indent = 0) {
  doc.font('KR').fontSize(9.2).fillColor('#222')
     .text(text, ML + indent * 12, doc.y, { lineGap: 2.5 });
}
function kv(k, v) {
  doc.font('KR-Bold').fontSize(9.2).fillColor('#555')
     .text(k + ': ', ML, doc.y, { continued: true })
     .font('KR').fillColor('#222').text(v, { lineGap: 3 });
}

// ════════════════════════════════════════════
//  표지
// ════════════════════════════════════════════
doc.font('KR-Bold').fontSize(32).fillColor('#FC3C44')
   .text('K-pop English', ML, 180, { align: 'center', width: PW });
vspace(0.4);
doc.font('KR-Bold').fontSize(22).fillColor('#1a1a2e')
   .text('기능정의서', ML, doc.y, { align: 'center', width: PW });
vspace(0.5);
doc.font('KR').fontSize(10).fillColor('#999')
   .text('ver 1.3  |  2026-03-27', ML, doc.y, { align: 'center', width: PW });
vspace(2.5);
line('#FC3C44', 2);
vspace(0.5);
doc.font('KR').fontSize(9).fillColor('#888')
   .text('React Native (Expo SDK 55)  ·  Web Only  ·  Firebase Hosting', ML, doc.y, { align: 'center', width: PW });

// ════════════════════════════════════════════
//  1. 메뉴 구조도
// ════════════════════════════════════════════
doc.addPage();
pageTitle('1. 메뉴 구조도');

// ── 구조도 박스 그리기
const BOX = { r: 6 };
function drawBox(x, y, w, h, fillColor, strokeColor) {
  doc.roundedRect(x, y, w, h, BOX.r)
     .fillAndStroke(fillColor, strokeColor);
}
function boxLabel(x, y, w, h, text, fontSize = 8.5, color = '#fff', bold = false) {
  doc.font(bold ? 'KR-Bold' : 'KR').fontSize(fontSize).fillColor(color)
     .text(text, x + 2, y + h / 2 - fontSize * 0.7, { width: w - 4, align: 'center' });
}
function arrow(x1, y1, x2, y2) {
  doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor('#aaa').lineWidth(1).stroke();
  // 화살촉
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a = 6;
  doc.moveTo(x2, y2)
     .lineTo(x2 - a * Math.cos(angle - 0.4), y2 - a * Math.sin(angle - 0.4))
     .lineTo(x2 - a * Math.cos(angle + 0.4), y2 - a * Math.sin(angle + 0.4))
     .closePath().fillAndStroke('#aaa', '#aaa');
}
function vline(x, y1, y2) {
  doc.moveTo(x, y1).lineTo(x, y2).strokeColor('#ccc').lineWidth(0.8).stroke();
}
function hline(x1, x2, y) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#ccc').lineWidth(0.8).stroke();
}

const startY = doc.y;

// ── App (루트)
const appX = ML + PW / 2 - 50, appY = startY, appW = 100, appH = 28;
drawBox(appX, appY, appW, appH, '#FC3C44', '#d42a32');
boxLabel(appX, appY, appW, appH, 'K-pop English App', 8.5, '#fff', true);

// ── 2단계: 화면 4개
const scW = 90, scH = 26, scGap = 14;
const totalW = scW * 4 + scGap * 3;
const scStartX = ML + (PW - totalW) / 2;
const scY = appY + appH + 36;
const screens = [
  { label: '홈 화면\n(HomeScreen)', color: '#3b5bdb', x: scStartX },
  { label: '플레이어\n(PlayerScreen)', color: '#6741d9', x: scStartX + (scW + scGap) },
  { label: '검색\n(SearchScreen)', color: '#0c8599', x: scStartX + (scW + scGap) * 2 },
  { label: '단어장/퀴즈\n(VocabList/Quiz)', color: '#2f9e44', x: scStartX + (scW + scGap) * 3 },
];

// 연결선
const appCenterX = appX + appW / 2;
const appBottomY = appY + appH;
vline(appCenterX, appBottomY, appBottomY + 18);
hline(screens[0].x + scW / 2, screens[3].x + scW / 2, appBottomY + 18);
screens.forEach(sc => {
  vline(sc.x + scW / 2, appBottomY + 18, scY);
});

screens.forEach(sc => {
  drawBox(sc.x, scY, scW, scH * 1.8, sc.color, sc.color);
  boxLabel(sc.x, scY, scW, scH * 1.8, sc.label, 8, '#fff', true);
});

// ── 3단계: 하위 메뉴
const subY = scY + scH * 1.8 + 32;
const subW = 82, subH = 22;

// 홈 하위
const homeSubs = [
  { label: '나의 보관함\n카드 섹션' },
  { label: '즐겨찾기\n전체 목록' },
  { label: '플레이리스트\n전체 목록' },
  { label: '최근 재생\n전체 목록' },
  { label: '추천/전체\n앨범' },
];
const homeSubW = 68, homeSubH = 30;
const homeSubTotal = homeSubW * homeSubs.length + 8 * (homeSubs.length - 1);
const homeSubStartX = screens[0].x + scW / 2 - homeSubTotal / 2;
const homeParentX = screens[0].x + scW / 2;
vline(homeParentX, scY + scH * 1.8, subY - 6);
hline(homeSubStartX + homeSubW / 2, homeSubStartX + homeSubW * homeSubs.length + 8 * (homeSubs.length - 1) - homeSubW / 2, subY - 6);
homeSubs.forEach((s, i) => {
  const sx = homeSubStartX + i * (homeSubW + 8);
  vline(sx + homeSubW / 2, subY - 6, subY);
  drawBox(sx, subY, homeSubW, homeSubH, '#e7f5ff', '#74c0fc');
  boxLabel(sx, subY, homeSubW, homeSubH, s.label, 7.5, '#1971c2');
});

// 플레이어 하위
const playerSubs = ['일반 모드', '가사 모드', '미니 플레이어'];
const psW = 72, psH = 22;
const psTotal = psW * 3 + 8 * 2;
const psStartX = screens[1].x + scW / 2 - psTotal / 2;
const psParentX = screens[1].x + scW / 2;
vline(psParentX, scY + scH * 1.8, subY - 6);
hline(psStartX + psW / 2, psStartX + psW * 3 + 8 * 2 - psW / 2, subY - 6);
playerSubs.forEach((s, i) => {
  const sx = psStartX + i * (psW + 8);
  vline(sx + psW / 2, subY - 6, subY);
  drawBox(sx, subY, psW, psH, '#f3d9fa', '#cc5de8');
  boxLabel(sx, subY, psW, psH, s, 7.5, '#862e9c');
});

// 검색 하위
const searchSubs = ['결과 목록\n(앨범 그룹)', '플레이리스트\n저장'];
const ssW = 78, ssH = 30;
const ssTotal = ssW * 2 + 10;
const ssStartX = screens[2].x + scW / 2 - ssTotal / 2;
const ssParentX = screens[2].x + scW / 2;
vline(ssParentX, scY + scH * 1.8, subY - 6);
hline(ssStartX + ssW / 2, ssStartX + ssW * 2 + 10 - ssW / 2, subY - 6);
searchSubs.forEach((s, i) => {
  const sx = ssStartX + i * (ssW + 10);
  vline(sx + ssW / 2, subY - 6, subY);
  drawBox(sx, subY, ssW, ssH, '#e6fcf5', '#38d9a9');
  boxLabel(sx, subY, ssW, ssH, s, 7.5, '#087f5b');
});

// 단어장 하위
const vocabSubs = ['단어 목록', '퀴즈\n(4지선다)'];
const vsW = 72, vsH = 30;
const vsTotal = vsW * 2 + 10;
const vsStartX = screens[3].x + scW / 2 - vsTotal / 2;
const vsParentX = screens[3].x + scW / 2;
vline(vsParentX, scY + scH * 1.8, subY - 6);
hline(vsStartX + vsW / 2, vsStartX + vsW * 2 + 10 - vsW / 2, subY - 6);
vocabSubs.forEach((s, i) => {
  const sx = vsStartX + i * (vsW + 10);
  vline(sx + vsW / 2, subY - 6, subY);
  drawBox(sx, subY, vsW, vsH, '#fff3bf', '#ffd43b');
  boxLabel(sx, subY, vsW, vsH, s, 7.5, '#795548');
});

// ── 하단 탭바 표시
const tabY = subY + homeSubH + 28;
doc.font('KR-Bold').fontSize(8).fillColor('#888')
   .text('[ 하단 탭바 ]', ML, tabY, { align: 'center', width: PW });
const tabs = ['홈', '나의 보관함', '검색', '퀴즈'];
const tabW = 62, tabH = 20, tabGap = 10;
const tabTotal = tabW * 4 + tabGap * 3;
const tabStartX = ML + (PW - tabTotal) / 2;
tabs.forEach((t, i) => {
  const tx = tabStartX + i * (tabW + tabGap);
  drawBox(tx, tabY + 14, tabW, tabH, '#f1f3f5', '#dee2e6');
  boxLabel(tx, tabY + 14, tabW, tabH, t, 8.5, '#495057', true);
});

// ── 범례
const legY = tabY + tabH + 32;
doc.font('KR-Bold').fontSize(8).fillColor('#888').text('범례', ML, legY);
vspace(0.15);
const legends = [
  { color: '#FC3C44', label: 'App 루트' },
  { color: '#3b5bdb', label: '홈 화면' },
  { color: '#6741d9', label: '플레이어' },
  { color: '#0c8599', label: '검색' },
  { color: '#2f9e44', label: '단어장/퀴즈' },
];
let lx = ML;
legends.forEach(l => {
  drawBox(lx, doc.y, 10, 10, l.color, l.color);
  doc.font('KR').fontSize(8).fillColor('#333')
     .text(l.label, lx + 13, doc.y - 1);
  lx += 80;
});

// ════════════════════════════════════════════
//  2. 화면별 상세 기능
// ════════════════════════════════════════════
doc.addPage();
pageTitle('2. 화면별 상세 기능');

section('2-1. 홈 화면 (HomeScreen)');

sub('상단 영역');
body('• Google 로그인 배너 (비로그인) / 사용자명 + 실시간 동기화 표시 (로그인)', 1);
body('• 헤더: "K-POP ENGLISH / POP ENGLISH" + 단어장 버튼 (AB 아이콘)', 1);
body('• 검색바 터치 → 검색 화면 이동', 1);

sub('나의 보관함 섹션');
body('• 즐겨찾기 카드 + 플레이리스트 카드 — 가로 스와이프 (snapToInterval)', 1);
body('• 즐겨찾기 카드 (고정 270px)', 1);
body('  - 배경: 최신 1~4곡 앨범아트 분할 / 없으면 보라색 gradient', 2);
body('  - 하단: "★ 즐겨찾기  N곡"  →  터치 시 즐겨찾기 전체 목록', 2);
body('• 플레이리스트 카드 (가로 동적)', 1);
body('  - 배치: 최신순, 열 단위 (위①→아래②→위③→아래④...)', 2);
body('  - 앨범 수별 열: 1~2개=1열 / 3~4=2열 / 5~6=3열 / 7~8=4열 / 9~10=5열', 2);
body('  - 이미지 72×72px 고정 / 최대 10앨범 / 카드 가로 자동 계산', 2);
body('  - 상단: "N앨범 · N곡"  →  터치 시 플레이리스트 전체 목록', 2);

sub('최근 재생한 음악 (기록 없으면 숨김)');
body('• 수평 스크롤 카드 / 섹션 타이틀 터치 → 전체 목록', 1);

sub('추천 앨범 · 전체 앨범');
body('• iTunes 인기 앨범 카드 / 터치 → 앨범 상세 (AlbumDetailScreen)', 1);
body('• "전체 보기" → AllAlbumsScreen', 1);

section('2-2. 플레이어 (PlayerScreen)');

sub('재생 모드 전환');
body('• 곡 선택 → iTunes 미리보기(30초) 즉시 재생', 1);
body('• 백그라운드에서 YouTube 검색 완료 시 전체 곡 자동 전환', 1);
body('• playerModeRef: \'audio\' | \'youtube\'', 1);

sub('일반 플레이어');
body('• 앨범아트 (재생 시 scale 1.0 / 정지 시 0.88 spring 애니메이션)', 1);
body('• 곡명 / 아티스트 / 즐겨찾기(별)', 1);
body('• 진행바 scrubbing / 셔플 / 이전·다음 / 반복 (off / 1곡 / 전체)', 1);
body('• 볼륨 슬라이더: ytSetVolume + audioSetVolume 동시 적용', 1);
body('  localStorage \'kpop_volume\' 저장 — 재생 시 자동 복원', 2);
body('• 하단 툴바: 가사보기 / 싱크 오프셋 −·0·+ / 대기열', 1);
body('• 아래로 스와이프 / 뒤로 버튼 → 미니 플레이어로 수축', 1);

sub('가사 모드');
body('• 가사 전체화면 (fade + slide 전환 애니메이션)', 1);
body('• 현재 라인 단어별 하이라이트 (지난/현재/미래 색상 구분)', 1);
body('• 자동 스크롤: ScrollView 실제 높이 측정 → 현재 라인 중앙 정렬', 1);
body('• 한 번 탭: 싱크 오프셋 보정 (currentMs − lineStartMs)', 1);
body('• 두 번 탭: 번역 카드 표시', 1);
body('  - 원문 + 한국어 번역 + 영단어 칩', 2);
body('  - 번역 카드: lyricsView 레벨 렌더링 (overflow:hidden 밖 → 항상 보임)', 2);
body('  - 단어 칩 탭 → VocabCard → 단어장 저장', 2);
body('• 하단: compact 컨트롤 (진행바 + 재생·정지)', 1);

section('2-3. 검색 화면 (SearchScreen)');

sub('검색 방식');
body('• iTunes KR (country=KR&lang=ko_KR) 조회 → iTunes US 폴백 → 중복 제거 합산', 1);
body('• 결과 없으면 lrclib.net 폴백 (lrclib 필터 제거 → OST 검색 정상화)', 1);
body('• 동일 곡명+아티스트 중복 제거 (baseTrackName 정규화)', 1);

sub('검색 결과');
body('• 앨범별 그룹화 (AlbumGroup) — 헤더 + 곡 목록', 1);
body('• 앨범 헤더 우측: 앨범 전체 일괄 추가 버튼', 1);
body('• 곡별: 앨범아트 / 곡명 / 아티스트 / 재생시간 / ▶ 재생 / + 저장', 1);

sub('플레이리스트 저장 흐름');
body('① + 버튼 탭', 1);
body('② YouTube 검색 (localStorage 캐시 7일 → API → Invidious 폴백)', 1);
body('③ 가사 검색 (lrclib.net) → localStorage 캐시 저장', 1);
body('④ addToPlaylist(track, videoId)', 1);
body('   → localStorage \'kpop_my_playlist\' 저장', 2);
body('   → Firestore 자동 동기화 (로그인 시, setFirestorePlaylistSaver 패턴)', 2);
body('⑤ 아이콘 + → X (재터치 시 삭제)', 1);

section('2-4. 나의 보관함 탭 (LibraryTab)');
body('• 플레이리스트: AlbumDropdownList (앨범별 그룹 드롭다운)', 1);
body('  - 1곡 앨범: 앨범아트 + 곡명 + 재생시간 플랫 행', 2);
body('  - 2곡 이상: 헤더 탭 → 펼침/접힘 (LayoutAnimation)', 2);
body('• 편집 버튼 → 곡별 X 삭제', 1);
body('• Firestore 변경 시 kpop_playlist_synced 이벤트 → 자동 갱신', 1);
body('• 즐겨찾기 섹션: 별 표시 곡 목록', 1);

section('2-5. 단어장 · 퀴즈 · 앨범');
body('• VocabListScreen: 저장 단어 목록 (Firestore users/{uid}/data/vocab)', 1);
body('• QuizScreen: 저장 단어 기반 4지선다', 1);
body('• AlbumDetailScreen: 앨범 전체 곡, 전체/랜덤 재생', 1);
body('• AllAlbumsScreen: 전체 앨범 목록', 1);

// ════════════════════════════════════════════
//  3. 데이터 구조 / 동기화
// ════════════════════════════════════════════
doc.addPage();
pageTitle('3. 데이터 구조 / 동기화');

section('3-1. 저장 항목 및 방식');

// 표
const tblX = ML, tblY = doc.y;
const cols = [90, 130, 180];
const tblW = cols.reduce((a, b) => a + b, 0);
const rowH = 20;
const headers = ['항목', '비로그인 (localStorage)', '로그인 (Firestore)'];
const rows = [
  ['즐겨찾기',     'kpop_liked_ids',             'users/{uid}.likedIds (onSnapshot)'],
  ['단어장',       'kpop_saved_words',            'users/{uid}/data/vocab (onSnapshot)'],
  ['최근 재생',    'kpop_recent_tracks',          'users/{uid}/data/recent (최대 20곡)'],
  ['플레이리스트', 'kpop_my_playlist',            'users/{uid}/data/playlist'],
  ['YouTube 캐시', 'kpop_yt_cache (7일 TTL)',     '없음 (기기별 캐시)'],
  ['가사 캐시',    'kpop_lyrics_{id}',            '없음'],
  ['볼륨',         'kpop_volume (0~100)',          '없음'],
];

// 헤더
drawBox(tblX, tblY, tblW, rowH, '#FC3C44', '#FC3C44');
let cx = tblX;
headers.forEach((h, i) => {
  boxLabel(cx, tblY, cols[i], rowH, h, 8.5, '#fff', true);
  cx += cols[i];
});
// 행
rows.forEach((row, ri) => {
  const ry = tblY + rowH * (ri + 1);
  const bg = ri % 2 === 0 ? '#f8f9fa' : '#ffffff';
  drawBox(tblX, ry, tblW, rowH, bg, '#dee2e6');
  let cx2 = tblX;
  row.forEach((cell, ci) => {
    doc.font(ci === 0 ? 'KR-Bold' : 'KR').fontSize(8).fillColor('#333')
       .text(cell, cx2 + 5, ry + rowH / 2 - 4, { width: cols[ci] - 10 });
    cx2 += cols[ci];
  });
});
doc.y = tblY + rowH * (rows.length + 1) + 8;

section('3-2. 첫 로그인 데이터 보호');
body('• Firestore 비어 있으면 → localStorage 데이터를 Firestore에 업로드 (유실 방지)', 1);
body('• Firestore에 데이터 있으면 → Firestore 기준으로 localStorage 덮어쓰기', 1);

section('3-3. 실시간 동기화 흐름');
body('① 로그인 시 onSnapshot 구독 시작 (즐겨찾기·단어장·최근재생·플레이리스트)', 1);
body('② 다른 기기에서 변경 → Firestore → onSnapshot 콜백 → 화면 갱신', 1);
body('③ kpop_playlist_synced 커스텀 이벤트로 각 컴포넌트에 갱신 알림', 1);
body('④ 로그아웃 시 모든 구독 해제', 1);

section('3-4. Firestore 스키마');
body('users/{uid}', 1);
body('  likedIds: string[]          // 즐겨찾기 트랙 ID 배열', 2);
body('  /data/vocab', 2);
body('    words: SavedWord[]        // 저장 단어 목록', 3);
body('  /data/recent', 2);
body('    tracks: Track[]           // 최근 재생 (최대 20곡)', 3);
body('  /data/playlist', 2);
body('    items: PlaylistItem[]     // 플레이리스트 전체', 3);

// ════════════════════════════════════════════
//  4. 재생 흐름
// ════════════════════════════════════════════
doc.addPage();
pageTitle('4. 음악 재생 흐름');

section('4-1. 검색 흐름');
// 플로우 박스
const flowY = doc.y;
const flowBoxes = [
  { label: '검색어 입력', color: '#e7f5ff', stroke: '#74c0fc', textColor: '#1971c2' },
  { label: 'iTunes KR API', color: '#e7f5ff', stroke: '#74c0fc', textColor: '#1971c2' },
  { label: 'iTunes US API\n(폴백)', color: '#e7f5ff', stroke: '#74c0fc', textColor: '#1971c2' },
  { label: '중복 제거\n통합', color: '#fff3bf', stroke: '#ffd43b', textColor: '#795548' },
  { label: '앨범 그룹화\n결과 표시', color: '#ebfbee', stroke: '#69db7c', textColor: '#2b8a3e' },
];
const fbW = 72, fbH = 32, fbGap = 18;
const fbTotal = fbW * flowBoxes.length + fbGap * (flowBoxes.length - 1);
let fbX = ML + (PW - fbTotal) / 2;
flowBoxes.forEach((fb, i) => {
  drawBox(fbX, flowY, fbW, fbH, fb.color, fb.stroke);
  boxLabel(fbX, flowY, fbW, fbH, fb.label, 8, fb.textColor, true);
  if (i < flowBoxes.length - 1) {
    arrow(fbX + fbW, flowY + fbH / 2, fbX + fbW + fbGap, flowY + fbH / 2);
  }
  fbX += fbW + fbGap;
});
doc.y = flowY + fbH + 12;
body('결과 0건 시 lrclib.net 폴백 조회', 1);

section('4-2. playTrack() 재생 흐름');
const playBoxes = [
  { label: 'playerModeRef\n= \'audio\'', color: '#ffe8cc', stroke: '#ffa94d', textColor: '#e67700' },
  { label: 'audioLoadAndPlay\n(미리보기 즉시)', color: '#ffe8cc', stroke: '#ffa94d', textColor: '#e67700' },
  { label: 'searchYouTube\n(캐시→API)', color: '#e7f5ff', stroke: '#74c0fc', textColor: '#1971c2' },
  { label: 'ytLoadVideo\n(전체 곡)', color: '#f3d9fa', stroke: '#cc5de8', textColor: '#862e9c' },
  { label: 'YT PLAYING\n→ audioPause', color: '#ebfbee', stroke: '#69db7c', textColor: '#2b8a3e' },
];
const pbY = doc.y;
let pbX = ML + (PW - fbTotal) / 2;
playBoxes.forEach((pb, i) => {
  drawBox(pbX, pbY, fbW, fbH, pb.color, pb.stroke);
  boxLabel(pbX, pbY, fbW, fbH, pb.label, 8, pb.textColor, true);
  if (i < playBoxes.length - 1) {
    arrow(pbX + fbW, pbY + fbH / 2, pbX + fbW + fbGap, pbY + fbH / 2);
  }
  pbX += fbW + fbGap;
});
doc.y = pbY + fbH + 12;
body('YouTube 실패 시 iTunes 미리보기 유지 (audioPause 호출 안 됨)', 1);

section('4-3. 볼륨 제어');
body('• 볼륨 슬라이더 변경 → ytSetVolume(v) + audioSetVolume(v) 동시 호출', 1);
body('• audioLoadAndPlay() 시 localStorage \'kpop_volume\' 자동 적용', 1);
body('• 범위: 0~100 / 기본값: 100', 1);

section('4-4. YouTube 캐시 전략');
body('• 키: kpop_yt_cache  /  TTL: 7일  /  저장: {videoId, thumbnail}', 1);
body('• 캐시 히트 시 API 호출 없음 (YouTube 할당량 절약)', 1);
body('• YouTube API 할당량 소진 시 Invidious 인스턴스 자동 폴백', 1);

// ════════════════════════════════════════════
//  5. 환경 설정
// ════════════════════════════════════════════
doc.addPage();
pageTitle('5. 환경 설정 / API 키');

section('5-1. 환경 변수 (.env)');
const envRows = [
  ['EXPO_PUBLIC_YOUTUBE_API_KEY',          'YouTube Data API v3 (10,000 units/일, 검색 100 units)'],
  ['EXPO_PUBLIC_FIREBASE_API_KEY',         'Firebase 프로젝트 인증'],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',     'Firebase Auth 도메인'],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID',      'Firebase 프로젝트 ID (k-pop-e9f48)'],
  ['EXPO_PUBLIC_FIREBASE_APP_ID',          'Firebase App ID'],
  ['EXPO_PUBLIC_SPOTIFY_CLIENT_ID',        'Spotify API (현재 미사용)'],
];
envRows.forEach(([k, v]) => {
  doc.font('KR-Bold').fontSize(8.5).fillColor('#1a1a2e')
     .text(k, ML + 10, doc.y, { lineGap: 1 });
  doc.font('KR').fontSize(8.5).fillColor('#555')
     .text('  → ' + v, ML + 10, doc.y, { lineGap: 5 });
});

section('5-2. 빌드 & 배포');
body('# 웹 빌드', 1);
body('npx expo export --platform web', 1);
vspace(0.2);
body('# Firebase 배포', 1);
body('firebase deploy --only hosting', 1);
vspace(0.2);
body('# 배포 URL: https://k-pop-e9f48.web.app', 1);
vspace(0.2);
body('# 기능정의서 PDF 재생성', 1);
body('node scripts/gen-pdf.js', 1);

section('5-3. 개발 서버');
body('npx expo start --web', 1);

section('5-4. 주요 파일');
const files = [
  ['App.tsx',                          '전체 상태 관리, 화면 라우팅, Firestore 동기화'],
  ['src/screens/HomeScreen.tsx',       '홈 화면, 나의 보관함, 최근 재생, 앨범 섹션'],
  ['src/screens/PlayerScreen.tsx',     '풀스크린 플레이어, 가사 모드, 미니 플레이어'],
  ['src/screens/SearchScreen.tsx',     '음악 검색, 플레이리스트 저장'],
  ['src/components/LyricsView.tsx',    '가사 표시, 번역, 단어 탭'],
  ['src/services/audioPlayer.ts',      'HTML <audio> 기반 재생기 (iTunes 미리보기)'],
  ['src/services/youtubePlayer.ts',    'YouTube IFrame API 래퍼'],
  ['src/services/syncService.ts',      'Firestore onSnapshot 구독/저장'],
  ['src/services/playlistStorage.ts',  'localStorage 플레이리스트 CRUD'],
  ['scripts/gen-pdf.js',               '기능정의서 PDF 생성 스크립트'],
];
const ftblY = doc.y;
const fcols = [170, 230];
const ftblW = fcols.reduce((a, b) => a + b, 0);
drawBox(ML, ftblY, ftblW, rowH, '#FC3C44', '#FC3C44');
boxLabel(ML, ftblY, fcols[0], rowH, '파일 경로', 8.5, '#fff', true);
boxLabel(ML + fcols[0], ftblY, fcols[1], rowH, '역할', 8.5, '#fff', true);
files.forEach(([fp, role], ri) => {
  const ry = ftblY + rowH * (ri + 1);
  drawBox(ML, ry, ftblW, rowH, ri % 2 === 0 ? '#f8f9fa' : '#fff', '#dee2e6');
  doc.font('KR-Bold').fontSize(7.8).fillColor('#1a1a2e')
     .text(fp, ML + 4, ry + rowH / 2 - 4, { width: fcols[0] - 8 });
  doc.font('KR').fontSize(7.8).fillColor('#333')
     .text(role, ML + fcols[0] + 4, ry + rowH / 2 - 4, { width: fcols[1] - 8 });
});
doc.y = ftblY + rowH * (files.length + 1) + 8;

// ════════════════════════════════════════════
//  6. 변경 이력
// ════════════════════════════════════════════
vspace(0.8);
pageTitle('6. 변경 이력');
const changeLog = [
  ['v1.0', '2026-03-25', '초기 버전: 검색·재생·가사·퀴즈·단어장'],
  ['v1.1', '2026-03-26', '크로스 디바이스 Firestore 실시간 동기화'],
  ['',     '',           '첫 로그인 localStorage → Firestore 자동 업로드'],
  ['',     '',           '볼륨: audioPlayer + ytPlayer 동시 제어'],
  ['',     '',           '가사 번역 카드 위치 수정 (lyricsView 레벨 렌더링)'],
  ['',     '',           '가사 자동 스크롤 현재 라인 중앙 정렬'],
  ['v1.2', '2026-03-27', '플레이리스트 카드: 5열×2행, 가로 full auto'],
  ['v1.3', '2026-03-27', '플레이리스트 카드: 열 단위 배치, 최신순 위→아래→위→아래'],
  ['',     '',           '앨범 수에 따라 1~5열 동적 조절 (최대 10앨범)'],
  ['',     '',           '기능정의서 메뉴 구조도 추가'],
];
const clY = doc.y;
const clCols = [38, 72, 0]; // 마지막은 나머지
const clRowH = 18;
drawBox(ML, clY, PW, clRowH, '#1a1a2e', '#1a1a2e');
['버전', '날짜', '변경 내용'].forEach((h, i) => {
  const cx2 = ML + clCols.slice(0, i).reduce((a, b) => a + b, 0);
  const cw = i < 2 ? clCols[i] : PW - clCols[0] - clCols[1];
  boxLabel(cx2, clY, cw, clRowH, h, 8.5, '#fff', true);
});
changeLog.forEach((row, ri) => {
  const ry = clY + clRowH * (ri + 1);
  drawBox(ML, ry, PW, clRowH, ri % 2 === 0 ? '#f8f9fa' : '#fff', '#dee2e6');
  [row[0], row[1], row[2]].forEach((cell, ci) => {
    const cx2 = ML + clCols.slice(0, ci).reduce((a, b) => a + b, 0);
    const cw = ci < 2 ? clCols[ci] : PW - clCols[0] - clCols[1];
    doc.font(ci === 0 ? 'KR-Bold' : 'KR').fontSize(8).fillColor(ci === 0 ? '#FC3C44' : '#333')
       .text(cell, cx2 + 4, ry + clRowH / 2 - 4, { width: cw - 8 });
  });
});

doc.end();

Promise.all(streams.map(s => new Promise(r => s.on('finish', r)))).then(() => {
  console.log('✓ 프로젝트:', projectPdf);
  console.log('✓ 데스크탑:', desktopPdf);
});
