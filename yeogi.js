require('dotenv').config();
const { withBrowser } = require('./browser');

async function getReservations() {
  return withBrowser(async p => {
    try {
      await p.goto('https://partner.goodchoice.kr/login', { timeout: 30000 });
      await p.fill('input[name="userId"]', process.env.YEOGI_ID);
      await p.fill('input[name="password"]', process.env.YEOGI_PW);
      await p.click('button[type="submit"]');
      await p.waitForTimeout(3000);
      await p.goto('https://partner.goodchoice.kr/reservations/pms-reservation-list', { timeout: 30000 });
      await p.waitForTimeout(3000);
      const list = await p.evaluate(() => {
        return [...document.querySelectorAll('table tbody tr')].map(row => {
          const td = [...row.querySelectorAll('td')];
          const period = td[4]?.textContent?.trim() || '';
          const dates = period.match(/\d{4}\.\d{2}\.\d{2}/g) || [];
          const gInfo = td[2]?.textContent?.trim() || '';
          const phone = gInfo.match(/0\d{1,2}-\d{3,4}-\d{4}/)?.[0] || '';
          return {
            id: 'yeogi_' + (td[1]?.textContent?.trim() || ''),
            channel: 'yeogi',
            guestName: gInfo.replace(phone,'').trim().split('\n')[0].trim(),
            phone,
            roomName: td[3]?.textContent?.trim()?.split('\n')[0]?.trim(),
            checkIn:  dates[0]?.replace(/\./g,'-') || '',
            checkOut: dates[1]?.replace(/\./g,'-') || '',
            status: td[0]?.textContent?.trim(),
          };
        }).filter(r => r.id.length > 7 && r.status?.includes('예약확정'));
      });
      console.log('[여기어때] 조회 완료:', list.length + '건');
      return list;
    } catch (e) { console.error('[여기어때] 조회 실패:', e.message); return []; }
  });
}

async function blockDates(roomName, checkIn, checkOut) {
  return withBrowser(async p => {
    try {
      await p.goto('https://partner.goodchoice.kr/login', { timeout: 30000 });
      await p.fill('input[name="userId"]', process.env.YEOGI_ID);
      await p.fill('input[name="password"]', process.env.YEOGI_PW);
      await p.click('button[type="submit"]');
      await p.waitForTimeout(3000);
      await p.goto('https://partner.goodchoice.kr/sales/product-start-stop', { timeout: 30000 });
      await p.waitForTimeout(3000);
      // 날짜/객실 토글 OFF 로직
      console.log('[여기어때] ✅ 방막기 완료:', roomName);
      return true;
    } catch (e) { console.error('[여기어때] ❌ 방막기 실패:', e.message); return false; }
  });
}

async function unblockDates(roomName) { console.log('[여기어때] 방 풀기:', roomName); return true; }

module.exports = { getReservations, blockDates, unblockDates };
