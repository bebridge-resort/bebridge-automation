const ROOMS = [
  {id:'villa1', naver:'그랜드풀빌라 1동', yeogi:'그랜드풀빌라1동', ddnayo:'그랜드 풀빌라 1동', wings:'grand poolvilla 1', home:'그랜드 풀빌라 1동'},
  {id:'villa2', naver:'그랜드풀빌라 2동', yeogi:'그랜드풀빌라2동', ddnayo:'그랜드 풀빌라 2동', wings:'grand poolvilla 2', home:'그랜드 풀빌라 2동'},
  {id:'villa3', naver:'그랜드풀빌라 3동', yeogi:'그랜드풀빌라3동', ddnayo:'그랜드 풀빌라 3동', wings:'grand poolvilla 3', home:'그랜드 풀빌라 3동'},
  {id:'villa4', naver:'그랜드풀빌라 4동', yeogi:'그랜드풀빌라4동', ddnayo:'그랜드 풀빌라 4동', wings:'grand poolvilla 4', home:'그랜드 풀빌라 4동'},
  {id:'villa5', naver:'그랜드풀빌라 5동', yeogi:'그랜드풀빌라5동', ddnayo:'그랜드 풀빌라 5동', wings:'grand poolvilla 5', home:'그랜드 풀빌라 5동'},
  {id:'villa6', naver:'그랜드풀빌라 6동', yeogi:'그랜드풀빌라6동', ddnayo:'그랜드 풀빌라 6동', wings:'grand poolvilla 6', home:'그랜드 풀빌라 6동'},
  {id:'villa7', naver:'그랜드풀빌라 7동', yeogi:'그랜드풀빌라7동', ddnayo:'그랜드 풀빌라 7동', wings:'grand poolvilla 7', home:'그랜드 풀빌라 7동'},
  {id:'moon101', naver:'풀문101', yeogi:'풀문스테이101호', ddnayo:'풀문101호', wings:'pool moon 101', home:'풀문스테이 101호'},
  {id:'moon102', naver:'풀문102', yeogi:'풀문스테이102호', ddnayo:'풀문102호', wings:'pool moon 102', home:'풀문스테이 102호'},
  {id:'moon103', naver:'풀문103', yeogi:'풀문스테이103호', ddnayo:'풀문103호', wings:'pool moon 103', home:'풀문스테이 103호'},
  {id:'moon201', naver:'풀문201', yeogi:'풀문스테이201호', ddnayo:'풀문201호', wings:'pool moon 201', home:'풀문스테이 201호'},
  {id:'moon202', naver:'풀문202', yeogi:'풀문스테이202호', ddnayo:'풀문202호', wings:'pool moon 202', home:'풀문스테이 202호'},
  {id:'moon203', naver:'풀문203', yeogi:'풀문스테이203호', ddnayo:'풀문203호', wings:'pool moon 203', home:'풀문스테이 203호'},
  {id:'moon204', naver:'풀문204', yeogi:'풀문스테이204호', ddnayo:'풀문204호', wings:'pool moon 204', home:'풀문스테이 204호'},
  {id:'cara1', naver:'카라반 1호', yeogi:'카라반1호', ddnayo:'카라반 1호', wings:'caravan 1', home:'카라반 1호'},
  {id:'cara2', naver:'카라반 2호', yeogi:'카라반2호', ddnayo:'카라반 2호', wings:'caravan 2', home:'카라반 2호'},
  {id:'cara3', naver:'카라반 3호', yeogi:'카라반3호', ddnayo:'카라반 3호', wings:'caravan 3', home:'카라반 3호'},
  {id:'glamp101', naver:'글램핑 101호', yeogi:'글램핑101호', ddnayo:'글램핑101호', wings:'glamping 101', home:'글램핑 101호'},
  {id:'glamp102', naver:'글램핑 102호', yeogi:'글램핑102호', ddnayo:'글램핑102호', wings:'glamping 102', home:'글램핑 102호'},
  {id:'glamp103', naver:'글램핑 103호', yeogi:'글램핑103호', ddnayo:'글램핑103호', wings:'glamping 103', home:'글램핑 103호'},
  {id:'glamp104', naver:'글램핑 104호', yeogi:'글램핑104호', ddnayo:'글램핑104호', wings:'glamping 104', home:'글램핑 104호'},
  {id:'glamp105', naver:'글램핑 105호', yeogi:'글램핑105호', ddnayo:'글램핑105호', wings:'glamping 105', home:'글램핑 105호'},
  {id:'glamp106', naver:'글램핑 106호', yeogi:'글램핑106호', ddnayo:'글램핑106호', wings:'glamping 106', home:'글램핑 106호'},
];

function findRoom(platform, name) {
  const n = s => s.replace(/[\s\(\)（）\[\]].*/g,'').toLowerCase();
  return ROOMS.find(r => r[platform] && n(r[platform]) === n(name));
}

module.exports = { ROOMS, findRoom };
