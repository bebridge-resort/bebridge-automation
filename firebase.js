// ═══════════════════════════════════════════════════════════════
// 객실 이름 매핑 테이블
// 각 플랫폼마다 객실 이름이 다르기 때문에 통합 관리
// ═══════════════════════════════════════════════════════════════

const ROOMS = [
  // ─── 그랜드 풀빌라 ───────────────────────────────────────────
  {
    id: 'villa_1',
    standard: '그랜드풀빌라1동',
    naver: '그랜드풀빌라 1동',        // 네이버 캘린더 표시명
    yeogi: '그랜드풀빌라1동',         // 여기어때 캘린더 표시명
    ddnayo: '그랜드 풀빌라 1동',      // 떠나요 캘린더 표시명
    wings: 'grand poolvilla 1',       // 윙스 인벤토리 표시명
    homepage: { roomName: '그랜드 풀빌라 1동' },
  },
  {
    id: 'villa_2',
    standard: '그랜드풀빌라2동',
    naver: '그랜드풀빌라 2동',
    yeogi: '그랜드풀빌라2동',
    ddnayo: '그랜드 풀빌라 2동',
    wings: 'grand poolvilla 2',
    homepage: { roomName: '그랜드 풀빌라 2동' },
  },
  {
    id: 'villa_3',
    standard: '그랜드풀빌라3동',
    naver: '그랜드풀빌라 3동',
    yeogi: '그랜드풀빌라3동',
    ddnayo: '그랜드 풀빌라 3동',
    wings: 'grand poolvilla 3',
    homepage: { roomName: '그랜드 풀빌라 3동' },
  },
  {
    id: 'villa_4',
    standard: '그랜드풀빌라4동',
    naver: '그랜드풀빌라 4동',
    yeogi: '그랜드풀빌라4동',
    ddnayo: '그랜드 풀빌라 4동',
    wings: 'grand poolvilla 4',
    homepage: { roomName: '그랜드 풀빌라 4동' },
  },
  {
    id: 'villa_5',
    standard: '그랜드풀빌라5동',
    naver: '그랜드풀빌라 5동',
    yeogi: '그랜드풀빌라5동',
    ddnayo: '그랜드 풀빌라 5동',
    wings: 'grand poolvilla 5',
    homepage: { roomName: '그랜드 풀빌라 5동' },
  },
  {
    id: 'villa_6',
    standard: '그랜드풀빌라6동',
    naver: '그랜드풀빌라 6동',
    yeogi: '그랜드풀빌라6동',
    ddnayo: '그랜드 풀빌라 6동',
    wings: 'grand poolvilla 6',
    homepage: { roomName: '그랜드 풀빌라 6동' },
  },
  {
    id: 'villa_7',
    standard: '그랜드풀빌라7동',
    naver: '그랜드풀빌라 7동',
    yeogi: '그랜드풀빌라7동',
    ddnayo: '그랜드 풀빌라 7동',
    wings: 'grand poolvilla 7',
    homepage: { roomName: '그랜드 풀빌라 7동' },
  },

  // ─── 풀문스테이 ──────────────────────────────────────────────
  { id: 'moon_101', standard: '풀문스테이101호', naver: '풀문101', yeogi: '풀문스테이101호', ddnayo: '풀문101호(복층,마운틴뷰)', wings: 'pool moon 101', homepage: { roomName: '풀문스테이 101호' } },
  { id: 'moon_102', standard: '풀문스테이102호', naver: '풀문102', yeogi: '풀문스테이102호', ddnayo: '풀문102호(복층,마운틴뷰)', wings: 'pool moon 102', homepage: { roomName: '풀문스테이 102호' } },
  { id: 'moon_103', standard: '풀문스테이103호', naver: '풀문103', yeogi: '풀문스테이103호', ddnayo: '풀문103호(복층,마운틴뷰)', wings: 'pool moon 103', homepage: { roomName: '풀문스테이 103호' } },
  { id: 'moon_201', standard: '풀문스테이201호', naver: '풀문201', yeogi: '풀문스테이201호', ddnayo: '풀문201호(테라스,리버뷰)', wings: 'pool moon 201', homepage: { roomName: '풀문스테이 201호' } },
  { id: 'moon_202', standard: '풀문스테이202호', naver: '풀문202', yeogi: '풀문스테이202호', ddnayo: '풀문202호(테라스,리버뷰)', wings: 'pool moon 202', homepage: { roomName: '풀문스테이 202호' } },
  { id: 'moon_203', standard: '풀문스테이203호', naver: '풀문203', yeogi: '풀문스테이203호', ddnayo: '풀문203호(테라스,리버뷰)', wings: 'pool moon 203', homepage: { roomName: '풀문스테이 203호' } },
  { id: 'moon_204', standard: '풀문스테이204호', naver: '풀문204', yeogi: '풀문스테이204호', ddnayo: '풀문204호(테라스,리버뷰)', wings: 'pool moon 204', homepage: { roomName: '풀문스테이 204호' } },

  // ─── 카라반 ──────────────────────────────────────────────────
  { id: 'cara_1', standard: '카라반1호', naver: '카라반 1호', yeogi: '카라반1호', ddnayo: '카라반 1호(기준2/최대4인,성인추가)', wings: 'caravan 1', homepage: { roomName: '카라반 1호' } },
  { id: 'cara_2', standard: '카라반2호', naver: '카라반 2호', yeogi: '카라반2호', ddnayo: '카라반 2호(기준2/최대4인,성인추가)', wings: 'caravan 2', homepage: { roomName: '카라반 2호' } },
  { id: 'cara_3', standard: '카라반3호', naver: '카라반 3호', yeogi: '카라반3호', ddnayo: '카라반 3호(기준2/최대4인,성인추가)', wings: 'caravan 3', homepage: { roomName: '카라반 3호' } },

  // ─── 글램핑 ──────────────────────────────────────────────────
  { id: 'glamp_101', standard: '글램핑101호', naver: '글램핑 101호', yeogi: '글램핑101호', ddnayo: '글램핑101호(16시입실/2인관장)', wings: 'glamping 101', homepage: { roomName: '글램핑 101호' } },
  { id: 'glamp_102', standard: '글램핑102호', naver: '글램핑 102호', yeogi: '글램핑102호', ddnayo: '글램핑102호(16시입실/2인관장)', wings: 'glamping 102', homepage: { roomName: '글램핑 102호' } },
  { id: 'glamp_103', standard: '글램핑103호', naver: '글램핑 103호', yeogi: '글램핑103호', ddnayo: '글램핑103호(16시입실/2인관장)', wings: 'glamping 103', homepage: { roomName: '글램핑 103호' } },
  { id: 'glamp_104', standard: '글램핑104호', naver: '글램핑 104호', yeogi: '글램핑104호', ddnayo: '글램핑104호(16시입실/2인관장)', wings: 'glamping 104', homepage: { roomName: '글램핑 104호' } },
  { id: 'glamp_105', standard: '글램핑105호', naver: '글램핑 105호', yeogi: '글램핑105호', ddnayo: '글램핑105호(16시입실/2인관장)', wings: 'glamping 105', homepage: { roomName: '글램핑 105호' } },
  { id: 'glamp_106', standard: '글램핑106호', naver: '글램핑 106호', yeogi: '글램핑106호', ddnayo: '글램핑106호(16시입실/2인관장)', wings: 'glamping 106', homepage: { roomName: '글램핑 106호' } },
];

// 플랫폼 표시명으로 표준 객실 ID 찾기
function findRoomByPlatformName(platform, name) {
  const clean = (s) => s.replace(/\s/g, '').replace(/[()（）].*/g, '').toLowerCase();
  return ROOMS.find(r => r[platform] && clean(r[platform]) === clean(name));
}

// 표준 ID로 객실 정보 찾기
function findRoomById(id) {
  return ROOMS.find(r => r.id === id);
}

module.exports = { ROOMS, findRoomByPlatformName, findRoomById };
