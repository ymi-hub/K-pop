import { Track } from '../types';

// BTS 공식 앨범/싱글 목록 (로그인 없이 즉시 표시)
// albumArt는 YouTube 검색 후 썸네일로 업데이트됨
const BTS_PLACEHOLDER_ART =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bts_2019.png/440px-Bts_2019.png';

// 각 앨범별 커버 이미지 — Apple iTunes CDN (CORS 지원, 고해상도 600×600)
const ALBUM_COVERS: Record<string, string> = {
  'Dynamite':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/ff/f0/c1/fff0c13f-20a9-aa27-db6b-87cc059db07e/195497762934_Cover.jpg/600x600bb.jpg',
  'Butter':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/2d/04/35/2d0435be-c356-0e6c-5e02-bdbb6e2b08a8/192641894909_Cover.jpg/600x600bb.jpg',
  'BE':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/22/f3/8f/22f38fb9-1690-326a-d891-7aa946c2b06f/195497623273_Cover.jpg/600x600bb.jpg',
  'Map of the Soul: 7':
    'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/89/a4/81/89a481e5-2784-70d6-8404-3642871ca493/20UMGIM44782.rgb.jpg/600x600bb.jpg',
  'Map of the Soul: Persona':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/bd/68/9b/bd689bf2-ef25-4973-7ecd-7eb4965019c5/195081034713_Cover.jpg/600x600bb.jpg',
  'Love Yourself: Answer':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/ff/00/2c/ff002c29-6da9-1a26-16b3-282a73180366/192562871591_Cover.jpg/600x600bb.jpg',
  'Love Yourself: Tear':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/02/c5/18/02c518f5-ac06-3321-622e-08d9429fd968/192562556672_Cover.jpg/600x600bb.jpg',
  'Love Yourself: Her':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/34/a5/93/34a59372-3ebd-ae5f-269d-4c9506864d3f/8804775083280_Cover.jpg/600x600bb.jpg',
  'You Never Walk Alone':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/ce/fb/eb/cefbebd4-d53b-8d6c-33cf-2ee55408bd79/8804775077494_Cover.jpg/600x600bb.jpg',
  'WINGS':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/71/43/02/714302d0-a9d6-5d03-4967-c3c2c23df962/8804775073618_Cover.jpg/600x600bb.jpg',
  'Young Forever':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4c/97/6f/4c976f5c-5196-1221-8517-ddfcb0ba514c/8804775070341_Cover.jpg/600x600bb.jpg',
  'The Most Beautiful Moment in Life Pt.2':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b4/f5/5c/b4f55caf-7a93-4da5-cfc2-eec84cf68215/8804775062179_Cover.jpg/600x600bb.jpg',
  'The Most Beautiful Moment in Life Pt.1':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b4/f5/5c/b4f55caf-7a93-4da5-cfc2-eec84cf68215/8804775062045_Cover.jpg/600x600bb.jpg',
  'Dark & Wild':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f2/39/97/f2399713-b036-7ef2-fb4f-8c1454569c66/8804775056895_Cover.jpg/600x600bb.jpg',
  'Skool Luv Affair':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/67/e0/2a/67e02a62-8475-f54d-2876-92bd1c000ea0/8804775053979_Cover.jpg/600x600bb.jpg',
  'O!RUL8,2?':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/44/59/00/445900b6-e048-4e4a-8d0f-9d39fdfe857b/8804775051135_Cover.jpg/600x600bb.jpg',
  '2 Cool 4 Skool':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/71/b9/94/71b99453-1b0f-49c8-31ec-ebdb677bcd8d/8804775049590_Cover.jpg/600x600bb.jpg',
  'Proof':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/ff/f0/c1/fff0c13f-20a9-aa27-db6b-87cc059db07e/195497762934_Cover.jpg/600x600bb.jpg',
  'Hope World':
    'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/14/62/23/14622341-da3e-13e8-cfbf-7994aea6b8ed/192562244661_Cover.jpg/600x600bb.jpg',
  'j-hope Solo':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/56/15/80/5615807b-df17-377b-68d2-323460f3797c/194491382438_Cover.jpg/600x600bb.jpg',
  'Itaewon Class OST':
    'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/81/08/bc/8108bc35-6a54-3058-b980-255d78e50c53/mzi.gwbfvmmk.jpg/600x600bb.jpg',
  'Christmas Love':
    'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/a0/bd/ff/a0bdff4d-a57f-ab16-986e-4191b7b1b830/mzi.hvikmhfq.jpg/600x600bb.jpg',
};

type SongDef = {
  name: string;
  album: string;
  durationMs: number;
  artists?: string[];
};

