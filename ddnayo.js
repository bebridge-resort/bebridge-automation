require('dotenv').config();
const { getPage, resetPage } = require('./browser');
const ACC = process.env.DDNAYO_ACC_ID || '9382';
let ok = false;

async function login() {
  const p = await getPage('ddnayo');
  try {
    await p.goto('https://partner.ddnayo.com/login');
    await p.waitForTimeout(1500);
    await p.fill('input[placeholder*="아이디"], input[name="userId"]', process.env.DDNAYO_ID);
    await p.fill('input[type="password"]', process.env.DDNAYO_PW);
    await p.click('button[type="submit"]');
    await p.waitForTimeout(3000);
  } catch {}
  ok = true;
  console.log('[떠나요] 로그인 완료');
}

async function getReservations() {
  if (!ok) await login();
  const p = await getPage('ddnayo');
  try {
    await p.goto(`https://partner.ddnayo.com/reservationManagement/bookingRequestList?accommodationId=${ACC}`);
    await p.waitForTimeout(3000);
    return await p.evaluate(() => {
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
  } catch (e) {
    console.error('[떠나요] 예약 조회 실패:', e.message);
    ok = false; await resetPage('ddnayo');
    return [];
  }
}

async function blockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  const p = await getPage('ddnayo');
  try {
    await p.goto(`https://partner.ddnayo.com/reservationManagement/roomAvailability?accommodationId=${ACC}`);
    await p.waitForTimeout(3000);

    const ciD = new Date(checkIn);
    const coD = new Date(checkOut);
    let cur = new Date(ciD);

    while (cur < coD) {
      // 날짜 컬럼에서 해당 날짜 찾기
      const headers = await p.locator('th').all();
      let colIdx = -1;
      for (let i = 0; i < headers.length; i++) {
        const t = (await headers[i].textContent()).replace(/\s/g,'');
        if (t.endsWith(String(cur.getDate()) + '일') || t === String(cur.getDate())) {
          colIdx = i; break;
        }
      }
      if (colIdx >= 0) {
        const rows = await p.locator('tr').all();
        for (const row of rows) {
          const txt = await row.textContent().catch(() => '');
          if (!txt.replace(/\s/g,'').includes(roomName.replace(/\s/g,'').slice(0,4))) continue;
          const cells = await row.locator('td').all();
          if (colIdx <= cells.length) {
            const target = cells[Math.min(colIdx, cells.length-1)];
            await target.click().catch(() => {});
            await p.waitForTimeout(800);
            // 팝업 완료 버튼
            const btn = p.locator('.modal button:has-text("완료"), .popup button:has-text("마감"), [role="dialog"] button').first();
            if (await btn.count()) { await btn.click(); await p.waitForTimeout(400); }
          }
          break;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    console.log(`[떠나요] ✅ ${roomName} 방막기 완료`);
    return true;
  } catch (e) {
    console.error(`[떠나요] ❌ 방막기 실패:`, e.message);
    return false;
  }
}

async function unblockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  console.log(`[떠나요] ✅ ${roomName} 방 풀기 완료`);
  return true;
}

module.exports = { getReservations, blockDates, unblockDates };
