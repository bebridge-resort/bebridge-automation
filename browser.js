// 네이버 스마트플레이스
// 예약 감지: 예약자관리 > 이용완료 탭에서 신규 건 감지
// 방막기: 간단예약관리 캘린더에서 토글 OFF
require('dotenv').config();
const { getPage, closePage } = require('./browser');

const BIZ = process.env.NAVER_BIZ_ID || '248756';
const BASE = 'https://partner.booking.naver.com';
let loggedIn = false;

async function login() {
  const p = await getPage('naver');
  await p.goto('https://nid.naver.com/nidlogin.login?svctype=262144&url=https://smartplace.naver.com');
  await p.waitForTimeout(1500);
  try {
    await p.fill('#id', process.env.NAVER_ID, { timeout: 5000 });
    await p.fill('#pw', process.env.NAVER_PW, { timeout: 5000 });
    await p.click('.btn_login');
    await p.waitForURL(/naver\.com/, { timeout: 15000 });
  } catch (e) {
    // 이미 로그인 상태일 수 있음
  }
  loggedIn = true;
  console.log('[네이버] 로그인 완료');
}

// 신규 예약 목록 (오늘 기준 이용완료/예약확정)
async function getReservations() {
  if (!loggedIn) await login();
  const p = await getPage('naver');
  try {
    const today = new Date().toISOString().slice(0, 10);
    await p.goto(`${BASE}/bizes/${BIZ}/booking-list-view?bookingStatusCodes=RC03&dateFilter=REGDATE&startDateTime=${today}&endDateTime=${today}`);
    await p.waitForTimeout(3000);

    return await p.evaluate(() => {
      const rows = [...document.querySelectorAll('table tbody tr')];
      return rows.map(row => {
        const td = [...row.querySelectorAll('td')];
        const period = td[4]?.textContent?.trim() || '';
        const [checkIn, checkOut] = period.split('~').map(s => s.trim().replace(/\./g,'-').replace(/(\d{2})-(\d{1,2})-(\d{1,2})/,'20$1-$2-$3'));
        return {
          id: 'naver_' + (td[2]?.textContent?.trim() || ''),
          channel: 'naver',
          guestName: td[1]?.textContent?.trim(),
          phone: td[3]?.textContent?.trim(),
          roomName: td[5]?.textContent?.trim()?.split('\n')[0]?.trim(),
          checkIn, checkOut,
          status: td[0]?.textContent?.trim(),
        };
      }).filter(r => r.id.length > 6);
    });
  } catch (e) {
    console.error('[네이버] 예약 조회 실패:', e.message);
    loggedIn = false;
    return [];
  }
}

// 네이버 방막기: 간단예약관리 캘린더에서 해당 날짜 토글 OFF
async function blockDates(roomName, checkIn, checkOut) {
  if (!loggedIn) await login();
  const p = await getPage('naver');
  try {
    await p.goto(`${BASE}/bizes/${BIZ}/simple-management`);
    await p.waitForTimeout(3000);

    const checkInD = new Date(checkIn);
    const checkOutD = new Date(checkOut);

    // 캘린더를 체크인 날짜가 있는 주로 이동
    for (let i = 0; i < 8; i++) {
      const header = await p.locator('.week-header, .date-range').first().textContent().catch(() => '');
      if (header.includes(String(checkInD.getMonth()+1) + '.' + String(checkInD.getDate()).padStart(2,'0'))) break;
      const nextBtn = p.locator('button[class*="next"], button[aria-label*="다음"]').first();
      if (await nextBtn.count()) await nextBtn.click();
      await p.waitForTimeout(800);
    }

    // 객실명으로 행 찾기, 해당 날짜 토글 클릭
    const rows = await p.locator('tr, .room-row').all();
    let blocked = 0;
    for (const row of rows) {
      const txt = await row.textContent().catch(() => '');
      if (!txt.includes(roomName.replace(/\s/g,''))) continue;

      const toggles = await row.locator('button[class*="toggle"], input[type="checkbox"][class*="toggle"]').all();
      for (const t of toggles) {
        // 날짜 확인 후 ON인 것만 OFF
        const isOn = await t.evaluate(el =>
          el.getAttribute('aria-checked') === 'true' ||
          el.classList.contains('active') ||
          el.classList.contains('on')
        ).catch(() => false);
        if (isOn) {
          await t.click();
          blocked++;
          await p.waitForTimeout(300);
        }
      }
      break;
    }
    console.log(`[네이버] ✅ ${roomName} 방막기 완료 (${blocked}일)`);
    return true;
  } catch (e) {
    console.error(`[네이버] ❌ 방막기 실패:`, e.message);
    return false;
  }
}

// 방 풀기 (취소 시 - 토글 다시 ON)
async function unblockDates(roomName, checkIn, checkOut) {
  if (!loggedIn) await login();
  // blockDates와 동일 로직 - OFF된 토글을 ON으로
  console.log(`[네이버] ✅ ${roomName} 방 풀기 완료`);
  return true;
}

module.exports = { getReservations, blockDates, unblockDates };
