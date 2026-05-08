const { findRoom } = require('./rooms');
const naver   = require('./naver');
const yeogi   = require('./yeogi');
const ddnayo  = require('./ddnayo');
const wings   = require('./wings');
const home    = require('./homepage');
const { markDone, isDone, markCancelled, isCancelled, log, logErr } = require('./firebase');

async function handleNew(res) {
  const { id, channel, guestName, phone, roomName, checkIn, checkOut } = res;
  if (await isDone(id)) return;

  console.log(`\n🔔 신규예약: [${channel}] ${roomName} ${checkIn}~${checkOut} / ${guestName}`);

  const room = findRoom(channel, roomName);
  if (!room) {
    console.error(`  ❌ 객실 매핑 실패: "${roomName}" (${channel})`);
    await logErr(id, new Error(`객실 매핑 실패: ${roomName}`));
    return;
  }

  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  const r = {};

  // 방막기 병렬 실행 (예약 들어온 채널 제외)
  await Promise.allSettled([
    channel !== 'naver'  ? naver.blockDates(room.naver,   checkIn, checkOut).then(v => r.naver   = v) : null,
    channel !== 'yeogi'  ? yeogi.blockDates(room.yeogi,   checkIn, checkOut).then(v => r.yeogi   = v) : null,
    channel !== 'ddnayo' ? ddnayo.blockDates(room.ddnayo, checkIn, checkOut).then(v => r.ddnayo  = v) : null,
    wings.blockDates(room.wings, checkIn, checkOut).then(v => r.wings = v),
  ].filter(Boolean));

  // 홈페이지 예약 생성
  r.homeCreate = await home.createBooking({ guestName, phone, roomName: room.home, checkIn, nights });

  // 관리자 예약완료 처리
  if (r.homeCreate) {
    await new Promise(resolve => setTimeout(resolve, 4000));
    r.homeConfirm = await home.confirmBooking(guestName, checkIn);
  }

  await markDone(id, { channel, guestName, roomName, checkIn, checkOut, results: r });
  await log('예약완료', { id, channel, guestName, roomName, checkIn, checkOut, results: r });

  const allOk = Object.values(r).every(Boolean);
  console.log(`  ${allOk ? '✅ 전체 완료' : '⚠️ 일부 실패 - Firebase 로그 확인'}`, r);
}

async function handleCancel(res) {
  const { id, channel, guestName, roomName, checkIn, checkOut } = res;
  if (await isCancelled(id)) return;

  console.log(`\n🔔 취소처리: [${channel}] ${roomName} ${checkIn}~${checkOut} / ${guestName}`);

  const room = findRoom(channel, roomName);
  if (!room) return;

  await Promise.allSettled([
    channel !== 'naver'  ? naver.unblockDates(room.naver,   checkIn, checkOut) : null,
    channel !== 'yeogi'  ? yeogi.unblockDates(room.yeogi,   checkIn, checkOut) : null,
    channel !== 'ddnayo' ? ddnayo.unblockDates(room.ddnayo, checkIn, checkOut) : null,
    wings.unblockDates(room.wings, checkIn, checkOut),
  ].filter(Boolean));

  await markCancelled(id);
  await log('취소완료', { id, channel, guestName, roomName, checkIn, checkOut });
  console.log(`  ✅ 취소 처리 완료`);
}

module.exports = { handleNew, handleCancel };
