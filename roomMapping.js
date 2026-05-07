const { findRoom } = require('../config/rooms');
const naver   = require('../scrapers/naver');
const yeogi   = require('../scrapers/yeogi');
const ddnayo  = require('../scrapers/ddnayo');
const wings   = require('../scrapers/wings');
const home    = require('../scrapers/homepage');
const { markDone, isDone, markCancelled, isCancelled, log, logErr } = require('../db/firebase');

// ─────────────────────────────────────────────────────────────
// 신규 예약 처리
// ─────────────────────────────────────────────────────────────
async function handleNew(res) {
  const { id, channel, guestName, phone, roomName, checkIn, checkOut } = res;

  if (await isDone(id)) return;  // 이미 처리됨

  console.log(`\n🔔 신규예약 처리: [${channel}] ${roomName} ${checkIn}~${checkOut} / ${guestName}`);

  const room = findRoom(channel, roomName);
  if (!room) {
    console.error(`  ❌ 객실 매핑 실패: "${roomName}" (${channel})`);
    await logErr(id, new Error(`객실 매핑 실패: ${roomName}`));
    return;
  }

  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  const results = {};

  // ── 방막기 (예약 들어온 채널 제외, 병렬 실행) ──────────────
  const tasks = [];
  if (channel !== 'naver')  tasks.push(naver.blockDates(room.naver,   checkIn, checkOut).then(v => results.naver   = v));
  if (channel !== 'yeogi')  tasks.push(yeogi.blockDates(room.yeogi,   checkIn, checkOut).then(v => results.yeogi   = v));
  if (channel !== 'ddnayo') tasks.push(ddnayo.blockDates(room.ddnayo, checkIn, checkOut).then(v => results.ddnayo  = v));
  tasks.push(wings.blockDates(room.wings, checkIn, checkOut).then(v => results.wings = v));

  await Promise.allSettled(tasks);

  // ── 홈페이지 예약 생성 ──────────────────────────────────────
  const created = await home.createBooking({ guestName, phone, roomName: room.home, checkIn, nights });
  results.homeCreate = created;

  // ── 관리자 예약완료 처리 ────────────────────────────────────
  if (created) {
    await new Promise(r => setTimeout(r, 4000));
    results.homeConfirm = await home.confirmBooking(guestName, checkIn);
  }

  // ── 완료 기록 ──────────────────────────────────────────────
  await markDone(id, { channel, guestName, roomName, checkIn, checkOut, results });
  await log('예약완료', { id, channel, guestName, roomName, checkIn, checkOut, results });

  const allOk = Object.values(results).every(Boolean);
  console.log(`  ${allOk ? '✅ 전체 처리 완료' : '⚠️  일부 실패 - Firebase 로그 확인'}`, results);
}

// ─────────────────────────────────────────────────────────────
// 취소 처리
// ─────────────────────────────────────────────────────────────
async function handleCancel(res) {
  const { id, channel, guestName, roomName, checkIn, checkOut } = res;

  if (await isCancelled(id)) return;

  console.log(`\n🔔 취소 처리: [${channel}] ${roomName} ${checkIn}~${checkOut} / ${guestName}`);

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
  console.log(`  ✅ 취소 처리 완료 - 모든 채널 방 풀기 완료`);
}

module.exports = { handleNew, handleCancel };
