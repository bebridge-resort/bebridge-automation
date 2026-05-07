const { findRoomByPlatformName, findRoomById } = require('../config/roomMapping');
const naver = require('../scrapers/naver');
const yeogi = require('../scrapers/yeogi');
const ddnayo = require('../scrapers/ddnayo');
const wings = require('../scrapers/wings');
const homepage = require('../scrapers/homepage');
const { logAction, logError, markReservationProcessed, markReservationCancelled } = require('../db/firebase');

// ─────────────────────────────────────────────────────────────
// 예약 처리 메인 함수
// reservation = {
//   id, channel, guestName, phone, roomName, checkIn, checkOut, nights
// }
// ─────────────────────────────────────────────────────────────
async function processNewReservation(reservation) {
  const { id, channel, guestName, phone, roomName, checkIn, checkOut, nights } = reservation;
  console.log(`\n🔔 신규 예약 처리 시작:`);
  console.log(`   채널: ${channel} | 객실: ${roomName} | 기간: ${checkIn}~${checkOut}`);
  console.log(`   예약자: ${guestName} | 전화: ${phone}`);

  try {
    // 표준 객실 찾기
    const room = findRoomByPlatformName(channel, roomName);
    if (!room) {
      console.error(`[자동화] ❌ 객실 매핑 실패: ${roomName} (${channel})`);
      await logError(id, new Error(`객실 매핑 실패: ${roomName}`));
      return;
    }

    const results = { blockNaver: false, blockYeogi: false, blockDdnayo: false, blockWings: false, homepage: false };

    // ── 방막기: 예약이 들어온 채널 제외하고 모두 막기 ──────────
    const tasks = [];

    if (channel !== 'naver') {
      tasks.push(
        naver.blockRoom(room.naver, checkIn, checkOut)
          .then(ok => { results.blockNaver = ok; })
      );
    }
    if (channel !== 'yeogi') {
      tasks.push(
        yeogi.blockRoom(room.yeogi, checkIn, checkOut)
          .then(ok => { results.blockYeogi = ok; })
      );
    }
    if (channel !== 'ddnayo') {
      tasks.push(
        ddnayo.blockRoom(room.ddnayo, checkIn, checkOut)
          .then(ok => { results.blockDdnayo = ok; })
      );
    }
    // 윙스는 항상 막기 (모든 채널에서 막아야 함)
    tasks.push(
      wings.blockRoom(room.wings, checkIn, checkOut)
        .then(ok => { results.blockWings = ok; })
    );

    // 모든 방막기 병렬 실행
    await Promise.allSettled(tasks);

    // ── 홈페이지 예약 생성 ──────────────────────────────────────
    const created = await homepage.createReservation({
      guestName,
      phone,
      roomName: room.homepage.roomName,
      checkIn,
      checkOut,
      nights: nights || calcNights(checkIn, checkOut),
    });
    results.homepage = created;

    // ── 관리자 패널에서 예약 완료 처리 ─────────────────────────
    if (created) {
      await new Promise(r => setTimeout(r, 3000)); // 예약 생성 후 잠시 대기
      await homepage.confirmReservation(guestName, checkIn);
    }

    // ── 결과 로깅 및 처리 완료 표시 ────────────────────────────
    await markReservationProcessed(id, { ...reservation, results });
    await logAction('예약처리완료', {
      id, channel, guestName, roomName, checkIn, checkOut, results
    });

    const allOk = Object.values(results).every(v => v);
    console.log(`\n${allOk ? '✅' : '⚠️'} 예약 처리 완료:`, results);

    if (!allOk) {
      // 일부 실패 시 알림 (관리자가 수동 확인 필요)
      console.log(`⚠️  일부 방막기 실패 - 수동 확인 필요`);
    }

  } catch (e) {
    console.error(`[자동화] ❌ 예약 처리 중 오류:`, e.message);
    await logError(id, e);
  }
}

// ─────────────────────────────────────────────────────────────
// 취소 처리 - 방막기 해제
// ─────────────────────────────────────────────────────────────
async function processCancellation(reservation) {
  const { id, channel, guestName, phone, roomName, checkIn, checkOut } = reservation;
  console.log(`\n🔔 취소 처리 시작: ${guestName} / ${roomName} / ${checkIn}~${checkOut}`);

  try {
    const room = findRoomByPlatformName(channel, roomName);
    if (!room) {
      console.error(`[자동화] ❌ 객실 매핑 실패: ${roomName}`);
      return;
    }

    // 방막기 해제 - 모든 채널에서 풀기
    await Promise.allSettled([
      channel !== 'naver'  ? naver.unblockRoom(room.naver, checkIn, checkOut)   : Promise.resolve(),
      channel !== 'yeogi'  ? yeogi.unblockRoom(room.yeogi, checkIn, checkOut)   : Promise.resolve(),
      channel !== 'ddnayo' ? ddnayo.unblockRoom(room.ddnayo, checkIn, checkOut) : Promise.resolve(),
      wings.unblockRoom(room.wings, checkIn, checkOut),
    ]);

    await markReservationCancelled(id);
    await logAction('취소처리완료', { id, channel, guestName, roomName, checkIn, checkOut });
    console.log(`✅ 취소 처리 완료 - 모든 채널 방 풀기 완료`);
  } catch (e) {
    console.error(`[자동화] ❌ 취소 처리 중 오류:`, e.message);
    await logError(id, e);
  }
}

function calcNights(checkIn, checkOut) {
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

module.exports = { processNewReservation, processCancellation };
