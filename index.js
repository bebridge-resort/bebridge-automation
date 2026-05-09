require('dotenv').config();
const cron   = require('node-cron');
const { handleNew, handleCancel } = require('./run');
const { isDone, isCancelled, log } = require('./firebase');
const naver   = require('./naver');
const yeogi   = require('./yeogi');
const ddnayo  = require('./ddnayo');
const wings   = require('./wings');
const homepage = require('./homepage');

const MINS = parseInt(process.env.POLL_MINUTES) || 3;

console.log('비브릿지 예약 자동화 v1.1 - ' + MINS + '분마다 실행');
console.log('채널: 네이버 여기어때 떠나요 윙스 홈페이지');

async function poll() {
  const ts = new Date().toLocaleString('ko-KR');
  console.log('[' + ts + '] 예약 확인 중...');
  try {
    const [nR, yR, dR, wR, hR] = await Promise.allSettled([
      naver.getReservations(),
      yeogi.getReservations(),
      ddnayo.getReservations(),
      wings.getReservations(),
      homepage.getPendingBookings(),
    ]);

    if (nR.status !== 'fulfilled') console.error('[네이버] 에러:', nR.reason?.message || String(nR.reason));
    if (yR.status !== 'fulfilled') console.error('[여기어때] 에러:', yR.reason?.message || String(yR.reason));
    if (dR.status !== 'fulfilled') console.error('[떠나요] 에러:', dR.reason?.message || String(dR.reason));
    if (wR.status !== 'fulfilled') console.error('[윙스] 에러:', wR.reason?.message || String(wR.reason));
    if (hR.status !== 'fulfilled') console.error('[홈페이지] 에러:', hR.reason?.message || String(hR.reason));

    const all = [
      ...(nR.status === 'fulfilled' ? nR.value : []),
      ...(yR.status === 'fulfilled' ? yR.value : []),
      ...(dR.status === 'fulfilled' ? dR.value : []),
      ...(wR.status === 'fulfilled' ? wR.value : []),
      ...(hR.status === 'fulfilled' ? hR.value : []),
    ];

    console.log(
      '  네이버:' + (nR.status==='fulfilled' ? nR.value.length : '오류') +
      ' 여기어때:' + (yR.status==='fulfilled' ? yR.value.length : '오류') +
      ' 떠나요:' + (dR.status==='fulfilled' ? dR.value.length : '오류') +
      ' 윙스:' + (wR.status==='fulfilled' ? wR.value.length : '오류') +
      ' 홈페이지:' + (hR.status==='fulfilled' ? hR.value.length : '오류')
    );

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
  await log('시작', { v: '1.1', mins: MINS });
  await poll();
  cron.schedule('*/' + MINS + ' * * * *', poll);
  console.log(MINS + '분마다 자동 실행 중...');
}

start().catch(console.error);
