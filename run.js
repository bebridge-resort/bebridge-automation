const { findRoom } = require('./rooms');
const naver   = require('./naver');
const yeogi   = require('./yeogi');
const ddnayo  = require('./ddnayo');
const wings   = require('./wings');
const home    = require('./homepage');
const { markDone, isDone, markCancelled, isCancelled, log, logErr } = require('./firebase');

// 채널별 이름 prefix
const PREFIX = { naver: '네', yeogi: '여', ddnayo: '떠', wings: '윙' };

// OTA 자동생성 예약인지 확인
function isAutoCreated(guestName) {
  return ['네/', '여/', '떠/', '윙/'].some(p => guestName.startsWith(p));
}

async function handleNew(res) {
  const { id, channel, guestName, phone, roomName, checkIn, checkOut } = res;
  if (await isDone(id)) return;

  console.log('\n🔔 신규예약: [' + channel + '] ' + roomName + ' ' + checkIn + '~' + (checkOut||'') + ' / ' + guestName);

  // 홈페이지 자동생성 예약이 재감지된 경우 → 확정만 하고 종료
  if (channel === 'homepage' && isAutoCreated(guestName)) {
    console.log('  [자동생성 예약] 확정 처리만 진행');
    await home.confirmBooking(guestName, checkIn).catch(() => {});
    await markDone(id, { channel, guestName, checkIn, note: '자동생성확정' });
    return;
  }

  const room = findRoom(channel, roomName);
  if (!room) {
    console.error('  ❌ 객실 매핑 실패: "' + roomName + '" (' + channel + ')');
    await logErr(id, new Error('객실 매핑 실패: ' + roomName));
    await markDone(id, { channel, guestName, roomName, checkIn, error: '객실매핑실패' });
    return;
  }

  const nights = Math.max(1, Math.round((new Date(checkOut || checkIn) - new Date(checkIn)) / 86400000));
  const r = {};

  // ── 방막기: 예약 들어온 채널 제외, 순차 실행 ──
  if (channel !== 'naver')  r.naver  = await naver.blockDates(room.naver,   checkIn, checkOut).catch(() => false);
  if (channel !== 'yeogi')  r.yeogi  = await yeogi.blockDates(room.yeogi,   checkIn, checkOut).catch(() => false);
  if (channel !== 'ddnayo') r.ddnayo = await ddnayo.blockDates(room.ddnayo, checkIn, checkOut).catch(() => false);
  r.wings = await wings.blockDates(room.wings, checkIn, checkOut).catch(() => false);

  // ── 홈페이지 처리 ──────────────────────────────
  if (channel === 'homepage') {
    // 고객 직접 예약 → 예약완료 확정만
    r.homeConfirm = await home.confirmBooking(guestName, checkIn).catch(() => false);
    console.log('  [홈페이지] 직접예약 확정');
  } else {
    // OTA 예약 → "채널/이름" 형식으로 홈페이지에 새 예약 생성
    const bookingName = PREFIX[channel] + '/' + guestName;  // 예: "여/홍길동"
    console.log('  [홈페이지] 예약 생성: ' + bookingName);

    r.homeCreate = await home.createBooking({
      guestName: bookingName,
      phone, roomName: room.home, checkIn, nights
    }).catch(() => false);

    if (r.homeCreate) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      r.homeConfirm = await home.confirmBooking(bookingName, checkIn).catch(() => false);
    }
  }

  await markDone(id, { channel, guestName, roomName, checkIn, checkOut, results: r });
  await log('예약완료', { id, channel, guestName, roomName, checkIn, checkOut, results: r });

  const allOk = Object.values(r).every(Boolean);
  console.log('  ' + (allOk ? '✅ 전체 완료' : '⚠️ 일부 실패'), r);
}

async function handleCancel(res) {
  const { id, channel, guestName, roomName, checkIn, checkOut } = res;
  if (await isCancelled(id)) return;

  console.log('\n🔔 취소처리: [' + channel + '] ' + roomName + ' ' + checkIn + ' / ' + guestName);

  const room = findRoom(channel, roomName);
  if (room) {
    if (channel !== 'naver')  await naver.unblockDates(room.naver,   checkIn, checkOut).catch(() => {});
    if (channel !== 'yeogi')  await yeogi.unblockDates(room.yeogi,   checkIn, checkOut).catch(() => {});
    if (channel !== 'ddnayo') await ddnayo.unblockDates(room.ddnayo, checkIn, checkOut).catch(() => {});
    await wings.unblockDates(room.wings, checkIn, checkOut).catch(() => {});
  }

  await markCancelled(id);
  await log('취소완료', { id, channel, guestName, roomName, checkIn, checkOut });
  console.log('  ✅ 취소 처리 완료');
}

module.exports = { handleNew, handleCancel };
