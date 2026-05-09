require('dotenv').config();
const cron   = require('node-cron');
const { handleNew, handleCancel } = require('./run');
const { isDone, isCancelled, log } = require('./firebase');
const naver  = require('./naver');
const yeogi  = require('./yeogi');
const ddnayo = require('./ddnayo');

const MINS = parseInt(process.env.POLL_MINUTES) || 5;

if (nR.status !== 'fulfilled') console.error('[네이버] 에러:', nR.reason?.message || nR.reason);
if (yR.status !== 'fulfilled') console.error('[여기어때] 에러:', yR.reason?.message || yR.reason);
if (dR.status !== 'fulfilled') console.error('[떠나요] 에러:', dR.reason?.message || dR.reason);
console.log(`  네이버:${nR.status==='fulfilled'?nR.value.length:'오류'} 여기어때:${yR.status==='fulfilled'?yR.value.length:'오류'} 떠나요:${dR.status==='fulfilled'?dR.value.length:'오류'}`);`
╔═══════════════════════════════════════════╗
║   비브릿지 예약 자동화  v1.0              ║
║   ${MINS}분마다 | 네이버·여기어때·떠나요     ║
╚═══════════════════════════════════════════╝
`);

async function poll() {
  const ts = new Date().toLocaleString('ko-KR');
  console.log(`[${ts}] 🔍 예약 확인 중...`);
  try {
    const [nR, yR, dR] = await Promise.allSettled([
      naver.getReservations(),
      yeogi.getReservations(),
      ddnayo.getReservations(),
    ]);
    const all = [
      ...(nR.status==='fulfilled' ? nR.value : []),
      ...(yR.status==='fulfilled' ? yR.value : []),
      ...(dR.status==='fulfilled' ? dR.value : []),
    ];
    console.log(`  네이버:${nR.status==='fulfilled'?nR.value.length:'오류'} 여기어때:${yR.status==='fulfilled'?yR.value.length:'오류'} 떠나요:${dR.status==='fulfilled'?dR.value.length:'오류'}`);

    for (const res of all) {
      if (!res.id || !res.checkIn) continue;
      const isCancel = ['취소','cancel','환불'].some(k => res.status?.includes(k));
      if (isCancel) { if (!await isCancelled(res.id)) await handleCancel(res); }
      else           { if (!await isDone(res.id))     await handleNew(res); }
    }
  } catch (e) {
    console.error('[폴링] 오류:', e.message);
  }
}

async function start() {
  await log('시스템시작', { v: '1.0', mins: MINS });
  await poll();
  cron.schedule(`*/${MINS} * * * *`, poll);
  console.log(`⏱  ${MINS}분마다 자동 실행 중...`);
}

start().catch(console.error);
