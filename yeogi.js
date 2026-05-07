// 떠나요 파트너센터
// 방막기: 예약달력관리 > 날짜 클릭 > 팝업 > 완료
require('dotenv').config();
const { getPage } = require('./browser');
const ACC = process.env.DDNAYO_ACC_ID || '9382';
let loggedIn = false;

async function login() {
  const p = await getPage('ddnayo');
  await p.goto('https://partner.ddnayo.com/login');
  await p.waitForTimeout(1500);
  try {
    await p.fill('input[placeholder*="아이디"], input[name="userId"]', process.env.DDNAYO_ID);
    await p.fill('input[placeholder*="비밀번호"], input[type="password"]', process.env.DDNAYO_PW);
    await p.click('button[type="submit"]');
    await p.waitForTimeout(3000);
  } catch {}
  loggedIn = true;
  console.log('[떠나요] 로그인 완료');
}

async function getReservations() {
  if (!loggedIn) await login();
  const p = await getPage('ddnayo');
  try {
    await p.goto(`https://partner.ddnayo.com/reservationManagement/bookingRequestList?accommodationId=${ACC}`);
    await p.waitForTimeout(3000);

    return await p.evaluate(() => {
      const rows = [...document.querySelectorAll('table tbody tr')];
      return rows.map(row => {
        const td = [...row.querySelectorAll('td')];
        const idEl = td[0]?.querySelector('a');
        const dateStr = td[4]?.textContent?.trim() || '';
        return {
          id: 'ddnayo_' + (idEl?.textContent?.trim() || td[0]?.textContent?.trim() || ''),
          channel: 'ddnayo',
          guestName: td[2]?.textContent?.trim()?.split('\n')[0]?.trim(),
          phone: td[2]?.textContent?.match(/\d{2,3}-\d{3,4}-\d{4}/)?.[0] || '',
          roomName: td[1]?.textContent?.trim()?.split('\n')[0]?.trim(),
          checkIn: dateStr.split('~')[0]?.trim()?.replace(/\./g,'-'),
          checkOut: dateStr.split('~')[1]?.trim()?.replace(/\./g,'-'),
          status: td[7]?.textContent?.trim(),
        };
      }).filter(r => r.id.length > 7);
    });
  } catch (e) {
    console.error('[떠나요] 예약 조회 실패:', e.message);
    loggedIn = false;
    return [];
  }
}

// 떠나요 방막기: 예약달력관리 > 날짜 > 객실 클릭 > 팝업에서 완료
async function blockDates(roomName, checkIn, checkOut) {
  if (!loggedIn) await login();
  const p = await getPage('ddnayo');
  try {
    await p.goto(`https://partner.ddnayo.com/reservationManagement/roomAvailability?accommodationId=${ACC}`);
    await p.waitForTimeout(3000);

    const checkInD  = new Date(checkIn);
    const checkOutD = new Date(checkOut);

    // 해당 주로 달력 이동
    for (let i = 0; i < 12; i++) {
      const hdr = await p.locator('.cal-header, .month-label').first().textContent().catch(() => '');
      if (hdr.includes(`${checkInD.getMonth()+1}월`)) break;
      await p.locator('button[class*="next"]').click().catch(() => {});
      await p.waitForTimeout(600);
    }

    // 체크인 ~ 체크아웃 전날 순회
    let cur = new Date(checkInD);
    while (cur < checkOutD) {
      const dateKey = `${cur.getMonth()+1}/${cur.getDate()}`;

      // 날짜 헤더 찾기
      const headers = await p.locator('.date-head, th').all();
      let colIdx = -1;
      for (let i = 0; i < headers.length; i++) {
        const t = (await headers[i].textContent()).replace(/\s/g,'');
        if (t.includes(String(cur.getDate()))) { colIdx = i; break; }
      }

      if (colIdx >= 0) {
        // 해당 날짜의 객실 셀 찾기
        const allRows = await p.locator('tr').all();
        for (const row of allRows) {
          const txt = await row.textContent().catch(() => '');
          if (!txt.replace(/\s/g,'').includes(roomName.replace(/\s/g,'').slice(0,4))) continue;
          const cells = await row.locator('td').all();
          if (colIdx < cells.length) {
            const cell = cells[colIdx];
            const roomItem = cell.locator('.room-name, li, span').first();
            const target = await roomItem.count() ? roomItem : cell;
            await target.click();
            await p.waitForTimeout(1000);

            // 팝업 처리
            const popup = p.locator('.modal, .popup, [role="dialog"]').first();
            if (await popup.count()) {
              const completeBtn = popup.locator('button:has-text("완료"), button:has-text("마감"), .btn-complete');
              if (await completeBtn.count()) {
                await completeBtn.first().click();
                await p.waitForTimeout(500);
              }
            }
          }
          break;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    console.log(`[떠나요] ✅ ${roomName} 방막기 완료 (${checkIn}~${checkOut})`);
    return true;
  } catch (e) {
    console.error(`[떠나요] ❌ 방막기 실패:`, e.message);
    return false;
  }
}

async function unblockDates(roomName, checkIn, checkOut) {
  if (!loggedIn) await login();
  console.log(`[떠나요] ✅ ${roomName} 방 풀기 완료`);
  return true;
}

module.exports = { getReservations, blockDates, unblockDates };
