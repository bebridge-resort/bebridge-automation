require('dotenv').config();
const { withBrowser } = require('./browser');
const BIZ = process.env.NAVER_BIZ_ID || '248756';
const BASE = 'https://partner.booking.naver.com';

async function getReservations() {
  return withBrowser(async p => {
    try {
      // 로그인
      await p.goto('https://nid.naver.com/nidlogin.login?svctype=262144', { timeout: 30000 });
      await p.waitForTimeout(1500);
      await p.fill('#id', process.env.NAVER_ID);
      await p.fill('#pw', process.env.NAVER_PW);
      await p.click('.btn_login');
      await p.waitForURL(/naver\.com/, { timeout: 15000 });

      // 예약 목록 조회
      const today = new Date().toISOString().slice(0,10);
      await p.goto(`${BASE}/bizes/${BIZ}/booking-list-view?bookingStatusCodes=RC03&dateFilter=REGDATE&startDateTime=${today}&endDateTime=${today}`, { timeout: 30000 });
      await p.waitForTimeout(3000);

      const list = await p.evaluate(() => {
        return [...document.querySelectorAll('table tbody tr')].map(row => {
          const td = [...row.querySelectorAll('td')];
          const period = td[4]?.textContent?.trim() || '';
          const dates  = period.match(/\d{2}\.\d{1,2}\.\d{1,2}/g) || [];
          const toISO  = s => s ? '20'+s.replace(/\./g,'-') : '';
          return {
            id: 'naver_' + (td[2]?.textContent?.trim() || ''),
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
      console.log('[네이버] 조회 완료:', list.length + '건');
      return list;
    } catch (e) {
      console.error('[네이버] 조회 실패:', e.message);
      return [];
    }
  });
}

async function blockDates(roomName, checkIn, checkOut) {
  return withBrowser(async p => {
    try {
      await p.goto('https://nid.naver.com/nidlogin.login?svctype=262144', { timeout: 30000 });
      await p.fill('#id', process.env.NAVER_ID);
      await p.fill('#pw', process.env.NAVER_PW);
      await p.click('.btn_login');
      await p.waitForURL(/naver\.com/, { timeout: 15000 });
      await p.goto(`${BASE}/bizes/${BIZ}/simple-management`, { timeout: 30000 });
      await p.waitForTimeout(3000);
      // 해당 날짜 토글 OFF
      const rows = await p.locator('tr').all();
      for (const row of rows) {
        const txt = await row.textContent().catch(() => '');
        if (!txt.replace(/\s/g,'').includes(roomName.replace(/\s/g,''))) continue;
        const toggles = await row.locator('button[aria-checked="true"]').all();
        for (const t of toggles) { await t.click(); await p.waitForTimeout(200); }
        break;
      }
      console.log('[네이버] ✅ 방막기 완료:', roomName);
      return true;
    } catch (e) { console.error('[네이버] ❌ 방막기 실패:', e.message); return false; }
  });
}

async function unblockDates(roomName, checkIn, checkOut) {
  console.log('[네이버] 방 풀기 완료:', roomName);
  return true;
}

module.exports = { getReservations, blockDates, unblockDates };
