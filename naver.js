require('dotenv').config();
const { getPage, resetPage } = require('./browser');
const BIZ = process.env.NAVER_BIZ_ID || '248756';
const BASE = 'https://partner.booking.naver.com';
let ok = false;

async function login() {
  const p = await getPage('naver');
  try {
    await p.goto('https://nid.naver.com/nidlogin.login?svctype=262144');
    await p.waitForTimeout(1500);
    await p.fill('#id', process.env.NAVER_ID);
    await p.fill('#pw', process.env.NAVER_PW);
    await p.click('.btn_login');
    await p.waitForURL(/naver\.com/, { timeout: 15000 });
  } catch {}
  ok = true;
  console.log('[네이버] 로그인 완료');
}

async function getReservations() {
  if (!ok) await login();
  const p = await getPage('naver');
  try {
    const today = new Date().toISOString().slice(0,10);
    await p.goto(`${BASE}/bizes/${BIZ}/booking-list-view?bookingStatusCodes=RC03&dateFilter=REGDATE&startDateTime=${today}&endDateTime=${today}`);
    await p.waitForTimeout(3000);

    return await p.evaluate(() => {
      return [...document.querySelectorAll('table tbody tr')].map(row => {
        const td = [...row.querySelectorAll('td')];
        const period = td[4]?.textContent?.trim() || '';
        const dates  = period.match(/\d{2}\.\d{1,2}\.\d{1,2}/g) || [];
        const toISO  = s => s ? '20'+s.replace(/\./g,'-') : '';
        return {
          id: 'naver_' + (td[2]?.textContent?.trim() || Date.now()),
          channel: 'naver',
          guestName: td[1]?.textContent?.trim(),
          phone: td[3]?.textContent?.trim(),
          roomName: td[5]?.textContent?.trim()?.split('\n')[0]?.trim(),
          checkIn:  toISO(dates[0]),
          checkOut: toISO(dates[1]),
          status: td[0]?.textContent?.trim(),
        };
      }).filter(r => r.id.length > 6 && r.roomName);
    });
  } catch (e) {
    console.error('[네이버] 예약 조회 실패:', e.message);
    ok = false; await resetPage('naver');
    return [];
  }
}

// 방막기: 간단예약관리 캘린더에서 토글 OFF
async function blockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  const p = await getPage('naver');
  try {
    await p.goto(`${BASE}/bizes/${BIZ}/simple-management`);
    await p.waitForTimeout(3000);

    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);

    // 캘린더를 체크인 날짜 주로 이동
    for (let i = 0; i < 8; i++) {
      const hdr = await p.locator('.week-header, [class*="week"], [class*="date-range"]').first().textContent().catch(() => '');
      const mm = String(ciDate.getMonth()+1).padStart(2,'0');
      const dd = String(ciDate.getDate()).padStart(2,'0');
      if (hdr.includes(`${mm}`) && hdr.includes(`${dd}`)) break;
      await p.locator('button[class*="next"]').first().click().catch(() => {});
      await p.waitForTimeout(700);
    }

    // 객실명 행 찾아서 체크인~체크아웃 날짜 토글 OFF
    let cur = new Date(ciDate);
    while (cur < coDate) {
      const rows = await p.locator('tr').all();
      for (const row of rows) {
        const txt = await row.textContent().catch(() => '');
        if (!txt.replace(/\s/g,'').includes(roomName.replace(/\s/g,''))) continue;
        // 날짜에 해당하는 활성화(초록) 토글 클릭
        const toggles = await row.locator('button[aria-checked="true"], button[class*="active"]').all();
        if (toggles.length > 0) { await toggles[0].click(); await p.waitForTimeout(300); }
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }
    console.log(`[네이버] ✅ ${roomName} 방막기 완료`);
    return true;
  } catch (e) {
    console.error(`[네이버] ❌ 방막기 실패:`, e.message);
    return false;
  }
}

async function unblockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  console.log(`[네이버] ✅ ${roomName} 방 풀기 완료`);
  return true;
}

module.exports = { getReservations, blockDates, unblockDates };
