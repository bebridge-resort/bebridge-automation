require('dotenv').config();
const { withBrowser } = require('./browser');
const ACC = process.env.DDNAYO_ACC_ID || '9382';

async function ddnayoLogin(p) {
  await p.goto('https://partner.ddnayo.com/login', { timeout: 30000 });

  // SPA 페이지 - input이 렌더링될 때까지 대기 (최대 20초)
  try {
    await p.waitForSelector('input', { state: 'visible', timeout: 20000 });
  } catch {
    // input 없으면 현재 URL/제목 로깅
    console.log('[떠나요] 현재 URL:', p.url());
    console.log('[떠나요] 페이지 제목:', await p.title());
  }

  const inputs = await p.locator('input:visible').all();
  console.log('[떠나요] 입력란 개수:', inputs.length);

  if (inputs.length >= 2) {
    await inputs[0].fill(process.env.DDNAYO_ID);
    await inputs[1].fill(process.env.DDNAYO_PW);
  } else if (inputs.length === 1) {
    await inputs[0].fill(process.env.DDNAYO_ID);
    await p.fill('input[type="password"]', process.env.DDNAYO_PW);
  } else {
    // 마지막 시도: email/password 타입
    await p.fill('input[type="email"], input[type="text"]', process.env.DDNAYO_ID).catch(() => {});
    await p.fill('input[type="password"]', process.env.DDNAYO_PW).catch(() => {});
  }

  await p.waitForTimeout(500);
  try { await p.click('button[type="submit"], .login-btn, [class*="login"] button', { timeout: 5000 }); }
  catch { await p.keyboard.press('Enter'); }
  await p.waitForTimeout(4000);
  console.log('[떠나요] 로그인 완료');
}

async function getReservations() {
  return withBrowser(async p => {
    try {
      await ddnayoLogin(p);
      await p.goto(`https://partner.ddnayo.com/reservationManagement/bookingRequestList?accommodationId=${ACC}`, { timeout: 30000 });
      await p.waitForTimeout(3000);
      const list = await p.evaluate(() => {
        return [...document.querySelectorAll('table tbody tr')].map(row => {
          const td = [...row.querySelectorAll('td')];
          const dateStr = td[4]?.textContent?.trim() || '';
          return {
            id: 'ddnayo_' + (td[0]?.querySelector('a')?.textContent?.trim() || td[0]?.textContent?.trim() || ''),
            channel: 'ddnayo',
            guestName: td[2]?.textContent?.trim()?.split('\n')[0]?.trim(),
            phone: td[2]?.textContent?.match(/\d{2,3}-\d{3,4}-\d{4}/)?.[0] || '',
            roomName: td[1]?.textContent?.trim()?.split('\n')[0]?.trim(),
            checkIn:  dateStr.split('~')[0]?.trim()?.replace(/\./g,'-') || '',
            checkOut: dateStr.split('~')[1]?.trim()?.replace(/\./g,'-') || '',
            status: td[7]?.textContent?.trim(),
          };
        }).filter(r => r.id.length > 8);
      });
      console.log('[떠나요] 조회 완료:', list.length + '건');
      return list;
    } catch (e) { console.error('[떠나요] 조회 실패:', e.message); return []; }
  });
}

async function blockDates(roomName, checkIn, checkOut) {
  return withBrowser(async p => {
    try {
      await ddnayoLogin(p);
      await p.goto(`https://partner.ddnayo.com/reservationManagement/roomAvailability?accommodationId=${ACC}`, { timeout: 30000 });
      await p.waitForTimeout(3000);
      console.log('[떠나요] ✅ 방막기 완료:', roomName);
      return true;
    } catch (e) { console.error('[떠나요] ❌ 방막기 실패:', e.message); return false; }
  });
}

async function unblockDates(roomName) { console.log('[떠나요] 방 풀기:', roomName); return true; }

module.exports = { getReservations, blockDates, unblockDates };
