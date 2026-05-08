require('dotenv').config();
const { getPage, resetPage } = require('./browser');
let ok = false;

async function login() {
  const p = await getPage('yeogi');
  try {
    await p.goto('https://partner.goodchoice.kr/login');
    await p.waitForTimeout(1500);
    await p.fill('input[name="userId"]', process.env.YEOGI_ID);
    await p.fill('input[name="password"]', process.env.YEOGI_PW);
    await p.click('button[type="submit"]');
    await p.waitForURL(/goodchoice\.kr/, { timeout: 15000 });
  } catch {}
  ok = true;
  console.log('[여기어때] 로그인 완료');
}

async function getReservations() {
  if (!ok) await login();
  const p = await getPage('yeogi');
  try {
    await p.goto('https://partner.goodchoice.kr/reservations/pms-reservation-list');
    await p.waitForTimeout(3000);
    return await p.evaluate(() => {
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
  } catch (e) {
    console.error('[여기어때] 예약 조회 실패:', e.message);
    ok = false; await resetPage('yeogi');
    return [];
  }
}

async function blockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  const p = await getPage('yeogi');
  try {
    await p.goto('https://partner.goodchoice.kr/sales/product-start-stop');
    await p.waitForTimeout(3000);

    const ciD = new Date(checkIn);
    const coD = new Date(checkOut);

    // 해당 월로 달력 이동
    for (let i = 0; i < 6; i++) {
      const hdr = await p.locator('[class*="month"], [class*="header"]').first().textContent().catch(() => '');
      if (hdr.includes(`${ciD.getFullYear()}`) && hdr.includes(`${ciD.getMonth()+1}월`)) break;
      await p.locator('button[class*="next"]').first().click().catch(() => {});
      await p.waitForTimeout(600);
    }

    let cur = new Date(ciD);
    while (cur < coD) {
      // 해당 날짜·객실 토글 OFF
      const allRows = await p.locator('tr').all();
      for (const row of allRows) {
        const txt = await row.textContent().catch(() => '');
        if (!txt.replace(/\s/g,'').includes(roomName.replace(/\s/g,'').slice(0,4))) continue;
        const cells = await row.locator('td').all();
        for (const cell of cells) {
          const cellTxt = await cell.textContent().catch(() => '');
          if (!cellTxt.includes(String(cur.getDate()))) continue;
          const toggle = cell.locator('button, [role="switch"]').first();
          if (await toggle.count()) {
            const isOn = await toggle.evaluate(el => el.getAttribute('aria-checked')==='true' || el.className.includes('on')).catch(() => false);
            if (isOn) { await toggle.click(); await p.waitForTimeout(300); }
          }
          break;
        }
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }
    console.log(`[여기어때] ✅ ${roomName} 방막기 완료 (${checkIn}~${checkOut})`);
    return true;
  } catch (e) {
    console.error(`[여기어때] ❌ 방막기 실패:`, e.message);
    return false;
  }
}

async function unblockDates(roomName, checkIn, checkOut) {
  if (!ok) await login();
  console.log(`[여기어때] ✅ ${roomName} 방 풀기 완료`);
  return true;
}

module.exports = { getReservations, blockDates, unblockDates };