const SONGS: SongDef[] = [
  // ── 디지털 싱글 ──────────────────────────────────────
  { name: 'Dynamite',                 album: 'Dynamite',                               durationMs: 199000 },
  { name: 'Butter',                   album: 'Butter',                                 durationMs: 164000 },
  { name: 'Permission to Dance',      album: 'Butter',                                 durationMs: 187000 },
  // ── BE (2020) ────────────────────────────────────────
  { name: 'Life Goes On',             album: 'BE',                                     durationMs: 207000 },
  { name: 'Fly To My Room',           album: 'BE',                                     durationMs: 213000 },
  { name: 'Blue & Grey',              album: 'BE',                                     durationMs: 254000 },
  { name: 'Telepathy',                album: 'BE',                                     durationMs: 198000 },
  { name: 'Dis-ease',                 album: 'BE',                                     durationMs: 228000 },
  { name: 'Stay',                     album: 'BE',                                     durationMs: 196000 },
  // ── Map of the Soul: 7 (2020) ────────────────────────
  { name: 'ON',                       album: 'Map of the Soul: 7',                     durationMs: 229000 },
  { name: 'Black Swan',               album: 'Map of the Soul: 7',                     durationMs: 219000 },
  { name: 'Filter',                   album: 'Map of the Soul: 7', artists: ['Jimin'], durationMs: 200000 },
  { name: 'Inner Child',              album: 'Map of the Soul: 7', artists: ['V'],     durationMs: 231000 },
  { name: 'My Time',                  album: 'Map of the Soul: 7', artists: ['Jung Kook'], durationMs: 213000 },
  { name: 'Shadow',                   album: 'Map of the Soul: 7', artists: ['SUGA'],  durationMs: 234000 },
  { name: 'Interlude: Shadow',        album: 'Map of the Soul: 7', artists: ['SUGA'],  durationMs: 88000  },
  { name: 'Ego',                      album: 'Map of the Soul: 7', artists: ['j-hope'],durationMs: 187000 },
  // ── Map of the Soul: Persona (2019) ──────────────────
  { name: 'Boy With Luv',             album: 'Map of the Soul: Persona',               durationMs: 229000 },
  { name: 'Make It Right',            album: 'Map of the Soul: Persona',               durationMs: 229000 },
  { name: 'HOME',                     album: 'Map of the Soul: Persona', artists: ['RM'], durationMs: 211000 },
  { name: 'Mikrokosmos',              album: 'Map of the Soul: Persona',               durationMs: 228000 },
  { name: 'Dionysus',                 album: 'Map of the Soul: Persona',               durationMs: 240000 },
  // ── Love Yourself: Answer (2018) ────────────────────
  { name: 'IDOL',                     album: 'Love Yourself: Answer',                  durationMs: 233000 },
  { name: 'Euphoria',                 album: 'Love Yourself: Answer', artists: ['Jung Kook'], durationMs: 259000 },
  { name: 'Trivia 承: Love',           album: 'Love Yourself: Answer', artists: ['RM'], durationMs: 224000 },
  { name: 'Trivia 起: Seesaw',         album: 'Love Yourself: Answer', artists: ['SUGA'], durationMs: 245000 },
  { name: 'Trivia 轉: Just Dance',     album: 'Love Yourself: Answer', artists: ['j-hope'], durationMs: 196000 },
  { name: 'Epiphany',                  album: 'Love Yourself: Answer', artists: ['Jin'], durationMs: 269000 },
  // ── Love Yourself: Tear (2018) ──────────────────────
  { name: 'FAKE LOVE',                album: 'Love Yourself: Tear',                    durationMs: 240000 },
  { name: 'The Truth Untold',         album: 'Love Yourself: Tear',                    durationMs: 250000 },
  { name: 'Singularity',              album: 'Love Yourself: Tear', artists: ['V'],    durationMs: 218000 },
  { name: 'Anpanman',                 album: 'Love Yourself: Tear',                    durationMs: 225000 },
  { name: 'Magic Shop',               album: 'Love Yourself: Tear',                    durationMs: 254000 },
  // ── Love Yourself: Her (2017) ───────────────────────
  { name: 'DNA',                      album: 'Love Yourself: Her',                     durationMs: 249000 },
  { name: 'Best of Me',               album: 'Love Yourself: Her',                     durationMs: 196000 },
  { name: 'Go Go',                    album: 'Love Yourself: Her',                     durationMs: 218000 },
  { name: 'MIC Drop',                 album: 'Love Yourself: Her',                     durationMs: 213000 },
  // ── You Never Walk Alone (2017) ─────────────────────
  { name: 'Spring Day',               album: 'You Never Walk Alone',                   durationMs: 273000 },
  { name: 'Not Today',                album: 'You Never Walk Alone',                   durationMs: 263000 },
  // ── WINGS (2016) ────────────────────────────────────
  { name: 'Blood Sweat & Tears',      album: 'WINGS',                                  durationMs: 235000 },
  { name: 'Begin',                    album: 'WINGS', artists: ['Jung Kook'],           durationMs: 210000 },
  { name: 'Lie',                      album: 'WINGS', artists: ['Jimin'],              durationMs: 218000 },
  { name: 'Stigma',                   album: 'WINGS', artists: ['V'],                  durationMs: 215000 },
  { name: 'First Love',               album: 'WINGS', artists: ['SUGA'],               durationMs: 262000 },
  { name: 'Reflection',               album: 'WINGS', artists: ['RM'],                 durationMs: 211000 },
  { name: 'MAMA',                     album: 'WINGS', artists: ['j-hope'],             durationMs: 211000 },
  { name: 'Awake',                    album: 'WINGS', artists: ['Jin'],                durationMs: 233000 },
  // ── The Most Beautiful Moment in Life: Young Forever (2016) ──
  { name: 'Fire',                     album: 'Young Forever',                          durationMs: 208000 },
  { name: 'Save Me',                  album: 'Young Forever',                          durationMs: 222000 },
  { name: 'Epilogue: Young Forever',  album: 'Young Forever',                          durationMs: 262000 },
  // ── Pt. 2 (2015) ────────────────────────────────────
  { name: 'Run',                      album: 'The Most Beautiful Moment in Life Pt.2', durationMs: 227000 },
  { name: 'Butterfly',                album: 'The Most Beautiful Moment in Life Pt.2', durationMs: 254000 },
  { name: 'Whalien 52',               album: 'The Most Beautiful Moment in Life Pt.2', durationMs: 240000 },
  // ── Pt. 1 (2015) ────────────────────────────────────
  { name: 'I Need U',                 album: 'The Most Beautiful Moment in Life Pt.1', durationMs: 237000 },
  { name: 'Dope',                     album: 'The Most Beautiful Moment in Life Pt.1', durationMs: 222000 },
  { name: 'Boyz with Fun',            album: 'The Most Beautiful Moment in Life Pt.1', durationMs: 218000 },
  // ── Dark & Wild (2014) ──────────────────────────────
  { name: 'Danger',                   album: 'Dark & Wild',                            durationMs: 232000 },
  { name: 'War of Hormone',           album: 'Dark & Wild',                            durationMs: 196000 },
  { name: 'Hip Hop Lover',            album: 'Dark & Wild',                            durationMs: 220000 },
  // ── Skool Luv Affair (2014) ─────────────────────────
  { name: 'Boy In Luv',               album: 'Skool Luv Affair',                       durationMs: 232000 },
  { name: 'Just One Day',             album: 'Skool Luv Affair',                       durationMs: 249000 },
  // ── O!RUL8,2? (2013) ────────────────────────────────
  { name: 'N.O',                      album: 'O!RUL8,2?',                              durationMs: 242000 },
  { name: 'We Are Bulletproof Pt.2',  album: 'O!RUL8,2?',                              durationMs: 217000 },
  // ── 2 Cool 4 Skool (2013) ───────────────────────────
  { name: 'No More Dream',            album: '2 Cool 4 Skool',                         durationMs: 239000 },
  // ── Proof (2022) ────────────────────────────────────
  { name: 'Yet To Come',              album: 'Proof',                                  durationMs: 213000 },
  { name: 'Run BTS',                  album: 'Proof',                                  durationMs: 185000 },
  { name: 'For Youth',                album: 'Proof',                                  durationMs: 278000 },
  // ── 솔로/컬래버 ──────────────────────────────────────
  { name: 'Chicken Noodle Soup',      album: 'j-hope Solo', artists: ['j-hope'],       durationMs: 208000 },
  { name: 'Daydream',                 album: 'Hope World',  artists: ['j-hope'],       durationMs: 201000 },
  { name: 'Sweet Night',              album: 'Itaewon Class OST', artists: ['V'],      durationMs: 247000 },
  { name: 'Christmas Love',           album: 'Christmas Love', artists: ['Jin'],       durationMs: 209000 },
];

// 메모리 캐시: 곡 ID → YouTube videoId + 썸네일
export const ytCache = new Map<string, { videoId: string; thumbnail: string }>();

export function getBTSTracks(): Track[] {
  return SONGS.map((s, i) => ({
    id: `bts-${i}`,
    name: s.name,
    artists: s.artists ?? ['BTS'],
    album: s.album,
    albumArt: ALBUM_COVERS[s.album] || BTS_PLACEHOLDER_ART,
    durationMs: s.durationMs,
    previewUrl: null,
    spotifyUri: '',
  }));
}
