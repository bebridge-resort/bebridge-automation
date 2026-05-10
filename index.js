require('dotenv').config();
const cron = require('node-cron');
const { handleNew, handleCancel } = require('./run');
const { isDone, isCancelled, log } = require('./firebase');
const naver   = require('./naver');
const yeogi   = require('./yeogi');
const ddnayo  = require('./ddnayo');
const homepage = require('./homepage');

const MINS = parseInt(process.env.POLL_MINUTES) || 3;

console.log('비브릿지 예약 자동화 v1.2 - ' + MINS + '분마다 실행 (순차실행)');

async function safe(label, fn) {
  try {
    const result = await fn();
    console.log('  [' + label + '] ' + (result ? result.length : 0) + '건');
    return result || [];
  } catch (e) {
    console.error('  [' + label + '] 오류: ' + e.message);
    return [];
  }
}

async function poll() {
  const ts = new Date().toLocaleString('ko-KR');
  console.log('[' + ts + '] 예약 확인 중...');

  // 브라우저 하나씩 순차 실행 (동시 실행 금지)
  const nRes = await safe('네이버',   () => naver.getReservations());
  const yRes = await safe('여기어때', () => yeogi.getReservations());
  const dRes = await safe('떠나요',   () => ddnayo.getReservations());
  const hRes = await safe('홈페이지', () => homepage.getPendingBookings());
  // 윙스는 IP 차단 이슈로 임시 제외

  const all = [...nRes, ...yRes, ...dRes, ...hRes];

  for (const res of all) {
    if (!res.id || !res.checkIn) continue;
    const isCancel = ['취소','cancel','환불'].some(k => res.status?.includes(k));
    if (isCancel) { if (!await isCancelled(res.id)) await handleCancel(res); }
    else           { if (!await isDone(res.id))     await handleNew(res); }
  }
}

async function start() {
  await log('시작', { v: '1.2', mins: MINS });
  await poll();
  cron.schedule('*/' + MINS + ' * * * *', poll);
  console.log(MINS + '분마다 자동 실행 중...');
}

start().catch(console.error);
